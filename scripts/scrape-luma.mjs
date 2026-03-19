/**
 * scrape-luma.mjs
 * Scrapes Luma (lu.ma) for UCSD club events and inserts them directly
 * into the database. No API key required — Luma's API is public.
 *
 * Usage:
 *   node scripts/scrape-luma.mjs              # normal run (verified=false)
 *   node scripts/scrape-luma.mjs --approve    # auto-approve events
 *   node scripts/scrape-luma.mjs --dry        # dry run, no DB writes
 */

import { createClient } from '@supabase/supabase-js';

// ─── Config ───────────────────────────────────────────────────────────────────

const DATA_URL = 'https://tayhvgmterjzolvodwow.supabase.co';
const DATA_KEY = 'sb_publishable_lv3PPFiSGAO3oInnZZzUXw_g1WMNsI4';

const args = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry');
const AUTO_APPROVE = args.includes('--approve');

const db = createClient(DATA_URL, DATA_KEY);

const LUMA_HEADERS = {
  'Accept': 'application/json',
  'x-luma-source': 'web',
  'User-Agent': 'Mozilla/5.0 (compatible; UniCircle/1.0)',
};

// Known UCSD club Luma handles
const KNOWN_HANDLES = [
  'acm-ucsd', 'ucsddesign', 'ucsdprelaw', 'tritontech', 'ucsdai',
  'ucsdentrepreneurs', 'sdh-ucsd', 'ucsd-pre-med', 'ucsdblockchain',
  'tritonhacks', 'ucsdfinance', 'ucsdconsulting', 'cses-ucsd',
  'ieee-ucsd', 'ucsd-acm-w', 'ucsdcs', 'ucsdrobotics',
];

const DISCOVER_QUERIES = ['ucsd', 'UC San Diego', 'ucsd club'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractLumaHandle(url) {
  if (!url) return null;
  const match = url.match(/lu\.ma\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const slug = match[1];
  if (['discover','home','pricing','blog','login','signup'].includes(slug)) return null;
  return slug;
}

function normalizeEvent(lumaEvent, clubId, clubHandle) {
  const geo = lumaEvent.geo_address_info;
  let location = null;
  if (geo) {
    location = geo.full_address || geo.address ||
      [geo.city, geo.region].filter(Boolean).join(', ') || null;
  }

  const rawDesc = lumaEvent.description || '';
  const description = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);

  const eventUrl = lumaEvent.url?.startsWith('http')
    ? lumaEvent.url
    : `https://lu.ma/${lumaEvent.url}`;

  return {
    title: (lumaEvent.name || '').trim(),
    caption: description,
    start_time: lumaEvent.start_at,
    end_time: lumaEvent.end_at || null,
    location,
    club_id: clubId,
    club_handle: clubHandle,
    source: 'luma',
    source_url: eventUrl,
    external_source: 'luma',
    external_id: lumaEvent.api_id,
    verified: AUTO_APPROVE,
    posted_at: new Date().toISOString(),
  };
}

// ─── Luma API ─────────────────────────────────────────────────────────────────

async function fetchCalendarEvents(handle) {
  const url = `https://api.lu.ma/public/v1/calendar/get-items?calendar_api_id=${encodeURIComponent(handle)}&period=future&pagination_limit=50`;
  try {
    const res = await fetch(url, { headers: LUMA_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.entries || [])
      .map(e => e.event)
      .filter(e => e?.api_id && e?.start_at);
  } catch { return []; }
}

async function discoverUCSDEvents(query) {
  const params = new URLSearchParams({ q: query, period: 'future', pagination_limit: '100' });
  try {
    const res = await fetch(`https://api.lu.ma/public/v1/discover/get-paginated-events?${params}`, { headers: LUMA_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.events || []).map(e => e.event).filter(e => e?.api_id && e?.start_at);
  } catch { return []; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Luma Scraper ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : AUTO_APPROVE ? 'Live + Auto-Approve' : 'Live (goes to review queue)'}\n`);

  // Load clubs from DB, look for lu.ma links in website/instagram fields
  const { data: clubs, error: clubsErr } = await db
    .from('clubs')
    .select('id, name, website, instagram')
    .not('name', 'is', null);

  if (clubsErr) { console.error('Failed to load clubs:', clubsErr.message); process.exit(1); }
  console.log(`Loaded ${clubs.length} clubs from database`);

  // Build handle → club mapping
  const handleMap = new Map();
  for (const h of KNOWN_HANDLES) {
    handleMap.set(h.toLowerCase(), { clubId: null, clubHandle: null });
  }
  for (const club of clubs) {
    const websiteHandle = extractLumaHandle(club.website);
    if (websiteHandle) handleMap.set(websiteHandle.toLowerCase(), { clubId: club.id, clubHandle: club.id });
    const igHandle = extractLumaHandle(club.instagram);
    if (igHandle) handleMap.set(igHandle.toLowerCase(), { clubId: club.id, clubHandle: club.id });
  }

  // Club name index for matching discovered events
  const clubNameIndex = clubs
    .filter(c => c.name)
    .map(c => ({ id: c.id, name: c.name, nameLower: c.name.toLowerCase() }));

  console.log(`Found ${handleMap.size} Luma handles to check\n`);

  const stats = { found: 0, inserted: 0, duplicate: 0, errored: 0 };
  const seenIds = new Set();

  async function upsertEvent(record) {
    if (seenIds.has(record.external_id)) return;
    seenIds.add(record.external_id);
    stats.found++;

    if (DRY_RUN) {
      console.log(`  [dry] ${record.title} | ${record.start_time?.slice(0,10)}`);
      return;
    }

    const { error } = await db.from('events').insert(record);

    if (error) {
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        stats.duplicate++;
      } else {
        console.error(`  Error inserting "${record.title}": ${error.message}`);
        stats.errored++;
      }
    } else {
      stats.inserted++;
      console.log(`  + ${record.title} | ${record.start_time?.slice(0,10)}`);
    }
  }

  // Strategy 1: Discover UCSD events via Luma search
  console.log('--- Strategy 1: Luma discover search ---');
  for (const q of DISCOVER_QUERIES) {
    process.stdout.write(`  Searching "${q}"... `);
    const events = await discoverUCSDEvents(q);
    console.log(`${events.length} events`);

    for (const lumaEvent of events) {
      let clubId = null, clubHandle = null;
      const combined = (lumaEvent.name + ' ' + (lumaEvent.description || '')).toLowerCase();
      for (const club of clubNameIndex) {
        if (club.nameLower.length > 3 && combined.includes(club.nameLower)) {
          clubId = club.id; clubHandle = club.id; break;
        }
      }
      await upsertEvent(normalizeEvent(lumaEvent, clubId, clubHandle));
    }
    await sleep(600);
  }

  // Strategy 2: Per-club calendar scraping
  console.log(`\n--- Strategy 2: Per-club calendars (${handleMap.size} handles) ---`);
  let i = 0;
  for (const [handle, info] of handleMap.entries()) {
    i++;
    process.stdout.write(`  [${i}/${handleMap.size}] ${handle}... `);
    const events = await fetchCalendarEvents(handle);
    console.log(`${events.length} events`);

    for (const lumaEvent of events) {
      await upsertEvent(normalizeEvent(lumaEvent, info.clubId, info.clubHandle));
    }
    await sleep(300);
  }

  // Summary
  console.log(`\n=== Done ===`);
  console.log(`  Events found:     ${stats.found}`);
  if (!DRY_RUN) {
    console.log(`  Inserted:         ${stats.inserted}`);
    console.log(`  Duplicates:       ${stats.duplicate}`);
    console.log(`  Errors:           ${stats.errored}`);
    if (!AUTO_APPROVE) {
      console.log(`\n  Events are in the review queue. Go to /admin/events to approve them.`);
    } else {
      console.log(`\n  Events are live on the calendar.`);
    }
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
