import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Club {
  id: string;
  name: string;
  website: string;
}

interface ScrapedEvent {
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  location?: string;
  club_name: string;
}

interface ScrapeResult {
  clubsScraped: number;
  eventsExtracted: number;
  errors: string[];
  clubBreakdown: Record<string, number>;
}

const normalizeExternalUrl = (value: string): string | null => {
  let v = value.trim();
  if (!v) return null;
  v = v.replace(/\/(auth|rest|functions)\/v1.*$/i, "");
  v = v.replace(/\/+$/, "");
  if (!v.startsWith("http://") && !v.startsWith("https://")) {
    if (v.includes(".") || v.includes("supabase.co")) {
      v = `https://${v}`;
    } else {
      v = `https://${v}.supabase.co`;
    }
  }
  try { new URL(v); return v; } catch { return null; }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTH + ADMIN CHECK ============
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const internalUrl = Deno.env.get("SUPABASE_URL")!;
    const internalAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const internalServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authSupabase = createClient(internalUrl, internalAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const authToken = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(authToken);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSupabase = createClient(internalUrl, internalServiceKey);
    const { data: isAdmin } = await adminSupabase.rpc('has_role', {
      _user_id: claimsData.claims.sub,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 5;
    const offset = body.offset || 0;

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

    // Fetch clubs with website URLs (paginated)
    const { data: clubs, error: clubsError } = await externalSupabase
      .from('clubs')
      .select('id, name, website')
      .not('website', 'is', null)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (clubsError) {
      console.error('Error fetching clubs:', clubsError);
      throw new Error('Failed to fetch clubs from external database');
    }

    const clubsWithWebsite = (clubs || [])
      .map((c: any) => ({
        id: c.id,
        name: (c.name || '').replace(/\n/g, ' ').trim(),
        website: (c.website || '').trim(),
      }))
      .filter((c: Club) => c.name.length > 2 && c.website.length > 5);

    console.log(`Processing ${clubsWithWebsite.length} clubs (offset: ${offset}, limit: ${limit})`);

    const result: ScrapeResult = {
      clubsScraped: 0,
      eventsExtracted: 0,
      errors: [],
      clubBreakdown: {},
    };

    for (const club of clubsWithWebsite) {
      try {
        console.log(`Processing ${club.name}: ${club.website}`);

        // Scrape the homepage directly (skip Map to save time/credits)
        const content = await scrapePageContent(club.website, FIRECRAWL_API_KEY);
        if (!content || content.length < 50) {
          console.log(`No meaningful content from ${club.website}`);
          result.errors.push(`No content: ${club.name}`);
          continue;
        }

        console.log(`Got ${content.length} chars from ${club.name}`);

        // Extract events via AI
        const events = await extractEventsFromPage(content, club, LOVABLE_API_KEY);
        console.log(`Extracted ${events.length} events from ${club.name}`);

        // Insert events with deduplication
        for (const event of events) {
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
                source: 'website',
                source_url: club.website,
                external_source: 'club_website',
                external_id: externalId,
                verified: false,
                caption: event.description,
                posted_at: new Date().toISOString(),
              });

            if (insertError) {
              console.error('Error inserting event:', JSON.stringify(insertError));
              result.errors.push(`Insert failed: ${event.title} - ${insertError.message || JSON.stringify(insertError)}`);
            } else {
              result.eventsExtracted++;
              result.clubBreakdown[club.name] = (result.clubBreakdown[club.name] || 0) + 1;
            }
          } catch (e) {
            console.error('Event insert error:', e);
          }
        }

        result.clubsScraped++;
      } catch (clubError) {
        console.error(`Error processing ${club.name}:`, clubError);
        result.errors.push(`Error: ${club.name}`);
      }
    }

    console.log('Website scrape complete:', JSON.stringify(result));

    return new Response(JSON.stringify({ success: true, ...result }), {
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
 * Use Firecrawl Map to discover event/calendar pages on a club website.
 */
async function discoverEventPages(websiteUrl: string, apiKey: string): Promise<string[]> {
  let formattedUrl = websiteUrl.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = `https://${formattedUrl}`;
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        search: 'events calendar upcoming',
        limit: 20,
        includeSubdomains: false,
      }),
    });

    if (!response.ok) {
      console.error('Firecrawl map error:', response.status);
      return [];
    }

    const data = await response.json();
    const links: string[] = data.links || [];

    // Filter for event-related pages
    const eventKeywords = [
      'event', 'calendar', 'upcoming', 'schedule', 'activities',
      'whats-happening', 'happenings', 'programs', 'meetings',
    ];

    const eventPages = links.filter(link => {
      const lower = link.toLowerCase();
      return eventKeywords.some(kw => lower.includes(kw));
    });

    // If no event-specific pages found, try the homepage as fallback
    if (eventPages.length === 0) {
      return [formattedUrl];
    }

    return eventPages;
  } catch (error) {
    console.error('Map discovery error:', error);
    return [formattedUrl]; // fallback to homepage
  }
}

/**
 * Scrape a single page's content using Firecrawl.
 */
async function scrapePageContent(url: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
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
 * Extract structured events from page content using AI.
 */
async function extractEventsFromPage(
  content: string,
  club: Club,
  apiKey: string
): Promise<ScrapedEvent[]> {
  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `You are an expert at extracting event information from club and organization websites.
Your task is to identify ALL upcoming events from the page content and extract structured data.

Today's date is ${today}. Only extract events that are in the future (on or after today).

For each event, extract:
- title: Clear event title
- description: Brief description
- start_time: ISO 8601 datetime (assume Pacific timezone / UTC-8 if not specified)
- end_time: ISO 8601 datetime if available
- location: Physical location if mentioned
- club_name: "${club.name}"

Rules:
- Extract meetings, socials, workshops, parties, game nights, fundraisers, info sessions, GBMs, mixers, study sessions, volunteering, performances, concerts, movie nights, food events, etc.
- If only a date is given without time, default to 18:00 Pacific
- If a year is not specified, assume the current or next occurrence
- Skip past events
- Be thorough — extract every distinct event you can find`;

  const userPrompt = `Extract ALL upcoming events from this website content for "${club.name}":

${content.slice(0, 24000)}

Return structured event data. If no events found, return an empty array.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_events',
            description: 'Extract event information from website content',
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
                      club_name: { type: 'string' },
                    },
                    required: ['title', 'description', 'start_time', 'club_name'],
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
      // Filter to future events only
      return events.filter((e: ScrapedEvent) => {
        try {
          return new Date(e.start_time) >= new Date(today);
        } catch {
          return true;
        }
      });
    }

    // Fallback: parse from text content
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

/**
 * Generate a deterministic event ID for deduplication.
 */
function generateEventId(title: string, startTime: string, clubId: string): string {
  const normalized = `${title.toLowerCase().replace(/\s+/g, '-').slice(0, 50)}_${startTime.slice(0, 10)}_${clubId.slice(0, 8)}`;
  return normalized;
}
