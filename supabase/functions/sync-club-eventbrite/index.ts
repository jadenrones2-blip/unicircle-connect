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
}

interface SyncResult {
  success: boolean;
  eventsFound: number;
  eventsCreated: number;
  eventsUpdated: number;
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

// Extract organizer ID from Eventbrite URL
function extractOrganizerId(url: string): string | null {
  // Formats:
  // https://www.eventbrite.com/o/ORGANIZERNAME-123456789
  // https://www.eventbrite.com/o/123456789
  const patterns = [
    /eventbrite\.com\/o\/[^-]+-(\d+)/i,
    /eventbrite\.com\/o\/(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// Parse JSON-LD structured data from page content
function parseJsonLdEvents(markdown: string): EventbriteEvent[] {
  const events: EventbriteEvent[] = [];
  
  // Look for JSON-LD script content in the markdown
  const jsonLdPattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = jsonLdPattern.exec(markdown)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      
      // Handle both single events and arrays
      const items = Array.isArray(data) ? data : [data];
      
      for (const item of items) {
        if (item['@type'] === 'Event' || item['@type']?.includes('Event')) {
          const event: EventbriteEvent = {
            title: item.name || 'Untitled Event',
            description: item.description || null,
            start_time: item.startDate,
            end_time: item.endDate || null,
            location: item.location?.name || item.location?.address?.streetAddress || null,
            event_url: item.url || '',
            image_url: item.image || item.image?.[0] || null,
            external_id: extractEventId(item.url) || crypto.randomUUID(),
          };
          
          if (event.start_time) {
            events.push(event);
          }
        }
      }
    } catch (e) {
      console.log('Failed to parse JSON-LD:', e);
    }
  }
  
  return events;
}

// Extract event ID from Eventbrite URL
function extractEventId(url: string): string | null {
  if (!url) return null;
  
  // https://www.eventbrite.com/e/event-name-123456789
  const match = url.match(/eventbrite\.com\/e\/[^\/]*-(\d+)/i) ||
                url.match(/eventbrite\.com\/e\/(\d+)/i);
  
  return match ? match[1] : null;
}

// Parse events from markdown content using AI
async function extractEventsWithAI(
  markdown: string,
  organizerUrl: string,
  apiKey: string,
  currentYear: number
): Promise<EventbriteEvent[]> {
  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `You are an expert at extracting event information from Eventbrite organizer pages.
Extract all upcoming events from the page content.

Today's date is ${today}. The current year is ${currentYear}.

For each event, extract:
- title: The event title
- description: Brief description (max 300 chars)
- start_time: ISO 8601 datetime
- end_time: ISO 8601 datetime if available
- location: Physical location/venue
- event_url: Full Eventbrite event URL
- image_url: Event image URL if available
- external_id: Eventbrite event ID (the numeric ID from the URL)

Rules:
- Only extract events with dates today or in the future
- If year not specified, use ${currentYear}
- Skip past events`;

  const userPrompt = `Extract all upcoming events from this Eventbrite organizer page:

${markdown.slice(0, 15000)}

Organizer URL: ${organizerUrl}

Return a JSON array of events.`;

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
              description: 'Extract events from page content',
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
                        event_url: { type: 'string' },
                        image_url: { type: 'string' },
                        external_id: { type: 'string' },
                      },
                      required: ['title', 'start_time', 'external_id'],
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
      console.error('AI extraction error:', response.status);
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

    // Parse request body
    const body = await req.json();
    const { club_id, organizer_url, sync_all } = body;

    // If sync_all is true, sync all clubs with eventbrite URLs
    if (sync_all) {
      console.log('Running scheduled sync for all clubs with Eventbrite URLs...');
      
      const { data: clubs, error: clubsError } = await externalSupabase
        .from('clubs')
        .select('id, name, eventbrite_organizer_url')
        .not('eventbrite_organizer_url', 'is', null)
        .neq('eventbrite_organizer_url', '');

      if (clubsError) {
        console.error('Error fetching clubs:', clubsError);
        return new Response(JSON.stringify({ success: false, error: 'Failed to fetch clubs' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const results = [];
      for (const club of clubs || []) {
        console.log(`Syncing club: ${club.name} (${club.id})`);
        const result = await syncClubEvents(
          externalSupabase,
          club.id,
          club.eventbrite_organizer_url,
          FIRECRAWL_API_KEY,
          LOVABLE_API_KEY
        );
        results.push({ club_id: club.id, club_name: club.name, ...result });
        
        // Rate limiting between clubs
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return new Response(JSON.stringify({
        success: true,
        clubs_synced: results.length,
        results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single club sync
    if (!club_id || !organizer_url) {
      return new Response(JSON.stringify({ success: false, error: 'club_id and organizer_url are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate the organizer URL format
    const organizerId = extractOrganizerId(organizer_url);
    if (!organizerId && !organizer_url.includes('eventbrite.com/o/')) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid Eventbrite organizer URL. Expected format: https://www.eventbrite.com/o/ORGANIZER-NAME-123456 or https://www.eventbrite.com/o/123456' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update club status to syncing
    await externalSupabase
      .from('clubs')
      .update({
        eventbrite_sync_status: 'syncing',
        eventbrite_sync_error: null,
      })
      .eq('id', club_id);

    const result = await syncClubEvents(
      externalSupabase,
      club_id,
      organizer_url,
      FIRECRAWL_API_KEY,
      LOVABLE_API_KEY
    );

    // Update club with sync result
    await externalSupabase
      .from('clubs')
      .update({
        eventbrite_organizer_url: organizer_url,
        eventbrite_sync_status: result.success ? 'success' : 'error',
        eventbrite_sync_error: result.error || null,
        eventbrite_last_synced_at: result.success ? new Date().toISOString() : null,
      })
      .eq('id', club_id);

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

async function syncClubEvents(
  externalSupabase: ReturnType<typeof createClient>,
  clubId: string,
  organizerUrl: string,
  firecrawlKey: string,
  lovableKey: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    eventsFound: 0,
    eventsCreated: 0,
    eventsUpdated: 0,
  };

  try {
    console.log(`Scraping Eventbrite organizer page: ${organizerUrl}`);

    // Scrape the organizer page with Firecrawl
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: organizerUrl,
        formats: ['markdown', 'html'],
        onlyMainContent: false, // Get full page for JSON-LD
        waitFor: 3000, // Wait for dynamic content
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('Firecrawl error:', errorText);
      result.error = 'Failed to fetch organizer page';
      return result;
    }

    const firecrawlData = await firecrawlResponse.json();
    const markdown = firecrawlData.data?.markdown || firecrawlData.markdown || '';
    const html = firecrawlData.data?.html || firecrawlData.html || '';

    if (!markdown && !html) {
      result.error = 'No content found on organizer page';
      return result;
    }

    console.log(`Got ${markdown.length} chars of markdown, ${html.length} chars of HTML`);

    // Try to extract events from JSON-LD first
    let events = parseJsonLdEvents(html);
    console.log(`Found ${events.length} events from JSON-LD`);

    // If no JSON-LD events, use AI extraction
    if (events.length === 0) {
      const currentYear = new Date().getFullYear();
      events = await extractEventsWithAI(markdown, organizerUrl, lovableKey, currentYear);
      console.log(`Found ${events.length} events from AI extraction`);
    }

    result.eventsFound = events.length;

    if (events.length === 0) {
      result.success = true; // Not an error, just no events found
      return result;
    }

    // Get today's date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process each event
    for (const event of events) {
      try {
        // Skip past events
        const eventDate = new Date(event.start_time);
        if (eventDate < today) {
          console.log(`Skipping past event: ${event.title}`);
          continue;
        }

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
          club_id: clubId,
          club_handle: clubId,
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

        // Rate limiting between events
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (eventError) {
        console.error(`Error processing event:`, eventError);
      }
    }

    result.success = true;
    console.log(`Sync complete: ${result.eventsCreated} created, ${result.eventsUpdated} updated`);
    return result;

  } catch (error) {
    console.error('Sync error:', error);
    result.error = error instanceof Error ? error.message : 'Sync failed';
    return result;
  }
}
