// CSP regression tests — the 2026-11-13 script-src tightening.
// Run: npx tsx tests/csp.test.ts
//
// Before this change, public/_headers had script-src 'self' 'unsafe-inline'
// https://s3.tradingview.com because Astro inlined two kinds of scripts:
// the shared copy/print handler in Layout.astro (no imports, so Astro
// inlined it on every page) and the two define:vars scripts (GST and
// National Savings), which Astro always inlines whole.
//
// The fix: the shared handler moved to public/js/shared.js, and the two
// define:vars scripts became plain bundled scripts that read their data
// from <script type="application/json"> data blocks (data blocks are not
// executed, so CSP script-src does not apply to them — same as the
// application/ld+json schema blocks). Every other tool script already had
// imports, so Astro bundled it to an external /_astro/*.js file.
//
// These tests guard the invariant at the source level, so a future inline
// script fails CI instead of silently re-opening script-src:
//   - every <script> in src/ must have a src=, be a JSON/JSON-LD data
//     block, or contain an import (Astro bundles import-bearing scripts
//     to external files) — and must NOT use define:vars (which forces
//     inlining even with imports).
//   - script-src in _headers must not contain 'unsafe-inline'.
//   - the TradingView host must stay allowed (Gold page loads it by
//     creating a <script src="https://s3.tradingview.com/..."> element).
// style-src tightening (2026-11-13, second half of the same audit item):
// 729 inline style="..." attributes across 33 files were replaced with
// .u-* utility classes in src/styles/global.css (audit: /tmp/style-src-audit.md
// — 91 canonical values, 726 covered by 80 classes; the 2 dynamic zakat bar
// widths and the 1 conditional currency headline use CSSOM setProperty /
// class toggles, which style-src does not block). The 22 inline <style>
// blocks (Astro inlines scoped component styles into dist HTML) became
// external src/styles/pages/<slug>.css files imported by their pages —
// each rule prefixed with a page-unique .pg-<slug> class so today's
// scoping is preserved (Astro only adds data-astro-cid attributes when a
// component has a <style> block). Known visible change: JS-generated
// `tr.total-row` rows in breakdown tables now match their page rule and
// render bold, where the old scoped rule never matched them — that is the
// intended look. These tests guard the invariant at the source level, so
// a future inline style fails CI instead of silently re-opening style-src.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'src');

// --- 1. The CSP header itself -------------------------------------------
const headers = readFileSync(join(ROOT, 'public', '_headers'), 'utf8');
const cspLine = headers.split('\n').find((l) => l.includes('Content-Security-Policy:'));
assert.ok(cspLine, 'public/_headers must contain a Content-Security-Policy line');
const csp = cspLine.split('Content-Security-Policy:')[1].trim();

function directive(name: string): string {
  const m = csp.match(new RegExp(`(?:^|;\\s*)${name}\\s+([^;]+)`));
  assert.ok(m, `CSP is missing ${name}`);
  return m[1].trim();
}

const scriptSrc = directive('script-src');
assert.doesNotMatch(scriptSrc, /'unsafe-inline'/, `script-src must not contain 'unsafe-inline': ${scriptSrc}`);
assert.match(scriptSrc, /(^|\s)'self'(\s|$)/, 'script-src must allow self (bundled /_astro/*.js + /js/shared.js)');
assert.ok(
  scriptSrc.includes('https://s3.tradingview.com'),
  'script-src must still allow s3.tradingview.com (Gold page widget)',
);
// frame-src must allow the TradingView widget iframe host (2026-11-13):
// the embed script (https://s3.tradingview.com/external-embedding/
// embed-widget-single-quote.js) builds its iframe at
// https://www.tradingview-widget.com/embed-widget/single-quote/ — NOT
// www.tradingview.com. Before this fix frame-src allowed only
// www.tradingview.com (since the initial commit), so the iframe was
// blocked by CSP and the widget rendered blank from the day it was
// added; TradingView's own fallback rewrites the iframe to
// https://s.tradingview.com, which frame-src also did not allow.
// Verified live 2026-11-13: both widget URLs return HTTP 200, so this
// was a CSP allowlist gap, not a TradingView outage.
const frameSrc = directive('frame-src');
assert.ok(
  frameSrc.includes('https://www.tradingview-widget.com'),
  `frame-src must allow www.tradingview-widget.com (Gold page widget iframe host): ${frameSrc}`,
);
assert.ok(
  frameSrc.includes('https://www.tradingview.com'),
  'frame-src must still allow www.tradingview.com (widget attribution links)',
);
// The Gold page must still load the widget the way the CSP expects:
// a dynamically created <script src="https://s3.tradingview.com/...">
// (script-src allows that host) with the iframe host above in frame-src.
const gold = readFileSync(join(SRC_DIR, 'pages', 'gold-price-calculator.astro'), 'utf8');
assert.ok(
  gold.includes("https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js"),
  'Gold page must load the TradingView single-quote embed script from s3.tradingview.com',
);
assert.ok(gold.includes('id="tvGoldWidget"'), 'Gold page must have the tvGoldWidget container');
assert.ok(gold.includes('id="tvGoldFallback"'), 'Gold page must have the tvGoldFallback paragraph');
// style-src must NOT contain 'unsafe-inline' any more — every inline
// style attribute and <style> block is gone (guarded in section 5 below).
const styleSrc = directive('style-src');
assert.doesNotMatch(styleSrc, /'unsafe-inline'/, `style-src must not contain 'unsafe-inline': ${styleSrc}`);
assert.match(styleSrc, /(^|\s)'self'(\s|$)/, 'style-src must allow self (global.css + per-page stylesheets)');
assert.doesNotMatch(
  headers,
  /style-src KEEPS 'unsafe-inline' deliberately/,
  'public/_headers must no longer claim style-src keeps unsafe-inline',
);

// --- 2. No inline executable script can reach the browser ----------------
function astroFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...astroFiles(p));
    else if (entry.name.endsWith('.astro')) out.push(p);
  }
  return out;
}

const DATA_BLOCK = /type\s*=\s*["']application\/(ld\+)?json["']/;
let checked = 0;
for (const file of astroFiles(SRC_DIR)) {
  const text = readFileSync(file, 'utf8');
  const rel = file.slice(ROOT.length + 1);
  assert.doesNotMatch(text, /<script[^>]*define:vars/, `${rel}: define:vars forces an inline script; use a JSON data block instead`);
  for (const m of text.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1];
    const body = m[2];
    if (/src\s*=/.test(attrs)) continue; // external file — covered by 'self'
    if (DATA_BLOCK.test(attrs)) continue; // data block — not executed
    // Otherwise Astro must bundle it: it does so only for scripts with
    // imports. A script without imports is inlined into the HTML.
    assert.ok(
      /^\s*import\s/m.test(body) || /\n\s*import\s/.test(body),
      `${rel}: inline <script> without imports would be inlined by Astro and blocked by the CSP — move it to an external file or add an import so it is bundled`,
    );
  }
  // No inline event-handler attributes (they are also blocked without
  // 'unsafe-inline' in script-src).
  assert.doesNotMatch(
    text,
    /\son(click|load|error|submit|input|change|focus|blur|keydown|keyup|mousedown|mouseup|mouseover|mouseout|scroll|toggle)="[^"]*"/,
    `${rel}: inline event-handler attribute would be blocked by the CSP — use addEventListener instead`,
  );
  checked += 1;
}

// --- 3. The external shared handler exists and does the job --------------
const shared = join(ROOT, 'public', 'js', 'shared.js');
assert.ok(existsSync(shared), 'public/js/shared.js must exist (Layout loads it)');
const sharedText = readFileSync(shared, 'utf8');
assert.ok(sharedText.includes('[data-copy-result]'), 'shared.js must handle copy-result buttons');
assert.ok(sharedText.includes('[data-print-result]'), 'shared.js must handle print-result buttons');
const sharedCode = sharedText.replace(/\/\/.*$/gm, '');
assert.doesNotMatch(sharedCode, /\bas\s+[A-Z]\w*/, 'shared.js is plain JS — no TypeScript casts allowed');
const layout = readFileSync(join(SRC_DIR, 'components', 'Layout.astro'), 'utf8');
assert.ok(layout.includes('<script src="/js/shared.js"'), 'Layout must load /js/shared.js');
assert.doesNotMatch(layout, /<script>\s*\n\s*\/\/ Shared copy\/print/, 'Layout must not contain the old inline shared script');

// --- 4. The two data-block pages still wire their data -------------------
const gst = readFileSync(join(SRC_DIR, 'pages', 'gst-calculator.astro'), 'utf8');
assert.ok(gst.includes('id="gstPresets"'), 'GST page must have the gstPresets JSON data block');
assert.ok(
  gst.includes("document.getElementById('gstPresets').textContent"),
  'GST script must read presets from the data block',
);
const nss = readFileSync(join(SRC_DIR, 'pages', 'national-savings-calculator.astro'), 'utf8');
assert.ok(nss.includes('id="nssSchemes"'), 'National Savings page must have the nssSchemes JSON data block');
assert.ok(
  nss.includes("document.getElementById('nssSchemes').textContent"),
  'National Savings script must read schemes from the data block',
);

// --- 5. No inline style can reach the browser --------------------------
// style-src 'self' blocks style="..." attributes and <style> elements,
// whether in the initial HTML or added later by JS (setAttribute('style')
// and innerHTML style attributes are blocked too). CSSOM assignments
// (el.style.foo = ...) are NOT blocked — the 7 existing ones (sticky-bar
// measured paddingBottom in currency + zakat, pill marginLeft in marla)
// and the zakat bar setProperty calls stay legal.
const globalCss = readFileSync(join(SRC_DIR, 'styles', 'global.css'), 'utf8');
const definedUtils = new Set([...globalCss.matchAll(/\.u-[A-Za-z0-9-]+/g)].map((m) => m[0]));
assert.ok(definedUtils.size >= 80, `global.css must define the .u-* utility classes (found ${definedUtils.size})`);
let styleChecked = 0;
for (const file of astroFiles(SRC_DIR)) {
  const text = readFileSync(file, 'utf8');
  const rel = file.slice(ROOT.length + 1);
  assert.doesNotMatch(text, /style\s*=\s*"/, `${rel}: inline style="..." would be blocked by style-src — use a .u-* utility class instead`);
  assert.doesNotMatch(text, /<style[\s>]/, `${rel}: inline <style> block would be blocked by style-src — move it to src/styles/pages/<slug>.css`);
  assert.doesNotMatch(text, /setAttribute\(\s*['"]style['"]/, `${rel}: setAttribute('style') is blocked by style-src — use CSSOM setProperty or a class toggle`);
  assert.doesNotMatch(text, /\.style\.cssText/, `${rel}: style.cssText is blocked by style-src — use CSSOM setProperty or a class toggle`);
  // Every .u-* class used must exist in global.css.
  for (const m of text.matchAll(/\.u-[A-Za-z0-9-]+/g)) {
    assert.ok(definedUtils.has(m[0]), `${rel}: uses ${m[0]} but global.css does not define it`);
  }
  styleChecked += 1;
}
// Astro must never inline stylesheets: its default inlineStylesheets
// 'auto' inlines per-page CSS into <style> tags in the HTML, which
// style-src 'self' would block. 'never' forces external /_astro/*.css.
const astroConfig = readFileSync(join(ROOT, 'astro.config.mjs'), 'utf8');
assert.ok(
  /inlineStylesheets\s*:\s*['"]never['"]/.test(astroConfig),
  "astro.config.mjs must set build.inlineStylesheets: 'never' or per-page CSS is inlined and blocked by style-src",
);

// Every former <style> block lives on as an imported per-page stylesheet.
const pageCssDir = join(SRC_DIR, 'styles', 'pages');
const pageCssFiles = existsSync(pageCssDir) ? readdirSync(pageCssDir).filter((f) => f.endsWith('.css')) : [];
assert.ok(pageCssFiles.length >= 22, `src/styles/pages/ must hold the 22 converted stylesheets (found ${pageCssFiles.length})`);
for (const cssFile of pageCssFiles) {
  const cssText = readFileSync(join(pageCssDir, cssFile), 'utf8');
  const slug = cssFile.replace(/\.css$/, '');
  const pageFile = slug === '_layout' ? join(SRC_DIR, 'components', 'Layout.astro') : join(SRC_DIR, 'pages', `${slug}.astro`);
  assert.ok(existsSync(pageFile), `no page imports ${cssFile} — expected ${pageFile}`);
  const pageText = readFileSync(pageFile, 'utf8');
  assert.ok(
    pageText.includes(`styles/pages/${cssFile}`),
    `${slug}: page must import its stylesheet src/styles/pages/${cssFile}`,
  );
  assert.doesNotMatch(cssText, /\[data-astro-cid/, `${cssFile}: must not contain data-astro-cid selectors copied from dist/`);
}

console.log(`csp: ${checked} .astro files scanned — script-src and style-src have no 'unsafe-inline', no inline script or style remains.`);
