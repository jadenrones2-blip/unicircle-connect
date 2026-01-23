import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Club {
  id: string;
  name: string;
  instagram_handle?: string;
}

interface ExtractedEvent {
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  location?: string;
}

interface ScrapeResult {
  clubsProcessed: number;
  postsFetched: number;
  eventsExtracted: number;
  errors: string[];
}

// Normalize external URL (handle various formats)
const normalizeExternalUrl = (value: string): string | null => {
  let v = value.trim();
  if (!v) return null;

  // Users sometimes paste a full API path. supabase-js expects the base URL only.
  v = v.replace(/\/(auth|rest|functions)\/v1.*$/i, "");
  v = v.replace(/\/+$/, "");

  // Accept either full URL, host, or project ref
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Create external Supabase client
    const externalSupabase = createClient(externalUrl, EXTERNAL_SUPABASE_SERVICE_ROLE_KEY);

    // Fetch clubs with Instagram handles
    const { data: clubs, error: clubsError } = await externalSupabase
      .from('clubs')
      .select('id, name, instagram_handle')
      .not('instagram_handle', 'is', null)
      .neq('instagram_handle', '');

    if (clubsError) {
      console.error('Error fetching clubs:', clubsError);
      throw new Error('Failed to fetch clubs from external database');
    }

    console.log(`Found ${clubs?.length || 0} clubs with Instagram handles`);

    const result: ScrapeResult = {
      clubsProcessed: 0,
      postsFetched: 0,
      eventsExtracted: 0,
      errors: [],
    };

    // Process each club
    for (const club of (clubs || []) as Club[]) {
      try {
        console.log(`Processing club: ${club.name} (@${club.instagram_handle})`);
        result.clubsProcessed++;

        // Scrape Instagram page using Firecrawl
        const instagramUrl = `https://www.instagram.com/${club.instagram_handle}/`;
        
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: instagramUrl,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 3000, // Wait for dynamic content
          }),
        });

        if (!scrapeResponse.ok) {
          const errorText = await scrapeResponse.text();
          console.error(`Firecrawl error for ${club.instagram_handle}:`, errorText);
          result.errors.push(`Failed to scrape @${club.instagram_handle}: ${scrapeResponse.status}`);
          continue;
        }

        const scrapeData = await scrapeResponse.json();
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';

        if (!markdown || markdown.length < 100) {
          console.log(`No content found for @${club.instagram_handle}`);
          continue;
        }

        result.postsFetched++;
        console.log(`Scraped ${markdown.length} characters from @${club.instagram_handle}`);

        // Use AI to extract events
        const events = await extractEventsWithAI(markdown, club, LOVABLE_API_KEY);
        
        if (events.length === 0) {
          console.log(`No events found for @${club.instagram_handle}`);
          continue;
        }

        console.log(`Extracted ${events.length} events from @${club.instagram_handle}`);

        // Upsert events to external database
        for (const event of events) {
          try {
            const eventRecord = {
              title: event.title,
              description: event.description,
              start_time: event.start_time,
              end_time: event.end_time || null,
              location: event.location || null,
              club_id: club.id,
              club_handle: club.instagram_handle,
              source: 'instagram_scrape',
              source_url: instagramUrl,
              verified: false, // Needs review
              caption: event.description,
              posted_at: new Date().toISOString(),
            };

            const { error: insertError } = await externalSupabase
              .from('events')
              .upsert(eventRecord, {
                onConflict: 'club_id,title,start_time',
                ignoreDuplicates: true,
              });

            if (insertError) {
              console.error(`Error inserting event:`, insertError);
              result.errors.push(`Failed to insert event: ${event.title}`);
            } else {
              result.eventsExtracted++;
            }
          } catch (eventError) {
            console.error(`Error processing event:`, eventError);
            result.errors.push(`Error processing event: ${event.title}`);
          }
        }

        // Rate limit: wait between clubs to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (clubError) {
        console.error(`Error processing club ${club.name}:`, clubError);
        result.errors.push(`Error processing ${club.name}: ${clubError instanceof Error ? clubError.message : 'Unknown error'}`);
      }
    }

    console.log('Scrape complete:', result);

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

async function extractEventsWithAI(
  markdown: string,
  club: Club,
  apiKey: string
): Promise<ExtractedEvent[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const systemPrompt = `You are an expert at extracting event information from social media content.
Your task is to identify upcoming events from Instagram posts and extract structured data.

Today's date is ${today}. Only extract events that appear to be in the future.

For each event found, extract:
- title: A clear, concise event title
- description: Brief description of the event
- start_time: ISO 8601 datetime (use current year if not specified, assume Pacific timezone)
- end_time: ISO 8601 datetime if mentioned
- location: Physical location if mentioned

Rules:
- Only extract actual events (meetings, socials, workshops, info sessions, etc.)
- Skip general promotional content that isn't a specific event
- If a date is mentioned without a year, use the current or next occurrence
- If time is not specified, assume 6:00 PM
- Be conservative - only extract events you're confident about`;

  const userPrompt = `Extract all upcoming events from this Instagram content for the club "${club.name}" (@${club.instagram_handle}):

${markdown.slice(0, 8000)}

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
              description: 'Extract event information from social media content',
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
                      },
                      required: ['title', 'description', 'start_time'],
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
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return parsed.events || [];
    }

    // Fallback: try to parse from content
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
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
