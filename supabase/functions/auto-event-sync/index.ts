/**
 * auto-event-sync
 *
 * Scheduled event pipeline — runs without user auth so it can be triggered
 * by a remote cron agent. Processes clubs in batches to avoid timeouts.
 *
 * Flow:
 * 1. Fetch clubs with Instagram handles (batch of N, offset via query param)
 * 2. For each club, scrape Instagram via proxy viewers + Firecrawl
 * 3. Claude extracts structured events from scraped content
 * 4. Upsert events into the external DB with correct club_id
 * 5. Return summary — the scheduler calls repeatedly with offset until done
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXT_URL = 'https://tayhvgmterjzolvodwow.supabase.co';
const EXT_KEY = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheWh2Z210ZXJqem9sdm9kd293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTExODIsImV4cCI6MjA4NDI2NzE4Mn0.QUBp8guzuSsRh_9hpVOsqsGFlRn7IO6adwZRMRL8UHI';

const EXT_HDR = { apikey: EXT_KEY, Authorization: `Bearer ${EXT_KEY}`, 'Content-Type': 'application/json' };

// ── Scrape Instagram via proxy viewers ────────────────────────────────────────

async function scrapeInstagram(handle: string, firecrawlKey: string): Promise<string> {
  const sources = [
    `https://www.picnob.com/profile/${handle}/`,
    `https://imginn.com/${handle}/`,
    `https://instagram.com/${handle}/`,
  ];

  let best = '';
  for (const url of sources) {
    try {
      const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, waitFor: 4000 }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = data.data?.markdown || data.markdown || '';
      if (text.length > best.length) best = text;
    } catch { /* try next source */ }
    if (best.length > 300) break;
  }
  return best;
}

// ── Claude event extractor ────────────────────────────────────────────────────

interface ExtractedEvent {
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  location?: string;
}

async function extractEvents(
  content: string,
  clubName: string,
  anthropicKey: string,
): Promise<ExtractedEvent[]> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const year = today.getFullYear();

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: `You extract upcoming UCSD club events from scraped Instagram content.
Today: ${todayStr}. Timezone: Pacific (UTC-7 summer, UTC-8 winter).
Club: "${clubName}"

Rules:
- Only return events on or after ${todayStr}
- Compute relative dates ("this Friday", "tomorrow") from today
- Default time if missing: 18:00:00. Default year: ${year}
- Skip past events, recruitment posts, shoutouts, and posts without a specific date
- Output ISO 8601: YYYY-MM-DDTHH:MM:SS (no timezone suffix)
- Return ONLY a JSON array. Empty [] if no events found. No explanation.

Format: [{"title":"...","description":"1-2 sentences","start_time":"ISO","end_time":"ISO or null","location":"...or null"}]`,
      messages: [{
        role: 'user',
        content: `Extract upcoming events for ${clubName}:\n\n${content.slice(0, 8000)}`,
      }],
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) return [];
  const data = await res.json();
  const raw = data.content?.[0]?.text ?? '[]';
  try {
    const arr = JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0] ?? '[]');
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

// ── Upsert events ─────────────────────────────────────────────────────────────

async function upsertEvent(event: ExtractedEvent, clubId: string, handle: string): Promise<boolean> {
  // Check for duplicates (same club + title + same day)
  const day = event.start_time.split('T')[0];
  const checkRes = await fetch(
    `${EXT_URL}/rest/v1/events?club_id=eq.${clubId}&title=ilike.${encodeURIComponent(event.title)}&start_time=gte.${day}T00%3A00%3A00&start_time=lte.${day}T23%3A59%3A59&select=id&limit=1`,
    { headers: EXT_HDR }
  );
  const existing = await checkRes.json();
  if (Array.isArray(existing) && existing.length > 0) return false; // duplicate

  const insertRes = await fetch(`${EXT_URL}/rest/v1/events`, {
    method: 'POST',
    headers: { ...EXT_HDR, Prefer: 'return=minimal' },
    body: JSON.stringify({
      title: event.title,
      start_time: event.start_time,
      end_time: event.end_time || null,
      location: event.location || null,
      club_id: clubId,
      club_handle: handle,
      source: 'instagram_auto',
      source_url: `https://instagram.com/${handle}/`,
      verified: false,
      caption: event.description,
      posted_at: new Date().toISOString(),
    }),
  });
  return insertRes.ok;
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const FIRECRAWL_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');

    if (!FIRECRAWL_KEY) throw new Error('FIRECRAWL_API_KEY not set');
    if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not set');

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(body.batch_size ?? 15, 30);
    const offset = body.offset ?? 0;

    // Fetch clubs with Instagram handles
    const clubsRes = await fetch(
      `${EXT_URL}/rest/v1/clubs?select=id,name,instagram&instagram=not.is.null&instagram=neq.&order=name&limit=${batchSize}&offset=${offset}`,
      { headers: EXT_HDR }
    );
    const clubs: any[] = await clubsRes.json();

    if (!Array.isArray(clubs) || clubs.length === 0) {
      return new Response(
        JSON.stringify({ done: true, clubsProcessed: 0, eventsAdded: 0 }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    let eventsAdded = 0;
    let clubsProcessed = 0;
    const errors: string[] = [];

    for (const club of clubs) {
      try {
        const raw = club.instagram ?? '';
        const m = raw.match(/(?:instagram\.com\/)?@?([A-Za-z0-9_.]+)\/?$/);
        if (!m) continue;
        const handle = m[1].toLowerCase();

        console.log(`Scraping @${handle} (${club.name})`);
        const content = await scrapeInstagram(handle, FIRECRAWL_KEY);
        if (content.length < 50) { console.log(`No content for ${club.name}`); continue; }

        const events = await extractEvents(content, club.name, ANTHROPIC_KEY);
        console.log(`${events.length} events extracted from ${club.name}`);

        for (const ev of events) {
          if (await upsertEvent(ev, club.id, handle)) eventsAdded++;
        }
        clubsProcessed++;
      } catch (err) {
        errors.push(`${club.name}: ${err}`);
        console.error(`Error on ${club.name}:`, err);
      }

      // Small breathe between clubs
      await new Promise(r => setTimeout(r, 500));
    }

    return new Response(
      JSON.stringify({
        done: clubs.length < batchSize,
        clubsProcessed,
        eventsAdded,
        offset,
        nextOffset: offset + batchSize,
        errors: errors.slice(0, 5),
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
