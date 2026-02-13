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
        // Normalize Instagram handle
        let instagramUrl = club.instagram.trim();
        if (!instagramUrl.startsWith('http')) {
          instagramUrl = `https://instagram.com/${instagramUrl.replace('@', '')}`;
        }

        console.log(`Scraping Instagram for ${club.name}: ${instagramUrl}`);

        // Use Firecrawl to scrape Instagram
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
            waitFor: 3000, // Wait for Instagram to load
          }),
        });

        if (!scrapeResponse.ok) {
          const errorText = await scrapeResponse.text();
          console.error(`Firecrawl error for ${club.name}:`, errorText);
          result.errors.push(`Failed to scrape Instagram for ${club.name}`);
          continue;
        }

        const scrapeData = await scrapeResponse.json();
        const content = scrapeData.data?.markdown || scrapeData.markdown || '';

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
              club_handle: null,
              source: 'instagram',
              source_url: instagramUrl,
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
  
  const systemPrompt = `You are an expert at extracting event information from Instagram posts and stories.
Your task is to identify upcoming events and extract structured data.

Today's date is ${today}.

For each event found, extract:
- title: A clear, concise event title
- description: Brief description of the event (from captions/descriptions)
- start_time: ISO 8601 datetime (assume Pacific timezone if not specified)
- end_time: ISO 8601 datetime if mentioned (optional)
- location: Physical location if mentioned
- club_name: "${club.name}"

Rules:
- Only extract actual upcoming events (meetings, socials, workshops, parties, game nights, fundraisers, etc.)
- Skip past events or general announcements
- If a date is mentioned without year, use current year
- If time is not specified, make a reasonable guess based on event type (e.g., parties at 9 PM, meetings at 7 PM)
- Be conservative - only extract events you're confident about
- Extract event details from captions, comments, and post descriptions`;

  const userPrompt = `Extract all upcoming events from this Instagram content for ${club.name}:

${content.slice(0, 5000)}

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
