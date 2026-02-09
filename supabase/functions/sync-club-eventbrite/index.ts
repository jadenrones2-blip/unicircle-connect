import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EventbriteEvent {
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  event_url: string;
  image_url: string | null;
  external_id: string;
  organizer_name: string;
}

interface SyncResult {
  success: boolean;
  eventsFound: number;
  eventsMatched: number;
  eventsCreated: number;
  eventsUpdated: number;
  unmatchedOrganizers: string[];
  error?: string;
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

// Extract event ID from Eventbrite URL
function extractEventId(url: string): string | null {
  if (!url) return null;
  
  // https://www.eventbrite.com/e/event-name-123456789
  const match = url.match(/eventbrite\.com\/e\/[^\/]*-(\d+)/i) ||
                url.match(/eventbrite\.com\/e\/(\d+)/i);
  
  return match ? match[1] : null;
}

// Normalize club name for matching (lowercase, remove common suffixes)
function normalizeClubName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\bat\b\s*uc\s*san\s*diego/gi, '')
    .replace(/\bat\b\s*ucsd/gi, '')
    .replace(/uc\s*san\s*diego/gi, '')
    .replace(/ucsd/gi, '')
    .replace(/\bclub\b/gi, '')
    .replace(/\borganization\b/gi, '')
    .replace(/\borg\b/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim();
}

// Search for UCSD events on Eventbrite using Firecrawl search
async function searchUCSDEvents(
  firecrawlKey: string,
  lovableKey: string
): Promise<EventbriteEvent[]> {
  const events: EventbriteEvent[] = [];
  
  // Search queries to find UCSD-related events
  const searchQueries = [
    'site:eventbrite.com UCSD upcoming events',
    'site:eventbrite.com "UC San Diego" upcoming events',
    'site:eventbrite.com "University of California San Diego" events',
  ];

  for (const query of searchQueries) {
    try {
      console.log(`Searching: ${query}`);
      
      const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: 20,
          scrapeOptions: {
            formats: ['markdown', 'html'],
          },
        }),
      });

      if (!searchResponse.ok) {
        console.error(`Search failed for "${query}":`, searchResponse.status);
        continue;
      }

      const searchData = await searchResponse.json();
      const results = searchData.data || [];
      
      console.log(`Found ${results.length} results for "${query}"`);

      // Process each search result
      for (const result of results) {
        if (!result.url?.includes('eventbrite.com/e/')) continue;
        
        const eventId = extractEventId(result.url);
        if (!eventId) continue;
        
        // Skip if we already have this event
        if (events.some(e => e.external_id === eventId)) continue;
        
        // Extract event details from the result
        const html = result.html || '';
        const markdown = result.markdown || '';
        
        // Try to extract from JSON-LD in HTML
        const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
        if (jsonLdMatch) {
          try {
            const data = JSON.parse(jsonLdMatch[1]);
            if (data['@type'] === 'Event' && data.startDate) {
              const event: EventbriteEvent = {
                title: data.name || result.title || 'Untitled Event',
                description: data.description?.slice(0, 300) || null,
                start_time: data.startDate,
                end_time: data.endDate || null,
                location: data.location?.name || data.location?.address?.streetAddress || null,
                event_url: result.url,
                image_url: data.image || null,
                external_id: eventId,
                organizer_name: data.organizer?.name || '',
              };
              
              if (event.organizer_name) {
                events.push(event);
                console.log(`Extracted event: "${event.title}" by "${event.organizer_name}"`);
              }
              continue;
            }
          } catch (e) {
            console.log('Failed to parse JSON-LD:', e);
          }
        }
        
        // Fallback: Use AI to extract event details
        const extracted = await extractEventWithAI(markdown, result.url, lovableKey);
        if (extracted && extracted.organizer_name) {
          extracted.external_id = eventId;
          events.push(extracted);
          console.log(`AI extracted event: "${extracted.title}" by "${extracted.organizer_name}"`);
        }
      }

      // Rate limiting between searches
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error searching "${query}":`, error);
    }
  }

  return events;
}

// Use AI to extract event details from page content
async function extractEventWithAI(
  markdown: string,
  eventUrl: string,
  apiKey: string
): Promise<EventbriteEvent | null> {
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  const systemPrompt = `You are an expert at extracting event information from Eventbrite pages.
Extract the event details from the page content.

Today's date is ${today}. The current year is ${currentYear}.

Extract:
- title: The event title
- description: Brief description (max 300 chars)
- start_time: ISO 8601 datetime
- end_time: ISO 8601 datetime if available
- location: Physical location/venue
- image_url: Event image URL if available
- organizer_name: The name of the organization/club hosting the event (VERY IMPORTANT)

Rules:
- If year not specified, use ${currentYear}
- The organizer_name is critical - look for "Organized by", "Hosted by", or similar patterns
- Return null if you can't find the organizer name`;

  const userPrompt = `Extract event details from this Eventbrite page:

${markdown.slice(0, 10000)}

Event URL: ${eventUrl}`;

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
              description: 'Extract event details from page content',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  start_time: { type: 'string' },
                  end_time: { type: 'string' },
                  location: { type: 'string' },
                  image_url: { type: 'string' },
                  organizer_name: { type: 'string' },
                },
                required: ['title', 'start_time', 'organizer_name'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_event' } },
      }),
    });

    if (!response.ok) {
      console.error('AI extraction error:', response.status);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return {
        title: parsed.title || 'Untitled Event',
        description: parsed.description || null,
        start_time: parsed.start_time,
        end_time: parsed.end_time || null,
        location: parsed.location || null,
        event_url: eventUrl,
        image_url: parsed.image_url || null,
        external_id: '',
        organizer_name: parsed.organizer_name || '',
      };
    }

    return null;
  } catch (error) {
    console.error('AI extraction failed:', error);
    return null;
  }
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
      return new Response(JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const externalUrl = normalizeExternalUrl(rawExternalUrl);
    if (!externalUrl || !EXTERNAL_SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'External database not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const externalSupabase = createClient(externalUrl, EXTERNAL_SUPABASE_SERVICE_ROLE_KEY);

    console.log('Starting UCSD Eventbrite sync...');

    const result: SyncResult = {
      success: false,
      eventsFound: 0,
      eventsMatched: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      unmatchedOrganizers: [],
    };

    // Step 1: Fetch all clubs from the database
    console.log('Fetching clubs from database...');
    const { data: clubs, error: clubsError } = await externalSupabase
      .from('clubs')
      .select('id, name, handle');

    if (clubsError) {
      console.error('Error fetching clubs:', clubsError);
      return new Response(JSON.stringify({ success: false, error: 'Failed to fetch clubs' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Loaded ${clubs?.length || 0} clubs from database`);

    // Build a lookup map for exact matching
    const clubNameMap = new Map<string, { id: string; name: string; handle: string }>();
    for (const club of clubs || []) {
      // Store both original and normalized versions
      clubNameMap.set(club.name.toLowerCase(), club);
      clubNameMap.set(normalizeClubName(club.name), club);
    }

    // Step 2: Search for UCSD events on Eventbrite
    console.log('Searching Eventbrite for UCSD events...');
    const events = await searchUCSDEvents(FIRECRAWL_API_KEY, LOVABLE_API_KEY);
    result.eventsFound = events.length;

    console.log(`Found ${events.length} events to process`);

    if (events.length === 0) {
      result.success = true;
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Match events to clubs and insert/update
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const seenOrganizers = new Set<string>();

    for (const event of events) {
      try {
        // Skip past events
        const eventDate = new Date(event.start_time);
        if (eventDate < today) {
          console.log(`Skipping past event: ${event.title}`);
          continue;
        }

        // Try to match organizer to a club (exact match)
        const normalizedOrganizer = event.organizer_name.toLowerCase();
        const normalizedOrganizerClean = normalizeClubName(event.organizer_name);
        
        let matchedClub = clubNameMap.get(normalizedOrganizer) || 
                          clubNameMap.get(normalizedOrganizerClean);

        if (!matchedClub) {
          // Track unmatched organizers for logging
          if (!seenOrganizers.has(event.organizer_name)) {
            seenOrganizers.add(event.organizer_name);
            result.unmatchedOrganizers.push(event.organizer_name);
            console.log(`No match for organizer: "${event.organizer_name}"`);
          }
          continue;
        }

        result.eventsMatched++;
        console.log(`Matched "${event.organizer_name}" to club "${matchedClub.name}" (${matchedClub.id})`);

        // Check if event already exists
        const { data: existing } = await externalSupabase
          .from('events')
          .select('id')
          .eq('external_source', 'eventbrite')
          .eq('external_id', event.external_id)
          .maybeSingle();

        const eventRecord = {
          title: event.title.slice(0, 500),
          caption: event.description?.slice(0, 2000) || null,
          start_time: event.start_time,
          end_time: event.end_time || null,
          location: event.location || null,
          source_url: event.event_url,
          image_url: event.image_url || null,
          club_id: matchedClub.id,
          club_handle: matchedClub.handle || matchedClub.id,
          external_source: 'eventbrite',
          external_id: event.external_id,
          source: 'eventbrite',
          verified: false,
          posted_at: new Date().toISOString(),
        };

        if (existing) {
          // Update existing event
          const { error: updateError } = await externalSupabase
            .from('events')
            .update(eventRecord)
            .eq('id', existing.id);

          if (updateError) {
            console.error(`Error updating event ${event.external_id}:`, updateError);
          } else {
            result.eventsUpdated++;
            console.log(`Updated event: ${event.title}`);
          }
        } else {
          // Insert new event
          const { error: insertError } = await externalSupabase
            .from('events')
            .insert(eventRecord);

          if (insertError) {
            console.error(`Error inserting event ${event.external_id}:`, insertError);
          } else {
            result.eventsCreated++;
            console.log(`Created event: ${event.title}`);
          }
        }

        // Rate limiting between DB operations
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (eventError) {
        console.error(`Error processing event:`, eventError);
      }
    }

    result.success = true;
    console.log(`Sync complete: ${result.eventsMatched} matched, ${result.eventsCreated} created, ${result.eventsUpdated} updated`);
    console.log(`Unmatched organizers: ${result.unmatchedOrganizers.join(', ') || 'none'}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Eventbrite sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
