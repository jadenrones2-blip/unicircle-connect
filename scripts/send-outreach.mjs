/**
 * send-outreach.mjs
 * Reads ucsd_club_leaders.csv and sends personalized cold emails to club officers
 * via Resend. Tracks sent contacts in sent_outreach.json to avoid duplicates.
 *
 * Usage:
 *   RESEND_API_KEY=re_xxx node scripts/send-outreach.mjs             # live run
 *   RESEND_API_KEY=re_xxx node scripts/send-outreach.mjs --dry       # preview only
 *   RESEND_API_KEY=re_xxx node scripts/send-outreach.mjs --limit 10  # send to 10 orgs
 *   RESEND_API_KEY=re_xxx node scripts/send-outreach.mjs --csv path/to/other.csv
 *
 * Setup:
 *   1. Get a free Resend API key at resend.com
 *   2. Add a verified sending domain (or use onboarding@resend.dev for testing)
 *   3. Run the scraper first: python3 scripts/scrape-club-leaders.py
 */

import { Resend } from 'resend';
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import path from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.FROM_EMAIL || 'Jaden at UniCircle <jaden@unicircle.app>';
const SENT_LOG       = path.resolve('scripts/sent_outreach.json');
const DELAY_MS       = 1200; // stay under Resend's 2 req/sec limit

const SKIP_ORGS = new Set([
  'Reach @ UC San Diego',
  'Women in Business',
]);

const SKIP_CATEGORIES = new Set([
  'College Panhellenic Association (CPA)',
  'Interfraternity Council (IFC)',
  'Multicultural Greek Council (MGC) - Fraternity',
  'Multicultural Greek Council (MGC) - Sorority',
  'National Pan-Hellenic Council Organizations (NPHC)',
]);

const args           = process.argv.slice(2);
const DRY_RUN        = args.includes('--dry');
const LIMIT          = parseInt(args[args.indexOf('--limit') + 1]) || 0;
const CSV_PATH       = args[args.indexOf('--csv') + 1] || 'ucsd_club_leaders.csv';

// ─── Email template ───────────────────────────────────────────────────────────

function buildEmail(officerName, orgName) {
  const firstName = officerName ? officerName.split(' ')[0] : 'there';
  const shortOrgName = orgName.replace(/\s*\([^)]*at UC San Diego[^)]*\)/i, '').replace(/ at UC San Diego.*$/i, '').replace(/,\s*The\s*$/i, '').trim();

  const subject = `${shortOrgName} — recruitment this quarter`;

  const html = `
<p>Hi ${firstName},</p>

<p>I'm Jaden, a UCSD student. I've been spending the past few weeks meeting with club leaders across campus — talking through how orgs run recruitment, what breaks down, and where things fall through the cracks.</p>

<p>What I keep hearing: officers are split across group chats and spreadsheets, applicants get lost between stages, and by the time a decision gets made half the team has lost context on who even applied.</p>

<p>I built <a href="https://unicircle.app">UniCircle</a> to fix that — a recruitment platform built specifically for UCSD clubs. Shared pipeline, team scoring, automatic applicant emails at every stage. The clubs I'm piloting with this quarter are already running their full recruitment cycles through it.</p>

<p>I'd love to walk you through it and get your take. 15 minutes — would you be open to it?</p>

<p><a href="https://cal.com/jaden-unicircle">Grab time here</a> or just reply to this email.</p>

<p>Jaden Rones<br>
<a href="https://unicircle.app">unicircle.app</a></p>

<p style="color:#888;font-size:12px;">You're receiving this because you're listed as a principal member of ${shortOrgName} on the UCSD CSI student org registry. Reply to unsubscribe.</p>
`.trim();

  const text = `Hi ${firstName},

I'm Jaden, a UCSD student. I've been spending the past few weeks meeting with club leaders across campus — talking through how orgs run recruitment, what breaks down, and where things fall through the cracks.

What I keep hearing: officers are split across group chats and spreadsheets, applicants get lost between stages, and by the time a decision gets made half the team has lost context on who even applied.

I built UniCircle (unicircle.app) to fix that — a recruitment platform built specifically for UCSD clubs. Shared pipeline, team scoring, automatic applicant emails at every stage. The clubs I'm piloting with this quarter are already running their full recruitment cycles through it.

I'd love to walk you through it and get your take. 15 minutes — would you be open to it?

Grab time here: https://cal.com/jaden-unicircle — or just reply to this email.

Jaden Rones
unicircle.app

---
You're receiving this because you're listed as a principal member of ${shortOrgName} on the UCSD CSI student org registry. Reply to unsubscribe.`;

  return { subject, html, text };
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const rl = createInterface({ input: createReadStream(filePath) });
    let header = null;
    rl.on('line', (line) => {
      // basic CSV parse (handles quoted fields with commas)
      const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map(c =>
        c.replace(/^"|"$/g, '').trim()
      ) ?? [''];
      if (!header) { header = cols; return; }
      const row = Object.fromEntries(header.map((h, i) => [h, cols[i] ?? '']));
      rows.push(row);
    });
    rl.on('close', () => resolve(rows));
    rl.on('error', reject);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!RESEND_API_KEY && !DRY_RUN) {
    console.error('Set RESEND_API_KEY env var, or use --dry to preview.');
    process.exit(1);
  }

  if (!existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    console.error('Run: python3 scripts/scrape-club-leaders.py');
    process.exit(1);
  }

  const sent = existsSync(SENT_LOG)
    ? new Set(JSON.parse(readFileSync(SENT_LOG, 'utf8')))
    : new Set();

  const rows = await parseCSV(CSV_PATH);

  // One email per org — pick the first officer (bg-success = president in CSI HTML)
  // Group by org, take first row per org that has an email
  const byOrg = new Map();
  for (const row of rows) {
    if (!byOrg.has(row.org_name)) {
      const email = row.officer_email || row.org_email;
      if (email) byOrg.set(row.org_name, row);
    }
  }

  let targets = [...byOrg.values()].filter(r => !SKIP_CATEGORIES.has(r.category) && !SKIP_ORGS.has(r.org_name));
  const skipped = byOrg.size - targets.length;
  if (skipped) console.log(`Skipped ${skipped} Greek life orgs.`);
  if (LIMIT) targets = targets.slice(0, LIMIT);

  const unsent = targets.filter(r => {
    const email = r.officer_email || r.org_email;
    return !sent.has(email);
  });

  console.log(`Total orgs: ${byOrg.size}`);
  console.log(`Already sent: ${targets.length - unsent.length}`);
  console.log(`To send: ${unsent.length}${DRY_RUN ? ' (DRY RUN — no emails sent)' : ''}`);
  console.log('');

  if (unsent.length === 0) {
    console.log('Nothing new to send.');
    return;
  }

  const resend = DRY_RUN ? null : new Resend(RESEND_API_KEY);
  let successCount = 0;

  for (let i = 0; i < unsent.length; i++) {
    const row = unsent[i];
    const toEmail  = row.officer_email || row.org_email;
    const toName   = row.officer_name || '';
    const { subject, html, text } = buildEmail(toName, row.org_name);

    console.log(`[${i + 1}/${unsent.length}] ${toEmail} — ${row.org_name.slice(0, 45)}`);

    if (DRY_RUN) {
      console.log(`  Subject: ${subject}`);
      console.log(`  Preview: ${text.split('\n')[2].slice(0, 80)}...`);
      continue;
    }

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: toName ? `${toName} <${toEmail}>` : toEmail,
        subject,
        html,
        text,
        headers: { 'X-Campaign': 'club-leader-outreach-v1' },
      });
      sent.add(toEmail);
      successCount++;

      // Save after each send so a crash doesn't cause re-sends
      writeFileSync(SENT_LOG, JSON.stringify([...sent], null, 2));
    } catch (err) {
      console.error(`  [ERROR] ${err.message}`);
    }

    if (i < unsent.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  if (!DRY_RUN) {
    console.log(`\nDone. Sent ${successCount}/${unsent.length} emails.`);
    console.log(`Log saved to ${SENT_LOG}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
