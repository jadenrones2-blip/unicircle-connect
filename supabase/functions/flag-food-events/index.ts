import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const EXTERNAL_URL  = 'https://tayhvgmterjzolvodwow.supabase.co';
const EXTERNAL_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheWh2Z210ZXJqem9sdm9kd293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTExODIsImV4cCI6MjA4NDI2NzE4Mn0.QUBp8guzuSsRh_9hpVOsqsGFlRn7IO6adwZRMRL8UHI';
const MAIN_URL      = Deno.env.get('SUPABASE_URL') ?? '';
const MAIN_SVC_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Classify a batch of events for food mentions ──────────────────────────────
async function classifyBatch(events: { id: string; text: string }[]): Promise<any[]> {
  const list = events.map((e, i) =>
    `Event ${i + 1} (id: ${e.id}):\n${e.text.slice(0, 400)}`
  ).join('\n\n---\n\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are analyzing Instagram event posts from UCSD student clubs to detect if they mention free food being provided at the event.

For each event below, determine if food is being offered to attendees (not just a mention of food as a topic).

${list}

Return a JSON array — one object per event in the same order:
{
  "id": "event id",
  "has_food": true or false,
  "confidence": "high" | "medium" | "low",
  "food_mention": "exact phrase or null if no food"
}

Examples of HAS food: "free pizza", "boba provided", "we'll have snacks", "food will be served", "come hungry", "refreshments", "free tacos"
Examples of NO food: "food science club meeting", "talking about nutrition", "food drive donations"

Return ONLY valid JSON array. No explanation.`,
      }],
    }),
  });

  const data = await res.json();
  const raw = data.content?.[0]?.text ?? '[]';
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\[[\s\S]+\]/);
    try { return match ? JSON.parse(match[0]) : []; }
    catch { return []; }
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401, headers: CORS });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const limit  = Math.min(body.limit ?? 200, 500);
    const offset = body.offset ?? 0;

    // Fetch events with captions from external DB
    const eventsRes = await fetch(
      `${EXTERNAL_URL}/rest/v1/events?select=id,title,caption,description&verified=eq.true&order=start_time.desc&limit=${limit}&offset=${offset}`,
      { headers: { apikey: EXTERNAL_KEY, Authorization: `Bearer ${EXTERNAL_KEY}` } }
    );
    const events: any[] = await eventsRes.json();

    if (!events?.length) {
      return new Response(JSON.stringify({ processed: 0, done: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Only process events that have actual caption/description text
    const withText = events
      .filter(e => (e.caption || e.description || e.title)?.trim())
      .map(e => ({
        id: String(e.id),
        text: [e.title, e.caption, e.description].filter(Boolean).join(' '),
      }));

    if (!withText.length) {
      return new Response(JSON.stringify({ processed: 0, done: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Process in batches of 20
    const BATCH = 20;
    const allResults: any[] = [];

    for (let i = 0; i < withText.length; i += BATCH) {
      const batch = withText.slice(i, i + BATCH);
      const results = await classifyBatch(batch);
      allResults.push(...results);
      if (i + BATCH < withText.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // Upsert to main DB
    if (allResults.length) {
      const rows = allResults
        .filter(r => r?.id)
        .map(r => ({
          event_id: r.id,
          has_food: r.has_food ?? false,
          confidence: r.confidence ?? 'low',
          food_mention: r.food_mention ?? null,
          flagged_at: new Date().toISOString(),
        }));

      await fetch(`${MAIN_URL}/rest/v1/event_food_flags`, {
        method: 'POST',
        headers: {
          apikey: MAIN_SVC_KEY,
          Authorization: `Bearer ${MAIN_SVC_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(rows),
      });
    }

    const foodCount = allResults.filter(r => r?.has_food).length;

    return new Response(
      JSON.stringify({ processed: allResults.length, food_events_found: foodCount, offset, nextOffset: offset + limit, done: events.length < limit }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('flag-food-events error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
