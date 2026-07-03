/**
 * auto-event-sync — pulls upcoming events from calendar.ucsd.edu (Localist)
 * and upserts them into the external events table.
 * Deduplicates via external_id = 'ucsd-localist-{localist_event_id}'.
 */
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXT_URL = 'https://tayhvgmterjzolvodwow.supabase.co';
const EXT_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheWh2Z210ZXJqem9sdm9kd293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTExODIsImV4cCI6MjA4NDI2NzE4Mn0.QUBp8guzuSsRh_9hpVOsqsGFlRn7IO6adwZRMRL8UHI';
const EXT_HDR = {
  apikey: EXT_KEY,
  Authorization: `Bearer ${EXT_KEY}`,
  'Content-Type': 'application/json',
};

const UCSD_API = 'https://calendar.ucsd.edu/api/2/events';

// ── Fetch one page from the UCSD Localist calendar ────────────────────────────

async function fetchPage(page: number, days: number): Promise<any[]> {
  const url = `${UCSD_API}?days=${days}&pp=100&page=${page}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.events ?? []).map((w: any) => w.event);
}

// ── Fetch all clubs for group→club matching ───────────────────────────────────

let _clubCache: { id: string; name: string }[] | null = null;

async function getClubs(): Promise<{ id: string; name: string }[]> {
  if (_clubCache) return _clubCache;
  const res = await fetch(`${EXT_URL}/rest/v1/clubs?select=id,name&limit=1000`, {
    headers: EXT_HDR,
  });
  if (!res.ok) return [];
  _clubCache = await res.json();
  return _clubCache!;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function matchClub(groups: { name: string }[]): Promise<string | null> {
  if (!groups?.length) return null;
  const clubs = await getClubs();
  for (const { name: gName } of groups) {
    const gNorm = normalize(gName);
    const match = clubs.find((c) => normalize(c.name) === gNorm);
    if (match) return match.id;
    // Partial — group name contains club name or vice versa
    const partial = clubs.find((c) => {
      const cNorm = normalize(c.name);
      return gNorm.includes(cNorm) || cNorm.includes(gNorm);
    });
    if (partial) return partial.id;
  }
  return null;
}

// ── Parse a Localist event into our DB row ────────────────────────────────────

interface EventRow {
  title: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  source: string;
  source_url: string;
  external_id: string;
  image_url: string | null;
  caption: string | null;
  club_id: string | null;
  verified: boolean;
  posted_at: string;
}

async function parseEvent(ev: any): Promise<EventRow | null> {
  const instance = ev.event_instances?.[0]?.event_instance;
  if (!instance?.start) return null;

  const clubId = await matchClub(ev.groups ?? []);

  return {
    title: ev.title ?? 'Untitled',
    start_time: instance.start,
    end_time: instance.end ?? null,
    location: ev.location_name ?? null,
    source: 'ucsd_calendar',
    source_url: ev.localist_url ?? `https://calendar.ucsd.edu/event/${ev.urlname ?? ev.id}`,
    external_id: `ucsd-localist-${ev.id}`,
    image_url: ev.photo_url ?? null,
    caption: ev.description_text ? ev.description_text.slice(0, 2000) : null,
    club_id: clubId,
    verified: false,
    posted_at: new Date().toISOString(),
  };
}

// ── Upsert (skip existing external_ids in bulk) ───────────────────────────────

async function getExistingIds(externalIds: string[]): Promise<Set<string>> {
  if (!externalIds.length) return new Set();
  // Query in batches of 100
  const existing = new Set<string>();
  for (let i = 0; i < externalIds.length; i += 100) {
    const batch = externalIds.slice(i, i + 100);
    const filter = batch.map((id) => encodeURIComponent(id)).join(',');
    const res = await fetch(
      `${EXT_URL}/rest/v1/events?select=external_id&external_id=in.(${filter})`,
      { headers: EXT_HDR }
    );
    if (!res.ok) continue;
    const rows: { external_id: string }[] = await res.json();
    rows.forEach((r) => existing.add(r.external_id));
  }
  return existing;
}

async function bulkInsert(
  rows: EventRow[]
): Promise<{ inserted: number; errored: number; skipped: number }> {
  if (!rows.length) return { inserted: 0, errored: 0, skipped: 0 };
  // Insert in batches of 50. Uses upsert with on_conflict so a duplicate
  // external_id is skipped at the DB level instead of failing the whole batch.
  let inserted = 0;
  let errored = 0;
  let skipped = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const res = await fetch(`${EXT_URL}/rest/v1/events?on_conflict=external_id`, {
      method: 'POST',
      headers: {
        ...EXT_HDR,
        // resolution=ignore-duplicates → existing external_ids are skipped,
        // new rows in the same batch still insert.
        Prefer: 'return=minimal,resolution=ignore-duplicates',
      },
      body: JSON.stringify(batch),
    });
    if (res.ok) {
      inserted += batch.length;
    } else {
      const err = await res.text();
      // 23505 = duplicate key. Treat as skipped (already synced), not a failure.
      if (err.includes('23505') || err.includes('duplicate key')) {
        skipped += batch.length;
      } else {
        console.error('Insert error:', err.slice(0, 200));
        errored += batch.length;
      }
    }
  }
  return { inserted, errored, skipped };
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body.dry_run === true;
    const days: number = Math.min(body.days ?? 60, 90);

    // 1. Discover total pages
    const firstPageUrl = `${UCSD_API}?days=${days}&pp=100&page=1`;
    const firstRes = await fetch(firstPageUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!firstRes.ok) throw new Error(`UCSD calendar API returned ${firstRes.status}`);
    const firstData = await firstRes.json();
    const totalPages: number = firstData.page?.total ?? 1;
    const firstEvents: any[] = (firstData.events ?? []).map((w: any) => w.event);

    // 2. Fetch remaining pages (up to 10 pages = 1000 events max per run)
    const maxPages = Math.min(totalPages, 10);
    const allRawEvents: any[] = [...firstEvents];
    for (let p = 2; p <= maxPages; p++) {
      const more = await fetchPage(p, days);
      allRawEvents.push(...more);
    }

    // 3. Parse into row objects
    const parsed: EventRow[] = [];
    for (const ev of allRawEvents) {
      const row = await parseEvent(ev);
      if (row) parsed.push(row);
    }

    // 4. Filter out events that already exist
    const allIds = parsed.map((r) => r.external_id);
    const existingIds = await getExistingIds(allIds);
    const newRows = parsed.filter((r) => !existingIds.has(r.external_id));

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dryRun: true,
          pagesScanned: maxPages,
          eventsFound: parsed.length,
          alreadyExist: existingIds.size,
          wouldInsert: newRows.length,
          sample: newRows
            .slice(0, 3)
            .map((r) => ({ title: r.title, start_time: r.start_time, club_id: r.club_id })),
        }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Insert new events
    const { inserted, errored, skipped } = await bulkInsert(newRows);

    return new Response(
      JSON.stringify({
        success: true,
        pagesScanned: maxPages,
        eventsFound: parsed.length,
        alreadyExist: existingIds.size,
        inserted,
        errored,
        skipped,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
