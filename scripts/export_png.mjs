// Exports SVGs to true 1080x1080 PNGs using Puppeteer (headless Chrome)
// Run: node scripts/export_png.mjs
// Optional: node scripts/export_png.mjs concept   ← only exports concept_*.svg files

import puppeteer from 'puppeteer';
import { readdirSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, basename } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const inputDir = join(root, 'public', 'social_assets');
const outputDir = join(root, 'public', 'social_assets', 'png');

if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

const filter = process.argv[2] || '';

const svgs = readdirSync(inputDir)
  .filter(f => f.endsWith('.svg') && (filter ? f.includes(filter) : true));

if (!svgs.length) {
  console.error('No SVGs found matching filter:', filter || '*');
  process.exit(1);
}

console.log(`Exporting ${svgs.length} SVG(s) at 1080x1080...\n`);

const browser = await puppeteer.launch({ headless: 'new' });

for (const svg of svgs) {
  const inputPath = join(inputDir, svg);
  const outName = basename(svg, '.svg') + '.png';
  const outputPath = join(outputDir, outName);
  const fileUrl = pathToFileURL(inputPath).href;

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });

  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // Force the SVG to fill exactly 1080x1080
  await page.evaluate(() => {
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.documentElement.style.background = '#0A0A0A';
    if (document.body) {
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.background = '#0A0A0A';
    }
    const svg = document.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '1080');
      svg.setAttribute('height', '1080');
    }
  });

  await page.screenshot({ path: outputPath, type: 'png' });
  await page.close();

  console.log(`  ✓ ${outName}`);
}

await browser.close();
console.log(`\nDone. PNGs saved to public/social_assets/png/`);
