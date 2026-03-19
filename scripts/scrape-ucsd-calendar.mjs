/**
 * scrape-ucsd-calendar.mjs
 * Scrapes the official UCSD events calendar and inserts events into the database.
 * No API key required — UCSD's calendar API is public.
 *
 * Usage:
 *   node scripts/scrape-ucsd-calendar.mjs              # goes to review queue
 *   node scripts/scrape-ucsd-calendar.mjs --approve    # auto-approve all events
 *   node scripts/scrape-ucsd-calendar.mjs --dry        # dry run, no DB writes
 */

import { createClient } from '@supabase/supabase-js';

// ─── Config ───────────────────────────────────────────────────────────────────

const DATA_URL = 'https://tayhvgmterjzolvodwow.supabase.co';
const DATA_KEY = 'sb_publishable_lv3PPFiSGAO3oInnZZzUXw_g1WMNsI4';

const args = process.argv.slice(2);
const DRY_RUN      = args.includes('--dry');
const AUTO_APPROVE = args.includes('--approve');
const DAYS_AHEAD   = 90;  // how many days ahead to fetch
const PER_PAGE     = 100;
const MAX_PAGES    = 10;  // up to 1000 events

const db = createClient(DATA_URL, DATA_KEY);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Fetch events from UCSD calendar ─────────────────────────────────────────

async function fetchPage(page) {
  const url = `https://calendar.ucsd.edu/api/2/events?days=${DAYS_AHEAD}&pp=${PER_PAGE}&page=${page}`;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch (err) {
    console.error(`  Page ${page} fetch error:`, err.message);
    return [];
  }
}

// ─── Transform a UCSD calendar event to our DB schema ────────────────────────

function transformEvent(raw) {
  const ev = raw.event;
  if (!ev?.title) return null;

  // Get start/end from event_instances
  const instance = ev.event_instances?.[0]?.event_instance;
  const start_time = instance?.start || (ev.first_date ? `${ev.first_date}T18:00:00-07:00` : null);
  const end_time   = instance?.end || null;

  if (!start_time) return null;

  // Skip past events
  if (new Date(start_time) < new Date()) return null;

  // Build location string
  const locationParts = [ev.room_number, ev.location_name, ev.location].filter(Boolean);
  const location = locationParts[0] || null;

  // Get organizer/group
  const group = ev.groups?.[0]?.name || null;

  // Strip HTML from description
  const description = (ev.description_text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);

  const source_url = ev.localist_url || `https://calendar.ucsd.edu/event/${ev.urlname || ev.id}`;

  return {
    title: ev.title.trim(),
    caption: description || null,
    start_time,
    end_time,
    location,
    club_handle: group,
    club_id: null,
    source: 'ucsd_calendar',
    source_url,
    external_source: 'ucsd_calendar',
    external_id: String(ev.id),
    verified: AUTO_APPROVE,
    posted_at: new Date().toISOString(),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== UCSD Calendar Scraper ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : AUTO_APPROVE ? 'Live + Auto-Approve' : 'Live (review queue)'}`);
  console.log(`Fetching ${DAYS_AHEAD} days ahead, up to ${MAX_PAGES * PER_PAGE} events\n`);

  const stats = { fetched: 0, skipped: 0, inserted: 0, duplicate: 0, errored: 0 };
  const seenIds = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    process.stdout.write(`  Page ${page}... `);
    const rawEvents = await fetchPage(page);
    console.log(`${rawEvents.length} events`);

    if (rawEvents.length === 0) break;

    for (const raw of rawEvents) {
      const record = transformEvent(raw);
      if (!record) { stats.skipped++; continue; }
      if (seenIds.has(record.external_id)) continue;
      seenIds.add(record.external_id);
      stats.fetched++;

      if (DRY_RUN) {
        console.log(`  [dry] ${record.title} | ${record.start_time?.slice(0, 10)}`);
        continue;
      }

      const { error } = await db.from('events').insert(record);

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          stats.duplicate++;
        } else {
          console.error(`  Error: ${record.title} — ${error.message}`);
          stats.errored++;
        }
      } else {
        stats.inserted++;
        console.log(`  + ${record.title} | ${record.start_time?.slice(0, 10)}`);
      }
    }

    if (rawEvents.length < PER_PAGE) break;
    await sleep(500);
  }

  console.log(`\n=== Done ===`);
  console.log(`  Total fetched:  ${stats.fetched}`);
  console.log(`  Skipped:        ${stats.skipped}`);
  if (!DRY_RUN) {
    console.log(`  Inserted:       ${stats.inserted}`);
    console.log(`  Duplicates:     ${stats.duplicate}`);
    console.log(`  Errors:         ${stats.errored}`);
    if (!AUTO_APPROVE) {
      console.log(`\n  Events are in the review queue at /admin/events`);
    } else {
      console.log(`\n  Events are live on the calendar.`);
    }
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
