import { createClient } from 'npm:@supabase/supabase-js@2';

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
}

interface ScrapeResult {
  clubsSearched: number;
  eventsExtracted: number;
  errors: string[];
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const rawExternalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL') || '';
    const EXTERNAL_SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');

    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY not configured');
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

    // Fetch all clubs
    const { data: clubs, error: clubsError } = await externalSupabase
      .from('clubs')
      .select('id, name')
      .limit(500);

    if (clubsError) {
      console.error('Error fetching clubs:', clubsError);
      throw new Error('Failed to fetch clubs from external database');
    }

    // Clean club names
    const cleanClubs = (clubs || [])
      .map((c: Club) => ({
        id: c.id,
        name: c.name?.replace(/\n/g, ' ').trim() || ''
      }))
      .filter((c: Club) => c.name.length > 2);

    console.log(`Found ${cleanClubs.length} clubs to search for events`);

    const result: ScrapeResult & { clubBreakdown?: Record<string, number> } = {
      clubsSearched: 0,
      eventsExtracted: 0,
      errors: [],
    };
    const clubBreakdown: Record<string, number> = {};

    // Get current date for search context
    const today = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[today.getMonth()];
    const currentYear = today.getFullYear();

    // Build a batch query for multiple clubs at once to be efficient
    const clubNames = cleanClubs.slice(0, 50).map((c: Club) => c.name);
    
    console.log('Searching for UCSD club events...');
    result.clubsSearched = clubNames.length;

    // Use Perplexity to search for recent UCSD club events
    const searchQuery = `What upcoming events are happening at UC San Diego (UCSD) campus in ${currentMonth} ${currentYear}?

Search for:
- Student organization events at UCSD
- Club meetings and socials at UC San Diego
- Workshops, info sessions, and recruitment events on UCSD campus
- Events hosted by student clubs at the University of California San Diego

I need specific event details: event name, exact date and time, location on campus, and hosting club name.`;

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
            content: 'You are an expert at finding upcoming campus events at UC San Diego (UCSD). Focus ONLY on events at UCSD - the University of California San Diego campus in La Jolla, California. Return detailed event information with exact dates, times, locations, and hosting organizations.' 
          },
          { role: 'user', content: searchQuery }
        ],
        search_recency_filter: 'week',
        search_domain_filter: ['ucsd.edu', 'thetritionlink.ucsd.edu', 'studentorg.ucsd.edu', 'calendar.ucsd.edu', 'eventbrite.com'],
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('Perplexity API error:', errorText);
      result.errors.push('Perplexity search failed');
      return new Response(JSON.stringify({
        success: false,
        error: 'Web search failed',
        ...result,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const searchData = await perplexityResponse.json();
    const searchContent = searchData.choices?.[0]?.message?.content || '';
    const citations = searchData.citations || [];

    console.log('Search results received, extracting events...');
    console.log('Citations:', citations);

    if (!searchContent || searchContent.length < 50) {
      console.log('No meaningful results from search');
      return new Response(JSON.stringify({
        success: true,
        message: 'No events found in search results',
        ...result,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to extract structured events
    const events = await extractEventsWithAI(searchContent, cleanClubs, LOVABLE_API_KEY, currentYear);
    
    console.log(`Extracted ${events.length} events`);

    // Insert events into database
    for (const event of events) {
      try {
        // Find matching club
        const matchingClub = cleanClubs.find((c: Club) => 
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
          source: 'web_search',
          source_url: citations[0] || null,
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
          const clubLabel = matchingClub?.name || event.club_name || 'Unknown';
          clubBreakdown[clubLabel] = (clubBreakdown[clubLabel] || 0) + 1;
        }
      } catch (eventError) {
        console.error('Error processing event:', eventError);
        result.errors.push(`Error: ${event.title}`);
      }
    }

    console.log('Scrape complete:', result);

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

async function extractEventsWithAI(
  searchContent: string,
  clubs: Club[],
  apiKey: string,
  currentYear: number
): Promise<ExtractedEvent[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const systemPrompt = `You are an expert at extracting event information from search results.
Your task is to identify upcoming events and extract structured data.

Today's date is ${today}. The current year is ${currentYear}.

For each event found, extract:
- title: A clear, concise event title
- description: Brief description of the event
- start_time: ISO 8601 datetime (use ${currentYear} if year not specified, assume Pacific timezone)
- end_time: ISO 8601 datetime if mentioned (optional)
- location: Physical location if mentioned
- club_name: Name of the hosting club/organization

Rules:
- Only extract actual upcoming events (meetings, socials, workshops, info sessions)
- Skip past events or general announcements
- If a date is mentioned without year, use ${currentYear}
- If time is not specified, assume 6:00 PM Pacific
- Be conservative - only extract events you're confident about`;

  const userPrompt = `Extract all upcoming UCSD events from this search result:

${searchContent.slice(0, 10000)}

Known UCSD clubs: ${clubs.slice(0, 30).map(c => c.name).join(', ')}

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
              description: 'Extract event information from search results',
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
                        club_name: { type: 'string', description: 'Hosting club/organization name' },
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
