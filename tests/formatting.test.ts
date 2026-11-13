// Regression tests for the live formatting fixes of 2026-11-13.
// Run: npx tsx tests/formatting.test.ts
//
// Root cause: the deployed HTML strips the newline between a line of text
// and an <a> on the next line, so "rates." + newline + <a> rendered as
// "rates.Read the full disclaimer" — no space. Any inline link that starts
// on a new line after text (or text that starts on a new line after a link)
// must instead sit on the same line with an explicit space.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

function astroFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...astroFiles(p));
    else if (entry.name.endsWith('.astro')) out.push(p);
  }
  return out;
}

function stripScriptBlocks(text: string): string {
  return text.replace(/<script[\s\S]*?<\/script>/g, (m) => '\n'.repeat(m.split('\n').length - 1));
}

let checked = 0;
let violations: string[] = [];

for (const file of astroFiles(SRC_DIR)) {
  const lines = stripScriptBlocks(readFileSync(file, 'utf8')).split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const a = lines[i].replace(/\s+$/, '');
    const b = lines[i + 1];
    // Text on one line, <a> starting the next: the space is lost in the build.
    if (/[A-Za-z0-9:.,]$/.test(a) && /^\s*<a[\s>]/.test(b)) {
      violations.push(`${file}:${i + 1}: text runs into a link on the next line`);
    }
    // </a> on one line, plain text starting the next: the space is lost.
    if (/\/a>[,.]?$/.test(a) && /^\s*[A-Za-z]/.test(b) && !/^\s*</.test(b)) {
      violations.push(`${file}:${i + 1}: text after a link starts on the next line`);
    }
  }
  checked++;
}

assert.deepEqual(violations, [], `Glued text/link lines found:\n${violations.join('\n')}`);

// Gas tariff table: rowspan fixed-charge cells must be top-aligned to their
// slab group, not vertically centred on a middle row.
const gasPage = readFileSync(join(SRC_DIR, 'pages', 'gas-bill-calculator.astro'), 'utf8');
assert.match(gasPage, /\.breakdown-table td\[rowspan\]\s*\{\s*vertical-align:\s*top;/);
assert.match(gasPage, /Sources: <a href="https:\/\/www\.ssgc\.com\.pk\/web\/\?page_id=103">SSGC domestic rates<\/a>, <a href="https:\/\/www\.ogra\.org\.pk\/consumer-gas-prices">OGRA consumer gas prices<\/a>, and the <a href="https:\/\/www\.sngpl\.com\.pk\/billcalc\.jsp\?mdids=92">SNGPL bill estimator<\/a>\./);
assert.match(gasPage, /rowspan="4">Rs 600 \/ month/);
assert.match(gasPage, /rowspan="3">Rs 1,500 \/ month/);
assert.match(gasPage, /rowspan="5">Rs 3,000 \/ month/);

// Homepage disclaimer link must carry its space on the same line.
const indexPage = readFileSync(join(SRC_DIR, 'pages', 'index.astro'), 'utf8');
assert.match(indexPage, /jeweller rates\. <a href="\/terms\/">Read the full disclaimer<\/a>\./);

// Top tool nav: the last label must be scrollable fully into view and the
// strip must signal that it scrolls instead of cutting a label mid-word.
const css = readFileSync(join(SRC_DIR, 'styles', 'global.css'), 'utf8');
assert.match(css, /\.tool-nav-scroll \{[^}]*padding-inline-end:\s*16px;/s);
assert.match(css, /\.tool-nav-scroll \{[^}]*scroll-snap-type:\s*x proximity;/s);
assert.match(css, /\.tool-nav-scroll a \{[^}]*scroll-snap-align:\s*start;/s);

console.log(`formatting: ${checked} .astro files scanned, no glued text/link lines; gas table + nav guards present.`);
