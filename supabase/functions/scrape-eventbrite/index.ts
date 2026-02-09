import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Club {
  id: string;
  name: string;
}

interface ExtractedEvent {
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  location?: string;
  club_name: string;
  eventbrite_url?: string;
}

interface ScrapeResult {
  clubsSearched: number;
  eventsExtracted: number;
  errors: string[];
}

// Check if event is in the future (today or later)
function isEventInFuture(startTime: string): boolean {
  try {
    const eventDate = new Date(startTime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  } catch {
    return false;
  }
}

// Normalize external URL
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

    // Parse request body for optional limit
    let limit = 20;
    try {
      const body = await req.json();
      if (body.limit && typeof body.limit === 'number') {
        limit = Math.min(body.limit, 100);
      }
    } catch {
      // Use default limit
    }

    // First, use Perplexity to find UCSD club Eventbrite pages
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    const today = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[today.getMonth()];
    const currentYear = today.getFullYear();

    console.log('Searching for UCSD club Eventbrite pages...');

    // Search for UCSD events on Eventbrite
    const searchQuery = `Find upcoming events on Eventbrite specifically for UC San Diego UCSD student clubs and organizations in ${currentMonth} ${currentYear}.

Search for Eventbrite events from:
- UCSD student organizations
- UC San Diego Greek life fraternities sororities
- Triton student clubs
- UCSD cultural organizations
- San Diego college student events

Return Eventbrite event URLs with details: event name, date, time, location, hosting organization.
Only include events that are clearly associated with UCSD or UC San Diego students.`;

    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at finding events on Eventbrite. Focus ONLY on events related to UC San Diego (UCSD) student organizations. Return Eventbrite URLs and event details.' 
          },
          { role: 'user', content: searchQuery }
        ],
        search_recency_filter: 'week',
        search_domain_filter: ['eventbrite.com'],
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('Perplexity API error:', errorText);
      throw new Error('Failed to search Eventbrite');
    }

    const searchData = await perplexityResponse.json();
    const searchContent = searchData.choices?.[0]?.message?.content || '';
    const citations = searchData.citations || [];

    console.log('Found Eventbrite citations:', citations.length);
    console.log('Citations:', citations);

    const result: ScrapeResult = {
      clubsSearched: 0,
      eventsExtracted: 0,
      errors: [],
    };

    // Filter for Eventbrite URLs only
    const eventbriteUrls = citations.filter((url: string) => 
      url.includes('eventbrite.com') && url.includes('/e/')
    ).slice(0, limit);

    console.log(`Found ${eventbriteUrls.length} Eventbrite event URLs to scrape`);
    result.clubsSearched = eventbriteUrls.length;

    // Scrape each Eventbrite page using Firecrawl
    for (const eventUrl of eventbriteUrls) {
      try {
        console.log('Scraping Eventbrite page:', eventUrl);

        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: eventUrl,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });

        if (!firecrawlResponse.ok) {
          console.error('Firecrawl error for', eventUrl);
          result.errors.push(`Failed to scrape: ${eventUrl}`);
          continue;
        }

        const firecrawlData = await firecrawlResponse.json();
        const pageContent = firecrawlData.data?.markdown || firecrawlData.markdown || '';

        if (!pageContent || pageContent.length < 100) {
          console.log('No meaningful content from:', eventUrl);
          continue;
        }

        // Extract event details using AI
        const event = await extractEventFromPage(pageContent, eventUrl, LOVABLE_API_KEY, currentYear);

        if (event) {
          // Skip past events
          if (!isEventInFuture(event.start_time)) {
            console.log(`Skipping past event: ${event.title} (${event.start_time})`);
            continue;
          }

          // Fetch clubs to find matching one
          const { data: clubs } = await externalSupabase
            .from('clubs')
            .select('id, name')
            .limit(500);

          const matchingClub = (clubs || []).find((c: Club) => 
            c.name.toLowerCase().includes(event.club_name.toLowerCase()) ||
            event.club_name.toLowerCase().includes(c.name.toLowerCase())
          );

          const eventRecord = {
            title: event.title,
            start_time: event.start_time,
            end_time: event.end_time || null,
            location: event.location || 'UCSD Campus',
            club_id: matchingClub?.id || null,
            club_handle: null,
            source: 'eventbrite',
            source_url: eventUrl,
            verified: false,
            caption: event.description,
            posted_at: new Date().toISOString(),
          };

          console.log('Inserting Eventbrite event:', eventRecord.title);

          const { error: insertError } = await externalSupabase
            .from('events')
            .insert(eventRecord);

          if (insertError) {
            console.error('Error inserting event:', insertError);
            result.errors.push(`Failed to insert: ${event.title}`);
          } else {
            result.eventsExtracted++;
          }
        }
      } catch (eventError) {
        console.error('Error processing Eventbrite page:', eventError);
        result.errors.push(`Error: ${eventUrl}`);
      }
    }

    // Also extract events from the search content itself
    const additionalEvents = await extractEventsFromSearchContent(
      searchContent, 
      LOVABLE_API_KEY, 
      currentYear
    );

    if (additionalEvents.length > 0) {
      console.log(`Extracting ${additionalEvents.length} additional events from search content`);
      
      const { data: clubs } = await externalSupabase
        .from('clubs')
        .select('id, name')
        .limit(500);

      for (const event of additionalEvents) {
        try {
          const matchingClub = (clubs || []).find((c: Club) => 
            c.name.toLowerCase().includes(event.club_name.toLowerCase()) ||
            event.club_name.toLowerCase().includes(c.name.toLowerCase())
          );

          const eventRecord = {
            title: event.title,
            start_time: event.start_time,
            end_time: event.end_time || null,
            location: event.location || 'UCSD Campus',
            club_id: matchingClub?.id || null,
            club_handle: null,
            source: 'eventbrite',
            source_url: event.eventbrite_url || citations[0] || null,
            verified: false,
            caption: event.description,
            posted_at: new Date().toISOString(),
          };

          const { error: insertError } = await externalSupabase
            .from('events')
            .insert(eventRecord);

          if (!insertError) {
            result.eventsExtracted++;
          }
        } catch (e) {
          console.error('Error inserting additional event:', e);
        }
      }
    }

    console.log('Eventbrite scrape complete:', result);

    return new Response(JSON.stringify({
      success: true,
      ...result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Eventbrite scrape error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractEventFromPage(
  pageContent: string,
  sourceUrl: string,
  apiKey: string,
  currentYear: number
): Promise<ExtractedEvent | null> {
  const today = new Date().toISOString().split('T')[0];
  
  const systemPrompt = `You are an expert at extracting event information from Eventbrite pages.
Extract the event details and return structured data.

Today's date is ${today}. The current year is ${currentYear}.

For the event, extract:
- title: The event title
- description: Brief description (max 200 chars)
- start_time: ISO 8601 datetime (use Pacific timezone)
- end_time: ISO 8601 datetime if available
- location: Physical location/venue
- club_name: Name of the hosting organization

Rules:
- Only extract if this is a real upcoming event
- If year not specified, use ${currentYear}
- For UCSD events, try to identify the hosting student organization`;

  const userPrompt = `Extract event details from this Eventbrite page content:

${pageContent.slice(0, 8000)}

Source URL: ${sourceUrl}

Return a JSON object with the event details. If this is not a valid event, return null.`;

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
              name: 'extract_event',
              description: 'Extract event information from page content',
              parameters: {
                type: 'object',
                properties: {
                  event: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      start_time: { type: 'string' },
                      end_time: { type: 'string' },
                      location: { type: 'string' },
                      club_name: { type: 'string' },
                    },
                    required: ['title', 'start_time', 'club_name'],
                  },
                },
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_event' } },
      }),
    });

    if (!response.ok) {
      console.error('AI extraction error');
      return null;
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      if (parsed.event) {
        return {
          ...parsed.event,
          eventbrite_url: sourceUrl,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('AI extraction failed:', error);
    return null;
  }
}

async function extractEventsFromSearchContent(
  searchContent: string,
  apiKey: string,
  currentYear: number
): Promise<ExtractedEvent[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const systemPrompt = `You are an expert at extracting event information from search results.
Extract all UCSD-related Eventbrite events mentioned.

Today's date is ${today}. The current year is ${currentYear}.`;

  const userPrompt = `Extract all UCSD events from this search result about Eventbrite events:

${searchContent.slice(0, 10000)}

Return a JSON array of events with: title, description, start_time (ISO 8601), end_time, location, club_name, eventbrite_url.
If no events found, return an empty array [].`;

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
              description: 'Extract events from search results',
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
                        start_time: { type: 'string' },
                        end_time: { type: 'string' },
                        location: { type: 'string' },
                        club_name: { type: 'string' },
                        eventbrite_url: { type: 'string' },
                      },
                      required: ['title', 'start_time', 'club_name'],
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
      return [];
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return parsed.events || [];
    }

    return [];
  } catch (error) {
    console.error('AI extraction failed:', error);
    return [];
  }
}
