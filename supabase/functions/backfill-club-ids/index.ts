/**
 * backfill-club-ids
 *
 * Fixes all events where club_id IS NULL by matching them to clubs using
 * a multi-strategy approach:
 *
 * Strategy 1 — UUID in club_handle: some scrapers stored the club UUID
 *   in club_handle instead of club_id. Copy it over directly.
 *
 * Strategy 2 — Instagram handle in club_handle: look up the club whose
 *   instagram field matches the handle.
 *
 * Strategy 3 — Club name in club_handle OR event title/caption: fuzzy
 *   match against every club name using word-overlap scoring.
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXTERNAL_URL = 'https://tayhvgmterjzolvodwow.supabase.co';
const EXTERNAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheWh2Z210ZXJqem9sdm9kd293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTExODIsImV4cCI6MjA4NDI2NzE4Mn0.QUBp8guzuSsRh_9hpVOsqsGFlRn7IO6adwZRMRL8UHI';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IG_HANDLE_RE = /^[A-Za-z0-9_.]{1,50}$/;

interface Club {
  id: string;
  name: string;
  instagram: string | null;
}

interface Event {
  id: string;
  title: string | null;
  caption: string | null;
  club_handle: string | null;
}

/** Normalize text for comparison */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Extract meaningful words (length > 3, not stop words) */
const STOP = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'will', 'your', 'club', 'ucsd', 'university', 'california', 'san', 'diego']);

function keywords(s: string): Set<string> {
  return new Set(
    norm(s).split(' ').filter((w) => w.length > 3 && !STOP.has(w))
  );
}

/** Score how well a club name matches a target string (0–1) */
function matchScore(clubName: string, target: string): number {
  const clubWords = keywords(clubName);
  const targetWords = keywords(target);
  if (clubWords.size === 0 || targetWords.size === 0) return 0;
  let hits = 0;
  for (const w of clubWords) {
    if (targetWords.has(w) || [...targetWords].some((t) => t.includes(w) || w.includes(t))) hits++;
  }
  return hits / clubWords.size;
}

/** Find best matching club for a text string. Returns null if score < threshold. */
function findBestClub(text: string, clubs: Club[], threshold = 0.45): Club | null {
  let best: Club | null = null;
  let bestScore = 0;
  for (const club of clubs) {
    const score = matchScore(club.name, text);
    if (score > bestScore) { bestScore = score; best = club; }
  }
  return bestScore >= threshold ? best : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const db = createClient(EXTERNAL_URL, EXTERNAL_KEY);

    // Fetch all clubs
    const { data: clubs, error: clubsErr } = await db
      .from('clubs')
      .select('id, name, instagram')
      .limit(1000);
    if (clubsErr) throw new Error(`Clubs fetch: ${clubsErr.message}`);

    // Build instagram handle → club lookup
    const igMap = new Map<string, Club>();
    for (const club of (clubs as Club[])) {
      if (!club.instagram) continue;
      const m = club.instagram.match(/(?:instagram\.com\/)?@?([A-Za-z0-9_.]+)\/?$/);
      if (m) igMap.set(m[1].toLowerCase(), club);
    }

    // Build UUID → club lookup
    const uuidMap = new Map<string, Club>();
    for (const club of (clubs as Club[])) {
      uuidMap.set(club.id, club);
    }

    // Fetch events with no club_id (batch 500)
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit ?? 500, 2000);

    const { data: events, error: evErr } = await db
      .from('events')
      .select('id, title, caption, club_handle')
      .is('club_id', null)
      .limit(limit);
    if (evErr) throw new Error(`Events fetch: ${evErr.message}`);

    let matched = 0;
    let unmatched = 0;
    const strategies: Record<string, number> = { uuid: 0, instagram: 0, name: 0 };

    for (const ev of (events as Event[])) {
      let clubId: string | null = null;
      let strategy = '';

      const handle = ev.club_handle?.trim() ?? '';

      // Strategy 1: club_handle is a UUID → it IS the club_id, just stored wrong
      if (UUID_RE.test(handle) && uuidMap.has(handle)) {
        clubId = handle;
        strategy = 'uuid';
      }

      // Strategy 2: club_handle is an Instagram handle
      if (!clubId && handle && IG_HANDLE_RE.test(handle)) {
        const club = igMap.get(handle.toLowerCase());
        if (club) { clubId = club.id; strategy = 'instagram'; }
      }

      // Strategy 3: fuzzy name match against club_handle or title/caption
      if (!clubId) {
        const searchText = [handle, ev.title, ev.caption].filter(Boolean).join(' ');
        const club = findBestClub(searchText, clubs as Club[]);
        if (club) { clubId = club.id; strategy = 'name'; }
      }

      if (clubId) {
        const { error: updErr } = await db
          .from('events')
          .update({ club_id: clubId })
          .eq('id', ev.id);
        if (!updErr) {
          matched++;
          strategies[strategy] = (strategies[strategy] ?? 0) + 1;
        }
      } else {
        unmatched++;
      }
    }

    return new Response(
      JSON.stringify({ total: (events as Event[]).length, matched, unmatched, strategies }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
