import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ClubRecord {
  id: string;
  name: string;
  website: string | null;
  instagram: string | null;
}

interface ScrapedEvent {
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  location?: string;
  luma_url?: string;
}

const normalizeExternalUrl = (value: string): string | null => {
  let v = value.trim();
  if (!v) return null;
  v = v.replace(/\/(auth|rest|functions)\/v1.*$/i, '');
  v = v.replace(/\/+$/, '');
  if (!v.startsWith('http://') && !v.startsWith('https://')) {
    if (v.includes('.') || v.includes('supabase.co')) {
      v = `https://${v}`;
    } else {
      v = `https://${v}.supabase.co`;
    }
  }
  try { new URL(v); return v; } catch { return null; }
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateEventId(title: string, startTime: string, clubId: string): string {
  const normalized = `luma_${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}_${startTime.slice(0, 10)}_${clubId.slice(0, 8)}`;
  return normalized;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTH + ADMIN CHECK ============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const internalUrl = Deno.env.get('SUPABASE_URL')!;
    const internalAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const internalServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authSupabase = createClient(internalUrl, internalAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const authToken = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(authToken);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminSupabase = createClient(internalUrl, internalServiceKey);
    const { data: isAdmin } = await adminSupabase.rpc('has_role', {
      _user_id: claimsData.claims.sub,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============ CONFIG ============
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const rawExternalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL') || '';
    const EXTERNAL_SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');

    if (!FIRECRAWL_API_KEY) throw new Error('FIRECRAWL_API_KEY not configured');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    if (!rawExternalUrl || !EXTERNAL_SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('External Supabase credentials not configured');
    }

    const externalUrl = normalizeExternalUrl(rawExternalUrl);
    if (!externalUrl) throw new Error('Invalid EXTERNAL_SUPABASE_URL format');

    const externalSupabase = createClient(externalUrl, EXTERNAL_SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 10;
    const offset = body.offset || 0;
    const dryRun = body.dryRun || false;
    // Optional: pass specific club IDs to target
    const targetClubIds: string[] = body.clubIds || [];

    // ============ STRATEGY ============
    // 1. Fetch clubs from external DB
    // 2. For each club, search Firecrawl for "club name lu.ma" or scrape their linktree
    // 3. Scrape discovered Luma pages for event data
    // 4. Use AI to extract structured events
    // 5. Insert as unverified drafts

    let clubsQuery = externalSupabase
      .from('clubs')
      .select('id, name, website, instagram')
      .not('name', 'is', null)
      .order('name', { ascending: true });

    if (targetClubIds.length > 0) {
      clubsQuery = clubsQuery.in('id', targetClubIds);
    } else {
      clubsQuery = clubsQuery.range(offset, offset + limit - 1);
    }

    const { data: clubs, error: clubsError } = await clubsQuery;
    if (clubsError) throw new Error(`Failed to fetch clubs: ${clubsError.message}`);

    const clubList = (clubs || []).map((c: any) => ({
      id: c.id,
      name: (c.name || '').replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim(),
      website: c.website || null,
      instagram: c.instagram || null,
    })).filter((c: ClubRecord) => c.name.length > 2);

    console.log(`Processing ${clubList.length} clubs for Luma events (offset: ${offset})`);

    const result = {
      clubsProcessed: 0,
      lumaPagesfound: 0,
      eventsExtracted: 0,
      eventsInserted: 0,
      errors: [] as string[],
      clubBreakdown: {} as Record<string, { lumaUrls: string[]; events: number }>,
    };

    for (const club of clubList) {
      try {
        console.log(`\n--- Processing: ${club.name} ---`);

        // Step 1: Find Luma pages for this club
        const lumaUrls = await findLumaPages(club, FIRECRAWL_API_KEY);

        if (lumaUrls.length === 0) {
          console.log(`No Luma pages found for ${club.name}`);
          result.clubBreakdown[club.name] = { lumaUrls: [], events: 0 };
          result.clubsProcessed++;
          continue;
        }

        console.log(`Found ${lumaUrls.length} Luma URLs for ${club.name}: ${lumaUrls.join(', ')}`);
        result.lumaPagesfound += lumaUrls.length;
        result.clubBreakdown[club.name] = { lumaUrls, events: 0 };

        // Step 2: Scrape each Luma page
        let allEvents: ScrapedEvent[] = [];

        for (const lumaUrl of lumaUrls.slice(0, 3)) {
          const content = await scrapePageContent(lumaUrl, FIRECRAWL_API_KEY);
          if (!content || content.length < 30) {
            console.log(`No content from ${lumaUrl}`);
            continue;
          }

          console.log(`Got ${content.length} chars from ${lumaUrl}`);

          // Step 3: Extract events via AI
          const events = await extractEventsFromLuma(content, club.name, lumaUrl, LOVABLE_API_KEY);
          console.log(`Extracted ${events.length} events from ${lumaUrl}`);
          allEvents = allEvents.concat(events);

          await delay(300);
        }

        // Step 4: Insert events as unverified drafts
        if (!dryRun) {
          for (const event of allEvents) {
            try {
              const externalId = generateEventId(event.title, event.start_time, club.id);

              const { error: insertError } = await externalSupabase
                .from('events')
                .insert({
                  title: event.title,
                  start_time: event.start_time,
                  end_time: event.end_time || null,
                  location: event.location || null,
                  club_id: club.id,
                  club_handle: club.id,
                  source: 'luma',
                  source_url: event.luma_url || null,
                  external_source: 'luma',
                  external_id: externalId,
                  verified: false,
                  caption: event.description,
                  posted_at: new Date().toISOString(),
                });

              if (insertError) {
                // Duplicate key = already exists, not a real error
                if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
                  console.log(`Duplicate event skipped: ${event.title}`);
                } else {
                  console.error('Insert error:', JSON.stringify(insertError));
                  result.errors.push(`Insert failed: ${event.title} - ${insertError.message}`);
                }
              } else {
                result.eventsInserted++;
                result.clubBreakdown[club.name].events++;
              }
            } catch (e) {
              console.error('Event insert error:', e);
            }
          }
        }

        result.eventsExtracted += allEvents.length;
        result.clubsProcessed++;

        // Rate limit between clubs
        await delay(500);
      } catch (clubError) {
        console.error(`Error processing ${club.name}:`, clubError);
        result.errors.push(`${club.name}: ${clubError instanceof Error ? clubError.message : 'Unknown'}`);
        result.clubsProcessed++;
      }
    }

    console.log('\n=== Luma scrape complete ===');
    console.log(JSON.stringify(result, null, 2));

    return new Response(JSON.stringify({ success: true, dryRun, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Find Luma event pages for a club using multiple strategies:
 * 1. Search Firecrawl for "club name site:lu.ma"
 * 2. If club has a website, check if it's a linktree and follow links to lu.ma
 * 3. If club has an Instagram, search for "club_handle lu.ma"
 */
async function findLumaPages(club: ClubRecord, firecrawlKey: string): Promise<string[]> {
  const lumaUrls = new Set<string>();

  // Strategy 1: Direct Firecrawl search for the club on lu.ma
  try {
    const searchQuery = `"${club.name}" site:lu.ma`;
    console.log(`Searching: ${searchQuery}`);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const results = data.data || data.results || [];

      for (const r of results) {
        const url = r.url || '';
        if (url.includes('lu.ma') || url.includes('luma.com')) {
          // Filter out generic luma pages
          if (!url.match(/^https?:\/\/(www\.)?lu\.ma\/?$/)) {
            lumaUrls.add(url);
          }
        }
      }
    } else {
      console.error('Luma search failed:', response.status);
    }
  } catch (e) {
    console.error('Search error:', e);
  }

  await delay(400);

  // Strategy 2: If club has a Linktree, scrape it for lu.ma links
  if (club.website && club.website.includes('linktr.ee')) {
    try {
      console.log(`Scraping linktree: ${club.website}`);
      const content = await scrapePageContent(club.website, firecrawlKey);
      
      // Extract lu.ma links from linktree content
      const lumaLinkRegex = /https?:\/\/(?:www\.)?lu\.ma\/[^\s"'<>)\]]+/g;
      const matches = content.match(lumaLinkRegex) || [];
      for (const match of matches) {
        lumaUrls.add(match.replace(/[.,;!?]+$/, ''));
      }
    } catch (e) {
      console.error('Linktree scrape error:', e);
    }

    await delay(300);
  }

  // Strategy 3: Search with Instagram handle if available
  if (lumaUrls.size === 0 && club.instagram) {
    const handle = club.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '').trim();
    if (handle.length > 2) {
      try {
        const searchQuery = `${handle} site:lu.ma`;
        console.log(`Instagram-based search: ${searchQuery}`);

        const response = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 5,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const results = data.data || data.results || [];

          for (const r of results) {
            const url = r.url || '';
            if ((url.includes('lu.ma') || url.includes('luma.com')) && !url.match(/^https?:\/\/(www\.)?lu\.ma\/?$/)) {
              lumaUrls.add(url);
            }
          }
        }
      } catch (e) {
        console.error('Instagram search error:', e);
      }

      await delay(400);
    }
  }

  return Array.from(lumaUrls);
}

/**
 * Scrape a page's content using Firecrawl.
 */
async function scrapePageContent(url: string, apiKey: string): Promise<string> {
  try {
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 5000,
      }),
    });

    if (!response.ok) {
      console.error('Firecrawl scrape error:', response.status);
      return '';
    }

    const data = await response.json();
    return data.data?.markdown || data.markdown || '';
  } catch (error) {
    console.error('Scrape error:', error);
    return '';
  }
}

/**
 * Extract structured events from Luma page content using AI.
 */
async function extractEventsFromLuma(
  content: string,
  clubName: string,
  sourceUrl: string,
  apiKey: string
): Promise<ScrapedEvent[]> {
  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `You are an expert at extracting event information from Luma (lu.ma) event pages.
Your task is to identify ALL upcoming events and extract structured data.

Today's date is ${today}. Only extract events on or after today.

For each event, extract:
- title: Clear event title (NOT the organizer name)
- description: Brief description of the event (1-2 sentences)
- start_time: ISO 8601 datetime (assume Pacific timezone / UTC-8 if not specified)
- end_time: ISO 8601 datetime if available
- location: Physical or virtual location if mentioned
- luma_url: The specific lu.ma URL for the event if visible

Rules:
- Luma pages often list multiple upcoming events — extract ALL of them
- If a page is a single event detail, extract just that one event
- Skip past events
- If only a date is given without time, default to 18:00 Pacific
- The club/org name is "${clubName}" — use it for context but don't use it as the event title
- If the title seems to be just the org name, append the date or event type to differentiate`;

  const userPrompt = `Extract ALL upcoming events from this Luma page content for "${clubName}" (source: ${sourceUrl}):

${content.slice(0, 20000)}

Return structured event data. If no events found, return an empty array.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_events',
            description: 'Extract event information from Luma page content',
            parameters: {
              type: 'object',
              properties: {
                events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      start_time: { type: 'string', description: 'ISO 8601 datetime' },
                      end_time: { type: 'string', description: 'ISO 8601 datetime (optional)' },
                      location: { type: 'string', description: 'Event location (optional)' },
                      luma_url: { type: 'string', description: 'Direct lu.ma event URL (optional)' },
                    },
                    required: ['title', 'description', 'start_time'],
                  },
                },
              },
              required: ['events'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'extract_events' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI extraction error:', response.status, errorText);
      return [];
    }

    const data = await response.json();

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      const events = parsed.events || [];
      return events.filter((e: ScrapedEvent) => {
        try {
          return new Date(e.start_time) >= new Date(today);
        } catch {
          return true;
        }
      });
    }

    // Fallback: parse from text
    const textContent = data.choices?.[0]?.message?.content;
    if (textContent) {
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error) {
    console.error('AI extraction failed:', error);
    return [];
  }
}
