// Converts all SVGs in public/social_assets/ to PNGs using the system Chrome/Safari
// Run: node scripts/export_svgs.mjs

import { execSync } from 'child_process';
import { readdirSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const inputDir = join(root, 'public', 'social_assets');
const outputDir = join(root, 'public', 'social_assets', 'png');

if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

const svgs = readdirSync(inputDir).filter(f => f.endsWith('.svg'));
if (!svgs.length) { console.error('No SVG files found in', inputDir); process.exit(1); }

// Try qlmanage (macOS Quick Look — built in, no install)
for (const svg of svgs) {
  const input = join(inputDir, svg);
  const outName = basename(svg, '.svg') + '.png';
  const output = join(outputDir, outName);

  console.log(`Converting ${svg} → png/${outName} ...`);

  try {
    // qlmanage renders at screen resolution — we pass -s 1080 for 1080px
    execSync(`qlmanage -t -s 1080 -o "${outputDir}" "${input}" 2>/dev/null`, { stdio: 'inherit' });
    // qlmanage appends .png automatically: file.svg.png → rename
    const qlOut = join(outputDir, svg + '.png');
    if (existsSync(qlOut)) {
      execSync(`mv "${qlOut}" "${output}"`);
      console.log(`  ✓ Saved ${outName}`);
    }
  } catch (e) {
    console.error(`  ✗ Failed: ${e.message}`);
  }
}

console.log('\nDone. PNGs are in public/social_assets/png/');
