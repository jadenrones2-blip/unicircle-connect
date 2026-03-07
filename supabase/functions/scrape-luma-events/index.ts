import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface LumaGeoAddress {
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  full_address?: string;
}

interface LumaEvent {
  api_id: string;
  name: string;
  description?: string;
  start_at: string;
  end_at?: string;
  cover_url?: string;
  url: string;
  geo_address_info?: LumaGeoAddress;
  timezone?: string;
  event_type?: string;
}

interface LumaCalendarEntry {
  event?: LumaEvent;
}

interface LumaCalendarResponse {
  entries?: LumaCalendarEntry[];
  has_more?: boolean;
  next_cursor?: string;
}

interface LumaDiscoverResponse {
  events?: Array<{ event: LumaEvent; calendar?: { name?: string } }>;
  has_more?: boolean;
  next_cursor?: string;
}

interface NormalizedEvent {
  title: string;
  description: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  cover_image: string | null;
  luma_event_id: string;
  luma_url: string;
  club_id: string | null;
  club_handle: string | null;
}

// ─── Seed list: known UCSD club Luma handles ─────────────────────────────────
// These are org/user slugs from lu.ma/<slug>
// Expand this list as you discover more
const KNOWN_UCSD_HANDLES = [
  'acm-ucsd',
  'ucsddesign',
  'ucsdprelaw',
  'tritontech',
  'ucsdai',
  'ucsdentrepreneurs',
  'sdh-ucsd',
  'ucsd-pre-med',
  'ucsdblockchain',
  'tritonhacks',
  'ucsdfinance',
  'ucsdconsulting',
  'cses-ucsd',
  'ieee-ucsd',
  'ucsd-acm-w',
  'ucsdcs',
  'ucsdrobotics',
];

// ─── Luma API helpers ─────────────────────────────────────────────────────────

const LUMA_BASE = 'https://api.lu.ma';

const LUMA_HEADERS = {
  'Accept': 'application/json',
  'x-luma-source': 'web',
  'User-Agent': 'Mozilla/5.0 (compatible; UniCircle/1.0)',
};

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Fetch events from a specific Luma calendar by handle/slug.
 * Calls: GET /public/v1/calendar/get-items?calendar_api_id=<handle>&period=future
 */
async function fetchCalendarEvents(handle: string): Promise<LumaEvent[]> {
  const url = `${LUMA_BASE}/public/v1/calendar/get-items?calendar_api_id=${encodeURIComponent(handle)}&period=future&pagination_limit=50`;

  try {
    const res = await fetch(url, { headers: LUMA_HEADERS });

    if (!res.ok) {
      console.log(`Calendar ${handle}: HTTP ${res.status}`);
      return [];
    }

    const data: LumaCalendarResponse = await res.json();
    const entries = data.entries || [];
    const events = entries
      .map(e => e.event)
      .filter((e): e is LumaEvent => !!e && !!e.api_id && !!e.start_at);

    console.log(`Calendar ${handle}: found ${events.length} upcoming events`);
    return events;
  } catch (err) {
    console.error(`Calendar fetch error (${handle}):`, err);
    return [];
  }
}

/**
 * Discover UCSD events via Luma's search/discover API.
 * Calls: GET /public/v1/discover/get-paginated-events with location + query
 */
async function discoverUCSDEvents(query: string, cursor?: string): Promise<{ events: LumaEvent[]; next_cursor?: string }> {
  const params = new URLSearchParams({
    q: query,
    period: 'future',
    pagination_limit: '100',
    ...(cursor ? { pagination_cursor: cursor } : {}),
  });

  const url = `${LUMA_BASE}/public/v1/discover/get-paginated-events?${params}`;

  try {
    const res = await fetch(url, { headers: LUMA_HEADERS });

    if (!res.ok) {
      console.log(`Discover (${query}): HTTP ${res.status}`);
      // Try fallback endpoint
      return await discoverFallback(query);
    }

    const data: LumaDiscoverResponse = await res.json();
    const events = (data.events || [])
      .map(e => e.event)
      .filter((e): e is LumaEvent => !!e && !!e.api_id && !!e.start_at);

    console.log(`Discover (${query}): found ${events.length} events`);
    return { events, next_cursor: data.next_cursor };
  } catch (err) {
    console.error(`Discover error (${query}):`, err);
    return { events: [] };
  }
}

/**
 * Fallback: try the location-based discover endpoint
 */
async function discoverFallback(query: string): Promise<{ events: LumaEvent[] }> {
  const params = new URLSearchParams({
    near: 'San Diego, CA',
    period: 'future',
    pagination_limit: '50',
    q: query,
  });

  const url = `${LUMA_BASE}/public/v1/discover/get-events-by-location?${params}`;

  try {
    const res = await fetch(url, { headers: LUMA_HEADERS });
    if (!res.ok) return { events: [] };

    const data = await res.json();
    const rawEvents = data.events || data.entries || [];
    const events = rawEvents
      .map((e: any) => e.event || e)
      .filter((e: any): e is LumaEvent => !!e?.api_id && !!e?.start_at);

    console.log(`Discover fallback (${query}): found ${events.length} events`);
    return { events };
  } catch {
    return { events: [] };
  }
}

/**
 * Extract a Luma handle from a URL string.
 * e.g. "https://lu.ma/acm-ucsd" → "acm-ucsd"
 *      "lu.ma/tritonhacks"      → "tritonhacks"
 */
function extractLumaHandle(url: string): string | null {
  if (!url) return null;
  const match = url.match(/lu\.ma\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const slug = match[1];
  // Skip generic Luma pages
  if (['discover', 'home', 'pricing', 'blog', 'login', 'signup'].includes(slug)) return null;
  return slug;
}

/**
 * Normalize a Luma event into our DB schema.
 */
function normalizeEvent(lumaEvent: LumaEvent, clubId: string | null, clubHandle: string | null): NormalizedEvent {
  const geo = lumaEvent.geo_address_info;
  let location: string | null = null;
  if (geo) {
    location = geo.full_address || geo.address || [geo.city, geo.region].filter(Boolean).join(', ') || null;
  }

  // Strip HTML from description
  const rawDesc = lumaEvent.description || '';
  const description = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);

  const eventUrl = lumaEvent.url.startsWith('http')
    ? lumaEvent.url
    : `https://lu.ma/${lumaEvent.url}`;

  return {
    title: lumaEvent.name.trim(),
    description,
    start_time: lumaEvent.start_at,
    end_time: lumaEvent.end_at || null,
    location,
    cover_image: lumaEvent.cover_url || null,
    luma_event_id: lumaEvent.api_id,
    luma_url: eventUrl,
    club_id: clubId,
    club_handle: clubHandle,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth: gateway validates apikey; just grab env vars ─────────────────
    const internalUrl = Deno.env.get('SUPABASE_URL')!;
    const internalServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ── External DB (clubs + events live here) ───────────────────────────────
    const rawExternalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');
    if (!rawExternalUrl || !externalKey) throw new Error('EXTERNAL_SUPABASE_URL / EXTERNAL_SUPABASE_SERVICE_ROLE_KEY not configured');
    const cleanExternalUrl = rawExternalUrl.trim()
      .replace(/\/(auth|rest|functions)\/v1.*$/i, '')
      .replace(/\/+$/, '');
    const db = createClient(cleanExternalUrl, externalKey);

    // ── Request config ───────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body.dryRun ?? false;
    // Strategies to run (default: both)
    const runDiscover: boolean = body.runDiscover ?? true;
    const runPerClub: boolean = body.runPerClub ?? true;
    // Extra handles to scrape (in addition to seed + DB)
    const extraHandles: string[] = body.extraHandles ?? [];

    console.log(`\n=== Luma scraper start | dryRun=${dryRun} | discover=${runDiscover} | perClub=${runPerClub} ===`);

    // ── Collect all Luma handles ─────────────────────────────────────────────
    // Start with seed list + any extras passed in
    const handleMap = new Map<string, { clubId: string | null; clubName: string | null }>();

    for (const h of [...KNOWN_UCSD_HANDLES, ...extraHandles]) {
      handleMap.set(h.toLowerCase(), { clubId: null, clubName: null });
    }

    // Scan clubs table for lu.ma URLs stored in website / instagram fields
    // Try with luma_handle first; fall back if the column doesn't exist yet
    let clubs: Array<{ id: string; name: string; website?: string | null; instagram?: string | null; luma_handle?: string | null }> | null = null;
    const { data: clubsWithHandle, error: clubsErr } = await db
      .from('clubs')
      .select('id, name, website, instagram, luma_handle')
      .not('name', 'is', null);

    if (clubsErr?.message?.includes('luma_handle')) {
      // Column doesn't exist yet — retry without it
      const { data: clubsFallback } = await db
        .from('clubs')
        .select('id, name, website, instagram')
        .not('name', 'is', null);
      clubs = clubsFallback;
    } else {
      clubs = clubsWithHandle;
    }

    for (const club of clubs || []) {
      // Check luma_handle column (if it exists)
      if (club.luma_handle) {
        const h = club.luma_handle.toLowerCase().trim();
        if (h) handleMap.set(h, { clubId: club.id, clubName: club.name });
      }
      // Check website for lu.ma links
      const websiteHandle = club.website ? extractLumaHandle(club.website) : null;
      if (websiteHandle) {
        handleMap.set(websiteHandle.toLowerCase(), { clubId: club.id, clubName: club.name });
      }
      // Check instagram bio-link style fields
      const igHandle = club.instagram ? extractLumaHandle(club.instagram) : null;
      if (igHandle) {
        handleMap.set(igHandle.toLowerCase(), { clubId: club.id, clubName: club.name });
      }
    }

    // Build a name → id lookup for matching events from the discover strategy
    const clubNameIndex: Array<{ id: string; name: string; nameLower: string }> = (clubs || [])
      .filter(c => c.name)
      .map(c => ({ id: c.id, name: c.name, nameLower: c.name.toLowerCase() }));

    console.log(`Found ${handleMap.size} Luma handles to scrape`);

    // ── Result tracking ──────────────────────────────────────────────────────
    const stats = {
      handlesScraped: 0,
      eventsFound: 0,
      eventsInserted: 0,
      eventsDuplicate: 0,
      eventsErrored: 0,
      errors: [] as string[],
    };

    const seenLumaIds = new Set<string>();

    // ── Helper: upsert one event ─────────────────────────────────────────────
    async function upsertEvent(ev: NormalizedEvent) {
      if (seenLumaIds.has(ev.luma_event_id)) return; // already queued
      seenLumaIds.add(ev.luma_event_id);
      stats.eventsFound++;

      if (dryRun) {
        console.log(`[dry] ${ev.title} | ${ev.start_time} | club=${ev.club_id ?? 'unknown'}`);
        return;
      }

      try {
        const record = {
          title: ev.title,
          caption: ev.description,
          start_time: ev.start_time,
          end_time: ev.end_time,
          location: ev.location,
          cover_image: ev.cover_image,
          club_id: ev.club_id,
          club_handle: ev.club_handle,
          source: 'luma',
          source_url: ev.luma_url,
          external_source: 'luma',
          external_id: ev.luma_event_id,
          verified: false,
          posted_at: new Date().toISOString(),
        };

        const { error } = await db
          .from('events')
          .upsert(record, {
            onConflict: 'external_id,external_source',
            ignoreDuplicates: true,
          });

        if (error) {
          if (error.code === '23505' || error.message?.includes('duplicate')) {
            stats.eventsDuplicate++;
          } else {
            console.error(`Insert error (${ev.title}):`, error.message);
            stats.eventsErrored++;
            stats.errors.push(`${ev.title}: ${error.message}`);
          }
        } else {
          stats.eventsInserted++;
          console.log(`+ ${ev.title} | ${ev.start_time.slice(0, 10)}`);
        }
      } catch (e) {
        stats.eventsErrored++;
        stats.errors.push(`${ev.title}: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }

    // ── Strategy 1: Discover UCSD events via Luma search ────────────────────
    if (runDiscover) {
      console.log('\n--- Strategy 1: Luma discover ---');

      const discoverQueries = [
        'ucsd',
        'UC San Diego',
        'ucsd club',
      ];

      for (const q of discoverQueries) {
        const { events } = await discoverUCSDEvents(q);

        for (const lumaEvent of events) {
          // Try to match to a known club by name
          let matchedClubId: string | null = null;
          let matchedHandle: string | null = null;

          const eventName = lumaEvent.name.toLowerCase();
          const eventDesc = (lumaEvent.description || '').toLowerCase();
          const combined = eventName + ' ' + eventDesc;

          for (const club of clubNameIndex) {
            // Check if club name appears in the event text
            if (club.nameLower.length > 3 && combined.includes(club.nameLower)) {
              matchedClubId = club.id;
              matchedHandle = club.id;
              break;
            }
          }

          // Also try to extract handle from the event URL
          const urlHandle = extractLumaHandle(lumaEvent.url);
          if (urlHandle && handleMap.has(urlHandle)) {
            const info = handleMap.get(urlHandle)!;
            matchedClubId = matchedClubId ?? info.clubId;
            matchedHandle = matchedHandle ?? info.clubId;
          }

          await upsertEvent(normalizeEvent(lumaEvent, matchedClubId, matchedHandle));
        }

        await delay(600);
      }
    }

    // ── Strategy 2: Per-club calendar scraping ───────────────────────────────
    if (runPerClub) {
      console.log(`\n--- Strategy 2: Per-club calendars (${handleMap.size} handles) ---`);

      for (const [handle, info] of handleMap.entries()) {
        const events = await fetchCalendarEvents(handle);
        stats.handlesScraped++;

        for (const lumaEvent of events) {
          await upsertEvent(normalizeEvent(lumaEvent, info.clubId, info.clubId));
        }

        // Save back discovered handles to clubs table if we matched a club
        if (!dryRun && info.clubId && events.length > 0) {
          try {
            await db
              .from('clubs')
              .update({ luma_handle: handle })
              .eq('id', info.clubId);
          } catch {
            // ignore if column doesn't exist
          }
        }

        await delay(300);
      }
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('\n=== Luma scrape complete ===');
    console.log(JSON.stringify(stats, null, 2));

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      handlesScraped: stats.handlesScraped,
      eventsFound: stats.eventsFound,
      eventsInserted: stats.eventsInserted,
      eventsDuplicate: stats.eventsDuplicate,
      eventsErrored: stats.eventsErrored,
      errors: stats.errors.slice(0, 20), // cap error list
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Scraper fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
