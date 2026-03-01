import { writeFileSync } from 'fs';

// ============ CONFIG ============
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

if (!FIRECRAWL_API_KEY) {
  console.error('Missing FIRECRAWL_API_KEY. Run with:');
  console.error('FIRECRAWL_API_KEY=your_key node scripts/scrape-csi.mjs');
  process.exit(1);
}

const TARGET_CATEGORIES = {
  'Pre-Professional': 19,
  'Academic': 8,
  'Cultural': 9,
  'IFC (Fraternities)': 14,
  'CPA (Sororities)': 16,
  'MGC Fraternity': 12,
  'MGC Sorority': 25,
  'NPHC': 30,
};

// ============ HELPERS ============
async function firecrawlExtract(url, prompt) {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['extract'], extract: { prompt } }),
  });
  const data = await res.json();
  return data?.data?.extract || null;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function toCSV(rows) {
  const headers = ['club_name', 'category', 'contact_email', 'officer_name', 'officer_title', 'instagram', 'website', 'description'];
  const escape = v => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`;
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(','))
  ].join('\n');
}

// ============ MAIN ============
async function main() {
  const allClubs = [];

  // Step 1: Get club IDs from each category page
  console.log(`\nStep 1: Scraping ${Object.keys(TARGET_CATEGORIES).length} category pages...\n`);

  for (const [catName, catId] of Object.entries(TARGET_CATEGORIES)) {
    console.log(`  Fetching: ${catName}...`);
    const result = await firecrawlExtract(
      `https://studentorg.ucsd.edu/Home/Index/${catId}`,
      `Extract every student organization on this page. Return a JSON array of objects with fields: name (club name), id (numeric ID from /Home/Details/[ID] URL). Only include clubs with a numeric ID.`
    );

    const clubs = Array.isArray(result) ? result : [];
    console.log(`  Found ${clubs.length} clubs`);
    for (const club of clubs) {
      if (club.id && club.name) {
        allClubs.push({ id: String(club.id), name: club.name, category: catName });
      }
    }
    await sleep(500);
  }

  // Deduplicate
  const seen = new Set();
  const uniqueClubs = allClubs.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  console.log(`\nTotal unique clubs: ${uniqueClubs.length}`);
  console.log(`Estimated Firecrawl credits: ${uniqueClubs.length + Object.keys(TARGET_CATEGORIES).length}\n`);

  // Step 2: Scrape each club detail page in batches
  console.log('Step 2: Scraping club detail pages...\n');
  const contacts = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < uniqueClubs.length; i += BATCH_SIZE) {
    const batch = uniqueClubs.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async club => {
      try {
        const extracted = await firecrawlExtract(
          `https://studentorg.ucsd.edu/Home/Details/${club.id}`,
          `Extract from this UCSD student org page: club_name, contact_email (any @ address), officer_name (president/chair/director), officer_title, instagram (handle or URL), website (external URL, not studentorg.ucsd.edu), description (1-3 sentence mission). Return null for missing fields.`
        );

        if (extracted) {
          contacts.push({
            club_name: extracted.club_name || club.name,
            category: club.category,
            contact_email: extracted.contact_email || null,
            officer_name: extracted.officer_name || null,
            officer_title: extracted.officer_title || null,
            instagram: extracted.instagram || null,
            website: extracted.website || null,
            description: extracted.description || null,
          });
        }
      } catch {
        console.warn(`  Failed: ${club.name}`);
      }
    }));

    console.log(`  Processed ${Math.min(i + BATCH_SIZE, uniqueClubs.length)}/${uniqueClubs.length}`);
    if (i + BATCH_SIZE < uniqueClubs.length) await sleep(1000);
  }

  // Step 3: Save to CSV
  const withEmail = contacts.filter(c => c.contact_email).length;
  const csv = toCSV(contacts);
  const filename = `csi-contacts-${new Date().toISOString().split('T')[0]}.csv`;
  writeFileSync(filename, csv);

  console.log(`\nDone!`);
  console.log(`  Total clubs scraped: ${contacts.length}`);
  console.log(`  With email:          ${withEmail}`);
  console.log(`  Saved to:            ${filename}`);
}

main().catch(console.error);
