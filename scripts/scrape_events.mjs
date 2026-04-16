/**
 * UCSD Events Scraper
 * Fetches events from the UCSD Localist calendar API and upserts them
 * into the external Supabase events table.
 *
 * Run: node scripts/scrape_events.mjs
 */

import { createClient } from '@supabase/supabase-js';

const DATA_URL = 'https://tayhvgmterjzolvodwow.supabase.co';
const DATA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheWh2Z210ZXJqem9sdm9kd293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTExODIsImV4cCI6MjA4NDI2NzE4Mn0.QUBp8guzuSsRh_9hpVOsqsGFlRn7IO6adwZRMRL8UHI';
const client = createClient(DATA_URL, DATA_KEY);

// Scrape 90 days ahead (through summer)
const DAYS_AHEAD = 90;
const PER_PAGE = 100;

async function fetchPage(page) {
  const url = `https://calendar.ucsd.edu/api/2/events?days=${DAYS_AHEAD}&pp=${PER_PAGE}&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);
  const data = await res.json();
  return data.events || [];
}

function parseEvent(raw) {
  const e = raw.event;
  if (!e) return null;

  // Get first instance start/end
  const instance = e.event_instances?.[0]?.event_instance;
  const start_time = instance?.start || null;
  const end_time = instance?.end || null;

  if (!start_time) return null;
  if (!e.title) return null;

  // Build external_id from Localist ID so we can upsert without dupes
  const external_id = `ucsd-localist-${e.id}`;

  // Strip HTML from description
  const caption = e.description_text
    ? e.description_text.replace(/<[^>]*>/g, '').trim().slice(0, 1000)
    : null;

  return {
    external_id,
    title: e.title.trim(),
    start_time,
    end_time,
    location: e.location_name || e.location || null,
    caption,
    image_url: e.photo_url || null,
    source: 'ucsd_calendar',
    external_source: 'ucsd_calendar',
    source_url: e.localist_url || null,
    status: 'candidate',
    verified: false,
    club_id: null,
    club_handle: null,
  };
}

async function main() {
  console.log('Starting UCSD calendar scrape...');
  console.log(`Fetching events for the next ${DAYS_AHEAD} days\n`);

  // Step 1: Fetch all pages from the API
  let page = 1;
  const allParsed = [];

  while (true) {
    let rawEvents;
    try {
      rawEvents = await fetchPage(page);
    } catch (err) {
      console.error(`Error fetching page ${page}:`, err.message);
      break;
    }
    if (!rawEvents.length) break;

    const parsed = rawEvents.map(parseEvent).filter(Boolean);
    allParsed.push(...parsed);
    process.stdout.write(`  Fetched page ${page}: ${allParsed.length} events so far...\r`);

    if (rawEvents.length < PER_PAGE) break;
    page++;
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nFetched ${allParsed.length} events from ${page} pages`);

  // Step 2: Load ALL existing external_ids from ucsd_calendar source to avoid dupes
  console.log('Loading existing external_ids from DB...');
  // Fetch in pages since there could be many
  let existingAll = [];
  let ePage = 0;
  while (true) {
    const { data: chunk, error: fetchErr } = await client
      .from('events')
      .select('external_id')
      .eq('source', 'ucsd_calendar')
      .range(ePage * 1000, ePage * 1000 + 999);
    if (fetchErr) { console.error('Could not load existing:', fetchErr.message); process.exit(1); }
    if (!chunk || chunk.length === 0) break;
    existingAll.push(...chunk);
    if (chunk.length < 1000) break;
    ePage++;
  }

  const existingIds = new Set(existingAll.map(e => e.external_id));
  console.log(`  ${existingIds.size} existing ucsd_calendar events in DB`);

  // Step 3: Only insert new ones
  const newEvents = allParsed.filter(e => !existingIds.has(e.external_id));
  console.log(`  ${newEvents.length} new events to insert\n`);

  if (newEvents.length === 0) {
    console.log('Nothing new to insert. DB is up to date.');
    return;
  }

  // Step 4: Insert one-by-one to avoid constraint errors on any single dupe
  let totalInserted = 0;
  let totalDupes = 0;
  for (let i = 0; i < newEvents.length; i++) {
    const event = newEvents[i];
    const { error } = await client.from('events').insert([event]);
    if (error) {
      if (error.message?.includes('unique') || error.code === '23505') {
        totalDupes++;
      } else {
        console.error(`\n  Insert error for "${event.title}":`, error.message);
      }
    } else {
      totalInserted++;
    }
    if (i % 25 === 0) {
      process.stdout.write(`  Progress: ${i + 1}/${newEvents.length} (${totalInserted} inserted, ${totalDupes} dupes)...\r`);
    }
    // Small delay every 100 inserts
    if (i > 0 && i % 100 === 0) await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n\n─────────────────────────');
  console.log(`Done.`);
  console.log(`  Total scraped:   ${allParsed.length}`);
  console.log(`  Already in DB:   ${existingIds.size} (pre-existing)`);
  console.log(`  Skipped (dupes): ${totalDupes}`);
  console.log(`  New inserted:    ${totalInserted}`);
  console.log('─────────────────────────');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
