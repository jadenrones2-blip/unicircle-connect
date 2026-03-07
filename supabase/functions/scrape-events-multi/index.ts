import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerplexityEvent {
  title: string;
  date: string;
  time?: string | null;
  location?: string | null;
  description?: string | null;
  organizer?: string | null;
  source_url?: string | null;
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function searchAndExtract(
  query: string,
  domains: string[],
  perplexityKey: string,
  lovableKey: string,
  today: Date,
): Promise<PerplexityEvent[]> {
  const todayStr = today.toISOString().split('T')[0];

  let searchContent = '';
  let citations: string[] = [];

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You find upcoming events for UC San Diego (UCSD) students. Today is ${todayStr}. Only include events after today.`,
          },
          { role: 'user', content: query },
        ],
        search_domain_filter: domains,
        search_recency_filter: 'month',
        return_citations: true,
      }),
    });

    if (!res.ok) {
      console.error(`Perplexity ${res.status}: ${await res.text().catch(() => '')}`);
      return [];
    }

    const data = await res.json();
    searchContent = data.choices?.[0]?.message?.content || '';
    citations = data.citations || [];
    console.log(`Query "${query.slice(0, 60)}..." → ${citations.length} citations`);
  } catch (e) {
    console.error('Perplexity fetch error:', e);
    return [];
  }

  if (!searchContent) return [];

  // Extract structured events from the Perplexity narrative using AI
  try {
    const extractRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Extract all upcoming events from the text. Return ONLY a raw JSON array — no markdown, no backticks. Each item: {"title":"string","date":"YYYY-MM-DD","time":"HH:MM or null","location":"string or null","description":"max 200 chars or null","organizer":"string or null","source_url":"string or null"}. Skip events before ${todayStr}. Return [] if none found.`,
          },
          {
            role: 'user',
            content: `Text:\n${searchContent}\n\nSource URLs: ${citations.slice(0, 10).join('\n')}`,
          },
        ],
        max_tokens: 3000,
      }),
    });

    if (!extractRes.ok) return [];

    const extractData = await extractRes.json();
    let content = extractData.choices?.[0]?.message?.content?.trim() || '';

    // Strip markdown code fences if present
    content = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const events: PerplexityEvent[] = JSON.parse(match[0]);
    return events.filter(e => e.title && e.date);
  } catch (e) {
    console.error('AI extraction error:', e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');

    if (!perplexityKey) throw new Error('PERPLEXITY_API_KEY not configured');
    if (!lovableKey) throw new Error('LOVABLE_API_KEY not configured');
    if (!externalUrl || !externalKey) throw new Error('EXTERNAL_SUPABASE_URL / EXTERNAL_SUPABASE_SERVICE_ROLE_KEY not configured');

    const cleanUrl = externalUrl.trim()
      .replace(/\/(auth|rest|functions)\/v1.*$/i, '')
      .replace(/\/+$/, '');
    const db = createClient(cleanUrl, externalKey);
    const today = new Date();
    const month = today.toLocaleString('default', { month: 'long' });
    const year = today.getFullYear();

    const searches = [
      {
        query: `List all upcoming events for UCSD UC San Diego student clubs and organizations in ${month} ${year}. Include event name, date, time, location, and hosting organization for each.`,
        domains: ['eventbrite.com', 'partiful.com'],
      },
      {
        query: `What UCSD student club events are happening at UC San Diego in the next 60 days in ${year}? List events with specific dates, times, and locations.`,
        domains: ['eventbrite.com', 'lu.ma', 'partiful.com'],
      },
      {
        query: `Find upcoming UCSD Triton student organization workshops, info sessions, mixers, and socials in ${month} ${year}. List specific event dates and venues on campus.`,
        domains: ['eventbrite.com', 'partiful.com'],
      },
    ];

    const allEvents: Array<PerplexityEvent & { dedupeKey: string }> = [];
    const seenKeys = new Set<string>();

    for (const search of searches) {
      const events = await searchAndExtract(
        search.query,
        search.domains,
        perplexityKey,
        lovableKey,
        today,
      );

      for (const ev of events) {
        const key = `${ev.title.toLowerCase().replace(/\s+/g, '')}-${ev.date}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        allEvents.push({ ...ev, dedupeKey: key });
      }

      await delay(400);
    }

    console.log(`Total unique events extracted: ${allEvents.length}`);

    const { data: clubs } = await db.from('clubs').select('id, name').limit(500);

    let inserted = 0;
    let duplicates = 0;
    let errored = 0;

    for (const ev of allEvents) {
      try {
        const startTime = ev.time
          ? `${ev.date}T${ev.time}:00`
          : `${ev.date}T12:00:00`;

        if (new Date(startTime) < today) continue;

        const matchedClub = ev.organizer
          ? (clubs || []).find(c =>
              c.name.toLowerCase().includes(ev.organizer!.toLowerCase()) ||
              ev.organizer!.toLowerCase().includes(c.name.toLowerCase())
            )
          : null;

        const externalId = `plex-${ev.dedupeKey.slice(0, 60)}`;

        const { error } = await db.from('events').upsert({
          title: ev.title,
          caption: ev.description || null,
          start_time: new Date(startTime).toISOString(),
          location: ev.location || null,
          club_id: matchedClub?.id || null,
          club_handle: null,
          source: 'perplexity',
          source_url: ev.source_url || null,
          verified: false,
          posted_at: new Date().toISOString(),
          external_source: 'perplexity',
          external_id: externalId,
        }, { onConflict: 'external_id,external_source', ignoreDuplicates: true });

        if (error) {
          if (error.code === '23505' || error.message?.includes('duplicate')) {
            duplicates++;
          } else {
            console.error('Insert error:', error.message);
            errored++;
          }
        } else {
          inserted++;
        }
      } catch (e) {
        console.error('Event processing error:', e);
        errored++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      searchesRun: searches.length,
      eventsFound: allEvents.length,
      eventsInserted: inserted,
      eventsDuplicate: duplicates,
      eventsErrored: errored,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Multi-platform scraper fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
