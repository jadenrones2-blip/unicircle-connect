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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const internalUrl = Deno.env.get("SUPABASE_URL")!;
    const internalAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const internalServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authSupabase = createClient(internalUrl, internalAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSupabase = createClient(internalUrl, internalServiceKey);
    const { data: isAdmin } = await adminSupabase.rpc('has_role', {
      _user_id: user.id, _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const rawExternalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL') || '';
    const EXTERNAL_SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');

    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY not configured. Connect Firecrawl in Settings.');
    }
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    if (!rawExternalUrl || !EXTERNAL_SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('External database credentials not configured');
    }

    const externalUrl = normalizeExternalUrl(rawExternalUrl);
    if (!externalUrl) throw new Error('Invalid EXTERNAL_SUPABASE_URL format');

    console.log('Using external URL:', externalUrl);
    const externalSupabase = createClient(externalUrl, EXTERNAL_SUPABASE_SERVICE_ROLE_KEY);

    // Fetch clubs
    const { data: clubs, error: clubsError } = await externalSupabase
      .from('clubs').select('id, name').limit(500);
    if (clubsError) throw new Error('Failed to fetch clubs from external database');

    const cleanClubs = (clubs || [])
      .map((c: Club) => ({ id: c.id, name: c.name?.replace(/\n/g, ' ').trim() || '' }))
      .filter((c: Club) => c.name.length > 2);

    console.log(`Found ${cleanClubs.length} clubs`);

    const result: ScrapeResult & { clubBreakdown?: Record<string, number> } = {
      clubsSearched: 0, eventsExtracted: 0, errors: [],
    };
    const clubBreakdown: Record<string, number> = {};

    const today = new Date();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const currentMonth = monthNames[today.getMonth()];
    const currentYear = today.getFullYear();

    const clubNames = cleanClubs.slice(0, 50).map((c: Club) => c.name);
    result.clubsSearched = clubNames.length;

    // ============ USE FIRECRAWL SEARCH ============
    console.log('Searching for UCSD club events via Firecrawl...');

    const searchQuery = `UCSD UC San Diego student club events ${currentMonth} ${currentYear} upcoming campus`;

    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
        tbs: 'qdr:w', // last week
        scrapeOptions: { formats: ['markdown'] },
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('Firecrawl search error:', errorText);
      return new Response(JSON.stringify({
        success: false, error: 'Web search failed', ...result,
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const searchData = await firecrawlResponse.json();
    const searchResults = searchData.data || [];

    console.log(`Firecrawl returned ${searchResults.length} results`);

    if (searchResults.length === 0) {
      return new Response(JSON.stringify({
        success: true, message: 'No events found in search results', ...result,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Combine markdown from all results
    const combinedContent = searchResults
      .map((r: any) => `Source: ${r.url || 'unknown'}\n${r.markdown || r.description || ''}`)
      .join('\n\n---\n\n');

    const citations = searchResults.map((r: any) => r.url).filter(Boolean);

    // Use AI to extract structured events
    const events = await extractEventsWithAI(combinedContent, cleanClubs, LOVABLE_API_KEY, currentYear);
    console.log(`Extracted ${events.length} events`);

    // Stop words excluded from matching
    const MATCH_STOP = new Set(['the','and','for','with','this','that','from','club','ucsd','university','california','san','diego','association','student','organization']);

    function matchWords(a: string, b: string): number {
      const words = (s: string) => new Set(
        s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !MATCH_STOP.has(w))
      );
      const wa = words(a); const wb = words(b);
      if (!wa.size || !wb.size) return 0;
      let hits = 0;
      for (const w of wa) { if (wb.has(w) || [...wb].some(t => t.includes(w) || w.includes(t))) hits++; }
      return hits / wa.size;
    }

    // Insert events
    for (const event of events) {
      try {
        // Use word-overlap scoring instead of simple substring match
        const searchText = [event.club_name, event.title].filter(Boolean).join(' ');
        let bestClub: Club | null = null;
        let bestScore = 0;
        for (const club of cleanClubs) {
          const score = matchWords(club.name, searchText);
          if (score > bestScore) { bestScore = score; bestClub = club; }
        }
        const matchingClub = bestScore >= 0.45 ? bestClub : null;

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

        const { error: insertError } = await externalSupabase.from('events').insert(eventRecord);

        if (insertError) {
          console.error('Insert error:', insertError);
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

    result.clubBreakdown = clubBreakdown;

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(JSON.stringify({
      success: false, error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function extractEventsWithAI(
  searchContent: string, clubs: Club[], apiKey: string, currentYear: number
): Promise<ExtractedEvent[]> {
  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `You extract upcoming event info from search results.
Today is ${today}. Year: ${currentYear}.
Extract: title, description, start_time (ISO 8601, Pacific TZ, default 6PM), end_time (optional), location, club_name.
Only extract real upcoming events. Skip past events. Use ${currentYear} if year missing.`;

  const userPrompt = `Extract UCSD events from:\n\n${searchContent.slice(0, 10000)}\n\nKnown clubs: ${clubs.slice(0, 30).map(c => c.name).join(', ')}\n\nReturn JSON array. Empty [] if none.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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
      console.error('AI extraction error:', await response.text());
      return [];
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      return JSON.parse(toolCall.function.arguments).events || [];
    }
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error('AI extraction failed:', error);
    return [];
  }
}
