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

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ── Strip HTML to plain text ──────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000); // cap so we don't blow up Claude context
}

// ── Scrape a club website ─────────────────────────────────────────────────────
async function scrapeWebsite(url: string): Promise<string | null> {
  try {
    if (!url.startsWith('http')) url = 'https://' + url;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Pull meta description first — often the best single-line summary
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ?? '';
    const ogDesc   = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1] ?? '';
    const title    = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? '';
    const bodyText = stripHtml(html);

    return [title, metaDesc || ogDesc, bodyText].filter(Boolean).join('\n').slice(0, 3000);
  } catch {
    return null;
  }
}

// ── Scrape Instagram profile — bio + photo + recent post captions ─────────────
interface InstagramData {
  photo: string | null;
  bio: string | null;
  posts: string[];
}

async function scrapeInstagram(handle: string): Promise<InstagramData> {
  const empty: InstagramData = { photo: null, bio: null, posts: [] };
  try {
    const res = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return empty;
    const html = await res.text();

    // Profile photo
    const photo = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? null;

    // Bio from og:description
    const bio = html.match(/<meta property="og:description" content="([^"]+)"/)?.[1]
      ?? html.match(/<meta name="description" content="([^"]+)"/)?.[1]
      ?? null;

    // Try to extract post captions from the embedded JSON blob Instagram puts in the page
    const posts: string[] = [];
    const jsonMatch = html.match(/window\._sharedData\s*=\s*(\{.+?\});<\/script>/s)
      ?? html.match(/"edge_owner_to_timeline_media":\{"edges":\[(.+?)\]}/s);

    if (jsonMatch) {
      try {
        // Pull all caption text snippets — quick regex, no full JSON parse needed
        const captions = [...jsonMatch[0].matchAll(/"text":"([^"]{10,200})"/g)]
          .map(m => m[1])
          .filter(t => !t.includes('\\u') && !t.startsWith('http'))
          .slice(0, 5);
        posts.push(...captions);
      } catch { /* ignore */ }
    }

    return { photo, bio, posts };
  } catch {
    return empty;
  }
}

// ── Build rich context string per club ────────────────────────────────────────
async function buildContext(club: any): Promise<{ context: string; photo: string | null }> {
  const parts: string[] = [];
  let photo: string | null = null;

  parts.push(`Name: ${club.name}`);
  parts.push(`Category: ${club.category_bucket || club.category || 'Unknown'}`);
  if (club.description) parts.push(`Registry description: ${club.description}`);

  // Scrape website and Instagram in parallel
  const [websiteText, igData] = await Promise.all([
    club.website ? scrapeWebsite(club.website) : Promise.resolve(null),
    club.instagram ? scrapeInstagram(club.instagram) : Promise.resolve({ photo: null, bio: null, posts: [] }),
  ]);

  photo = igData.photo;

  if (igData.bio) parts.push(`Instagram bio: ${igData.bio}`);
  if (igData.posts.length) parts.push(`Recent Instagram post captions:\n${igData.posts.map(p => `- ${p}`).join('\n')}`);
  if (websiteText) parts.push(`Website content:\n${websiteText}`);

  return { context: parts.join('\n'), photo };
}

// ── Claude enrichment — one club at a time for max quality ───────────────────
async function enrichOne(context: string): Promise<any> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `You are creating a club profile for UniCircle, a UCSD student club discovery platform. Students use this to decide whether to apply.

Here is everything we know about this club:
---
${context}
---

Generate a JSON object with these fields:
{
  "one_liner": "One punchy sentence that captures exactly what this club is. Written like a friend describing it — specific, not generic. No fluff.",
  "what_they_do": "2-3 sentences on what members actually spend their time doing — real activities, events, projects, competitions. Concrete.",
  "who_should_join": "1-2 sentences on who fits best. Mention specific interests, career goals, or major if relevant.",
  "vibe": "3 words max describing the culture. E.g. 'competitive, tight-knit, driven' or 'chill, welcoming, fun'",
  "time_commitment": "Light, Medium, or Heavy — based on meeting frequency and event load",
  "highlights": ["up to 3 specific impressive or interesting facts about this club"],
  "tags": ["up to 6 keywords a student might search to find this club"]
}

Rules:
- Ground everything in the data provided. Do not invent.
- If data is too thin for a field, return null.
- Return ONLY valid JSON. No explanation, no markdown fences.`,
      }],
    }),
  });

  const data = await res.json();
  const raw = data.content?.[0]?.text ?? '{}';
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]+\}/);
    try { return match ? JSON.parse(match[0]) : {}; }
    catch { return {}; }
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
    const limit  = Math.min(body.limit ?? 50, 500);
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

    const rows = [];

    for (const club of clubs) {
      try {
        // Build rich context by scraping website + Instagram
        const { context, photo } = await buildContext(club);

        // Enrich with Claude
        const enrichment = await enrichOne(context);

        rows.push({
          club_id: String(club.id),
          one_liner:            enrichment.one_liner ?? null,
          what_they_do:         enrichment.what_they_do ?? null,
          who_should_join:      enrichment.who_should_join ?? null,
          vibe:                 enrichment.vibe ?? null,
          time_commitment:      enrichment.time_commitment ?? null,
          highlights:           enrichment.highlights ?? null,
          tags:                 enrichment.tags ?? null,
          instagram_photo_url:  photo,
          enriched_at: new Date().toISOString(),
          updated_at:  new Date().toISOString(),
        });

        // Breathe between clubs to be respectful of rate limits
        await new Promise(r => setTimeout(r, 300));

      } catch (err) {
        console.error(`Failed to enrich club ${club.id}:`, err);
        // Continue — don't let one failure stop the whole batch
      }
    }

    // Upsert all rows to main DB
    if (rows.length) {
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
    }

    return new Response(
      JSON.stringify({ processed: rows.length, offset, nextOffset: offset + limit, done: clubs.length < limit }),
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
