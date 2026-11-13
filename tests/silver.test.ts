// Silver section tests: the Gold page must show a silver per-tola price
// from the same /api/metals source as gold, with honest Unavailable
// handling — never a guessed figure. The conversion itself is covered by
// tests/calc.test.ts (calcSilverPerTola); this file checks the page wiring.
// Run: npx tsx tests/silver.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(ROOT, 'src', 'pages', 'gold-price-calculator.astro'), 'utf8');

// The section exists, with the strip, badge, per-gram line, and credit.
for (const id of ['silverSection', 'silverStrip', 'silverStripText', 'silverStripBadge', 'silverPerGramLine', 'silverCredit']) {
  assert.ok(page.includes(`id="${id}"`), `gold page must contain #${id}`);
}
// The section reads silverPerTola from the same /api/metals response as gold.
assert.ok(page.includes('data.silverPerTola'), 'gold page must read silverPerTola from /api/metals');
// Unavailable is shown honestly, with no invented price.
assert.match(page, /Silver price unavailable/);
// The note explains how silver differs from gold (no karat system).
assert.match(page, /no karat system/);
assert.match(page, /industrial metal/);
// The silver FAQ is present (and therefore in the FAQPage schema).
assert.match(page, /What is the price of 1 tola of silver today\?/);

console.log('ok - gold page has a silver section wired to /api/metals with honest Unavailable handling');
