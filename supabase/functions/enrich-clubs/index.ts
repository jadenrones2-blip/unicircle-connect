import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ANTHROPIC_KEY   = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const EXTERNAL_URL    = 'https://tayhvgmterjzolvodwow.supabase.co';
const EXTERNAL_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheWh2Z210ZXJqem9sdm9kd293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTExODIsImV4cCI6MjA4NDI2NzE4Mn0.QUBp8guzuSsRh_9hpVOsqsGFlRn7IO6adwZRMRL8UHI';
const MAIN_URL        = Deno.env.get('SUPABASE_URL') ?? '';
const MAIN_SVC_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Instagram profile photo via og:image ──────────────────────────────────────
async function fetchInstagramPhoto(handle: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<meta property="og:image" content="([^"]+)"/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

// ── Claude enrichment for a batch of clubs ────────────────────────────────────
async function enrichBatch(clubs: any[]): Promise<any[]> {
  const clubList = clubs.map((c, i) => `
Club ${i + 1}:
Name: ${c.name}
Category: ${c.category_bucket || c.category || 'Unknown'}
Description: ${c.description || 'No description available'}
Instagram: ${c.instagram ? '@' + c.instagram : 'None'}
Website: ${c.website || 'None'}
  `.trim()).join('\n\n---\n\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are enriching club profiles for UniCircle, a UCSD student club discovery platform.

For each club below, generate a structured profile. Return a JSON array — one object per club, in the same order.

${clubList}

Each object must have exactly these fields:
{
  "one_liner": "One sentence capturing what this club is. Specific, not generic. Written like a friend describing it to you.",
  "what_they_do": "2-3 sentences on what members actually spend their time doing — projects, events, competitions, meetings. Concrete and specific.",
  "who_should_join": "1-2 sentences on who fits best. Mention interests, goals, or major/year if relevant.",
  "vibe": "3 words max describing the club culture. E.g. 'competitive, tight-knit, ambitious' or 'chill, inclusive, creative'",
  "time_commitment": "Light, Medium, or Heavy",
  "highlights": ["up to 3 interesting or impressive facts about this club"],
  "tags": ["up to 5 keywords a student might search to find this club"]
}

Rules:
- Only use info from the description provided. Do not invent facts.
- If data is too thin for a field, use null.
- Return ONLY a valid JSON array. No explanation, no markdown.`,
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

  // Auth check
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401, headers: CORS });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const limit  = Math.min(body.limit ?? 100, 500);
    const offset = body.offset ?? 0;

    // Fetch clubs from external DB
    const clubsRes = await fetch(
      `${EXTERNAL_URL}/rest/v1/clubs?select=id,name,category,category_bucket,description,instagram,website&order=name&limit=${limit}&offset=${offset}`,
      { headers: { apikey: EXTERNAL_KEY, Authorization: `Bearer ${EXTERNAL_KEY}` } }
    );
    const clubs: any[] = await clubsRes.json();

    if (!clubs?.length) {
      return new Response(JSON.stringify({ processed: 0, done: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const BATCH = 10;
    let processed = 0;

    for (let i = 0; i < clubs.length; i += BATCH) {
      const batch = clubs.slice(i, i + BATCH);

      // Fetch Instagram photos in parallel — failures are silent
      const photoResults = await Promise.allSettled(
        batch.map((c: any) => c.instagram ? fetchInstagramPhoto(c.instagram) : Promise.resolve(null))
      );

      // Enrich with Claude
      const enrichments = await enrichBatch(batch);

      // Build upsert rows
      const rows = batch.map((club: any, idx: number) => ({
        club_id: String(club.id),
        one_liner:         enrichments[idx]?.one_liner ?? null,
        what_they_do:      enrichments[idx]?.what_they_do ?? null,
        who_should_join:   enrichments[idx]?.who_should_join ?? null,
        vibe:              enrichments[idx]?.vibe ?? null,
        time_commitment:   enrichments[idx]?.time_commitment ?? null,
        highlights:        enrichments[idx]?.highlights ?? null,
        tags:              enrichments[idx]?.tags ?? null,
        instagram_photo_url:
          photoResults[idx].status === 'fulfilled' ? photoResults[idx].value : null,
        enriched_at: new Date().toISOString(),
        updated_at:  new Date().toISOString(),
      }));

      // Upsert to main DB
      await fetch(`${MAIN_URL}/rest/v1/club_enrichments`, {
        method: 'POST',
        headers: {
          apikey: MAIN_SVC_KEY,
          Authorization: `Bearer ${MAIN_SVC_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(rows),
      });

      processed += batch.length;

      // Breathe between batches
      if (i + BATCH < clubs.length) {
        await new Promise(r => setTimeout(r, 400));
      }
    }

    return new Response(
      JSON.stringify({ processed, offset, nextOffset: offset + limit, done: clubs.length < limit }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('enrich-clubs error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
