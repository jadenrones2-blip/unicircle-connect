import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Club {
  id: string;
  name: string;
  instagram: string;
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
  clubBreakdown?: Record<string, number>;
}

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

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const rawExternalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL') || '';
    const EXTERNAL_SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');

    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    if (!rawExternalUrl || !EXTERNAL_SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('External Supabase credentials not configured');
    }

    const externalUrl = normalizeExternalUrl(rawExternalUrl);
    if (!externalUrl) {
      throw new Error('Invalid EXTERNAL_SUPABASE_URL format');
    }

    console.log('Using external Supabase URL:', externalUrl);

    const externalSupabase = createClient(externalUrl, EXTERNAL_SUPABASE_SERVICE_ROLE_KEY);

    // Fetch clubs with Instagram handles
    const { data: clubs, error: clubsError } = await externalSupabase
      .from('clubs')
      .select('id, name, instagram')
      .not('instagram', 'is', null)
      .limit(500);

    if (clubsError) {
      console.error('Error fetching clubs:', clubsError);
      throw new Error('Failed to fetch clubs from external database');
    }

    // Filter clubs with non-empty Instagram handles
    const clubsWithInstagram = (clubs || [])
      .map((c: any) => ({
        id: c.id,
        name: c.name?.replace(/\n/g, ' ').trim() || '',
        instagram: (c.instagram || '').trim()
      }))
      .filter((c: Club) => c.name.length > 2 && c.instagram.length > 0);

    console.log(`Found ${clubsWithInstagram.length} clubs with Instagram handles`);

    const result: ScrapeResult = {
      clubsScraped: 0,
      eventsExtracted: 0,
      errors: [],
    };
    const clubBreakdown: Record<string, number> = {};

    // Scrape Instagram for each club
    for (const club of clubsWithInstagram) {
      try {
        // Normalize Instagram handle to just the username
        let handle = club.instagram.trim().replace('@', '');
        if (handle.startsWith('http')) {
          // Extract handle from URL
          const match = handle.match(/instagram\.com\/([^/?]+)/);
          handle = match ? match[1] : handle;
        }
        handle = handle.replace(/\/$/, '');

        // Try multiple sources for better coverage
        const sources = [
          `https://www.picnob.com/profile/${handle}/`,
          `https://imginn.com/${handle}/`,
          `https://instagram.com/${handle}/`,
        ];

        console.log(`Scraping Instagram for ${club.name} (@${handle})`);

        let content = '';
        for (const sourceUrl of sources) {
          try {
            const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: sourceUrl,
                formats: ['markdown'],
                onlyMainContent: true,
                waitFor: 5000,
              }),
            });

            if (scrapeResponse.ok) {
              const scrapeData = await scrapeResponse.json();
              const scraped = scrapeData.data?.markdown || scrapeData.markdown || '';
              if (scraped.length > content.length) {
                content = scraped;
                console.log(`Got ${scraped.length} chars from ${sourceUrl}`);
              }
            }
          } catch (e) {
            console.log(`Source ${sourceUrl} failed, trying next...`);
          }
          
          // If we got good content, stop trying other sources
          if (content.length > 200) break;
        }

        if (!content || content.length < 50) {
          console.log(`No meaningful content from ${club.name} Instagram`);
          continue;
        }

        // Extract events from Instagram content
        const events = await extractEventsFromInstagram(content, club, LOVABLE_API_KEY);

        console.log(`Extracted ${events.length} events from ${club.name}`);

        // Insert events into database
        for (const event of events) {
          try {
            const eventRecord = {
              title: event.title,
              start_time: event.start_time,
              end_time: event.end_time || null,
              location: event.location || 'UCSD Campus',
              club_id: club.id,
              club_handle: handle,
              source: 'instagram',
              source_url: `https://instagram.com/${handle}/`,
              verified: false,
              caption: event.description,
              posted_at: new Date().toISOString(),
            };

            console.log('Inserting event:', eventRecord.title);

            const { error: insertError } = await externalSupabase
              .from('events')
              .insert(eventRecord);

            if (insertError) {
              console.error('Error inserting event:', insertError);
              result.errors.push(`Failed to insert: ${event.title}`);
            } else {
              result.eventsExtracted++;
              clubBreakdown[club.name] = (clubBreakdown[club.name] || 0) + 1;
            }
          } catch (eventError) {
            console.error('Error processing event:', eventError);
            result.errors.push(`Error: ${event.title}`);
          }
        }

        result.clubsScraped++;
      } catch (error) {
        console.error(`Error scraping ${club.name}:`, error);
        result.errors.push(`Error scraping ${club.name}`);
      }
    }

    console.log('Instagram scrape complete:', result);

    result.clubBreakdown = clubBreakdown;

    return new Response(JSON.stringify({
      success: true,
      ...result,
    }), {
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

// Normalize external URL (handle various formats)
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

  try {
    new URL(v);
    return v;
  } catch {
    return null;
  }
};

async function extractEventsFromInstagram(
  content: string,
  club: Club,
  apiKey: string
): Promise<ScrapedEvent[]> {
  const today = new Date().toISOString().split('T')[0];
  
const systemPrompt = `You are an expert at extracting event information from Instagram posts, stories, captions, and club social media.
Your task is to identify ANY upcoming events and extract structured data.

Today's date is ${today}. Assume current year if not specified.

For each event found, extract:
- title: A clear, concise event title
- description: Brief description of the event (from captions/descriptions)
- start_time: ISO 8601 datetime (assume Pacific timezone / UTC-8 if not specified)
- end_time: ISO 8601 datetime if mentioned (optional)
- location: Physical location if mentioned (if not mentioned, leave null)
- club_name: "${club.name}"

Rules:
- Extract ALL types of events: meetings, socials, workshops, parties, game nights, fundraisers, info sessions, GBMs, mixers, study sessions, volunteering, performances, showcases, concerts, movie nights, food events, etc.
- Even if a date is vague like "this Friday", "next week", "coming soon", "tmrw", calculate the actual date from today (${today})
- If only a day is mentioned without time, use 6:00 PM Pacific as default
- Look for abbreviations and casual language: "fri" = Friday, "sat" = Saturday, "tmrw" = tomorrow, "tonite" = tonight, "nxt" = next
- If a post mentions "pull up", "come through", "be there", "swag", "vibes", "lit", "join us", "RSVP", "link in bio", it's likely an event
- Look for times in all formats: "6pm", "6:00 PM", "18:00", "evening", "night", "morning", "afternoon"
- Look for dates in ALL formats: "Feb 15", "2/15", "Friday night", "this weekend", "next Friday", "Jan 20th", "Valentine's Day"
- Extract events even if time/location is incomplete — null values are acceptable
- Skip ONLY things that are clearly NOT events (memes, shoutouts, throwback photos, announcements, recruitment posts)
- Be AGGRESSIVE rather than conservative — it's better to extract a possible event than miss a real one
- If you see patterns like "Fridays at 7pm" or "Weekly meetings on Tuesdays", extract as recurring events with the next occurrence`;

  const userPrompt = `Extract ALL upcoming events from this Instagram/social media content for the club "${club.name}":

${content.slice(0, 8000)}

Return a JSON array of events. If no events are found, return an empty array [].`;

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
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_events',
              description: 'Extract event information from Instagram content',
              parameters: {
                type: 'object',
                properties: {
                  events: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Event title' },
                        description: { type: 'string', description: 'Event description' },
                        start_time: { type: 'string', description: 'ISO 8601 start datetime' },
                        end_time: { type: 'string', description: 'ISO 8601 end datetime (optional)' },
                        location: { type: 'string', description: 'Event location (optional)' },
                        club_name: { type: 'string', description: 'Hosting club name' },
                      },
                      required: ['title', 'description', 'start_time', 'club_name'],
                    },
                  },
                },
                required: ['events'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_events' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI extraction error:', errorText);
      return [];
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return parsed.events || [];
    }

    const textContent = data.choices?.[0]?.message?.content;
    if (textContent) {
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    return [];
  } catch (error) {
    console.error('AI extraction failed:', error);
    return [];
  }
}
