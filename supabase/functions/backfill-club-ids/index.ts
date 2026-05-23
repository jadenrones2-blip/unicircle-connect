/**
 * backfill-club-ids
 * Fixes events with club_id=null using three matching strategies.
 * Uses direct REST calls (no supabase-js npm import) to stay within worker limits.
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXT = 'https://tayhvgmterjzolvodwow.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheWh2Z210ZXJqem9sdm9kd293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTExODIsImV4cCI6MjA4NDI2NzE4Mn0.QUBp8guzuSsRh_9hpVOsqsGFlRn7IO6adwZRMRL8UHI';

const HDRS = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STOP = new Set(['the','and','for','with','club','ucsd','university','california','san','diego','association','student','organization','society']);

function keywords(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
}

function overlap(clubName: string, target: string): number {
  const cw = new Set(keywords(clubName));
  const tw = new Set(keywords(target));
  if (!cw.size || !tw.size) return 0;
  let hits = 0;
  for (const w of cw) { if (tw.has(w) || [...tw].some(t => t.includes(w) || w.includes(t))) hits++; }
  return hits / cw.size;
}

async function get(path: string) {
  const r = await fetch(`${EXT}/rest/v1/${path}`, { headers: HDRS });
  return r.json();
}

async function patch(path: string, body: Record<string, unknown>) {
  const r = await fetch(`${EXT}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...HDRS, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  return r.ok;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit ?? 200, 500);
    const offset = body.offset ?? 0;

    // Fetch clubs
    const clubs: any[] = await get(`clubs?select=id,name,instagram&limit=1000`);

    // Build lookups
    const uuidMap = new Map(clubs.map((c: any) => [c.id, c.id]));
    const igMap = new Map<string, string>();
    for (const c of clubs) {
      if (!c.instagram) continue;
      const m = c.instagram.match(/(?:instagram\.com\/)?@?([A-Za-z0-9_.]+)\/?$/);
      if (m) igMap.set(m[1].toLowerCase(), c.id);
    }

    // Fetch unmatched events
    const events: any[] = await get(
      `events?select=id,title,caption,club_handle&club_id=is.null&limit=${limit}&offset=${offset}`
    );

    let matched = 0;
    const strategies = { uuid: 0, instagram: 0, name: 0 };

    for (const ev of events) {
      const handle = (ev.club_handle ?? '').trim();
      let clubId: string | null = null;
      let strategy = '';

      // Strategy 1: club_handle is already a club UUID
      if (!clubId && UUID_RE.test(handle) && uuidMap.has(handle)) {
        clubId = handle; strategy = 'uuid';
      }

      // Strategy 2: club_handle is an Instagram handle
      if (!clubId && handle && /^[A-Za-z0-9_.]{2,50}$/.test(handle)) {
        const found = igMap.get(handle.toLowerCase());
        if (found) { clubId = found; strategy = 'instagram'; }
      }

      // Strategy 3: word-overlap against club name using handle + title + caption
      if (!clubId) {
        const text = [handle, ev.title, ev.caption].filter(Boolean).join(' ');
        let best: any = null; let bestScore = 0;
        for (const c of clubs) {
          const s = overlap(c.name, text);
          if (s > bestScore) { bestScore = s; best = c; }
        }
        if (best && bestScore >= 0.45) { clubId = best.id; strategy = 'name'; }
      }

      if (clubId) {
        const ok = await patch(`events?id=eq.${ev.id}`, { club_id: clubId });
        if (ok) { matched++; strategies[strategy as keyof typeof strategies]++; }
      }
    }

    return new Response(
      JSON.stringify({ total: events.length, matched, unmatched: events.length - matched, strategies, offset, nextOffset: offset + limit, done: events.length < limit }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
