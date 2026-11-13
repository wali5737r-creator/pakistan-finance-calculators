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

// Nav completeness: the top tool nav (and the footer, which shares the same
// array) must list every tool. The 5 newest tools were missing from the nav
// even though their pages, homepage cards and sitemap entries existed.
const layout = readFileSync(join(SRC_DIR, 'components', 'Layout.astro'), 'utf8');
const navHrefs = [...layout.matchAll(/href:\s*'(\/[^']+\/)'/g)].map((m) => m[1]);
assert.equal(new Set(navHrefs).size, 24, `top nav must list 24 unique tools, found ${new Set(navHrefs).size}`);
for (const href of [
  '/gas-bill-calculator/',
  '/freelancer-tax-calculator/',
  '/solar-size-payback-calculator/',
  '/pension-eobi-calculator/',
  '/national-savings-calculator/',
  '/gst-calculator/',
]) {
  assert.ok(navHrefs.includes(href), `top nav is missing ${href}`);
}
// The homepage card list must match the nav — Solar was missing here too
// while the homepage copy already said "23 tools".
const cardHrefs = [...indexPage.matchAll(/href:\s*'(\/[^']+\/)'/g)].map((m) => m[1]);
assert.equal(new Set(cardHrefs).size, 24, `homepage must list 24 unique tool cards, found ${new Set(cardHrefs).size}`);
assert.ok(cardHrefs.includes('/solar-size-payback-calculator/'), 'homepage is missing the Solar card');
assert.ok(cardHrefs.includes('/gst-calculator/'), 'homepage is missing the GST card');

// Currency converter: each rate keeps its number and currency code together
// in one nowrap span, so a wrap can only happen at the "=" — never a lone
// "PKR"/"USD" on its own line. The sticky bar must actually hide (its
// display:flex used to override the hidden attribute, so it was rendered
// permanently and covered the footer) and must stay out of the footer's way.
const currencyPage = readFileSync(join(SRC_DIR, 'pages', 'currency-converter.astro'), 'utf8');
assert.ok(currencyPage.includes('.nowrap { white-space: nowrap; }'), 'currency page needs a .nowrap rule');
assert.ok(currencyPage.includes('<span class="nowrap">${escapeHtml(formatRate(d.rate))} ${escapeHtml(d.to)}</span>'), 'rate value and code must be in one nowrap span');
assert.ok(currencyPage.includes('<span class="nowrap">${escapeHtml(formatRate(d.inverseRate))} ${escapeHtml(d.from)}</span>'), 'inverse rate value and code must be in one nowrap span');
assert.ok(currencyPage.includes('#sticky-bar[hidden] { display: none; }'), 'sticky bar hidden attribute must actually hide it');
assert.ok(currencyPage.includes('IntersectionObserver'), 'sticky bar must hide when the footer is in view');
assert.ok(currencyPage.includes('syncStickyPadding'), 'body padding must match the measured bar height');
assert.ok(!currencyPage.includes('overflow-wrap: anywhere'), 'stat values must not break anywhere');

// Same sticky-bar bug, every page: Zakat used the identical #sticky-bar
// pattern — display:flex overriding hidden, a fixed 76px body padding, and
// no footer observer — so guard every sticky-bar page, not just currency.
const stickyPages = astroFiles(SRC_DIR)
  .map((f) => ({ file: f, src: readFileSync(f, 'utf8') }))
  .filter(({ src }) => src.includes('id="sticky-bar"'));
assert.ok(stickyPages.length >= 2, `expected at least 2 sticky-bar pages, found ${stickyPages.length}`);
for (const { file, src } of stickyPages) {
  assert.ok(src.includes('#sticky-bar[hidden] { display: none; }'), `${file}: sticky bar hidden attribute must actually hide it`);
  assert.ok(src.includes('IntersectionObserver'), `${file}: sticky bar must hide when the footer is in view`);
  assert.ok(src.includes('syncStickyPadding'), `${file}: body padding must match the measured bar height`);
  assert.ok(!src.includes("paddingBottom = '76px'"), `${file}: fixed 76px body padding must not come back`);
}

// Electricity Bill page: the tariff table must be rendered FROM the
// config (P1 fix), never from hard-coded rows — and both tables on the
// page must sit inside a .table-wrap so they scroll horizontally at
// 360px instead of overflowing the viewport.
const elecPage = readFileSync(join(SRC_DIR, 'pages', 'electricity-bill-calculator.astro'), 'utf8');
assert.ok(elecPage.includes("import { electricityTariffTableRows } from '../lib/calc'"), 'electricity page must import the config-driven table rows');
assert.ok(elecPage.includes('tariffRows.map((row)'), 'electricity tariff table must render from tariffRows');
assert.ok(!elecPage.includes('<tr><td>Up to 50 (lifeline)</td>'), 'electricity tariff table must not hard-code rows');
assert.ok(!elecPage.includes('<tr><td>Above 700</td>'), 'electricity tariff table must not hard-code rows');
assert.equal((elecPage.match(/<div class="table-wrap">/g) || []).length, 2, 'electricity page must wrap both tables in .table-wrap');

// 404 page: must link all 24 tools (it listed only 11 before the P1 fix).
const notFoundPage = readFileSync(join(SRC_DIR, 'pages', '404.astro'), 'utf8');
const notFoundHrefs = [...notFoundPage.matchAll(/href="(\/[^"]+\/)"/g)].map((m) => m[1]);
const toolHrefs = new Set(navHrefs);
for (const href of toolHrefs) {
  assert.ok(notFoundHrefs.includes(href), `404 page is missing ${href}`);
}

console.log(`formatting: ${checked} .astro files scanned, no glued text/link lines; gas table + nav guards present.`);
