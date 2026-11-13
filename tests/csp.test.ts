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
// style-src DELIBERATELY keeps 'unsafe-inline': 727 inline style="..."
// attributes exist across src/ (plus style attributes built by JS at
// runtime). Removing it needs a full visual refactor, not a header change.
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
// style-src keeps 'unsafe-inline' on purpose — see the header comment above.
const styleSrc = directive('style-src');
assert.ok(styleSrc.includes("'unsafe-inline'"), 'style-src is expected to keep unsafe-inline (727 inline style attributes)');
assert.ok(
  headers.includes("style-src KEEPS 'unsafe-inline' deliberately"),
  'public/_headers must document why style-src keeps unsafe-inline',
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

console.log(`csp: ${checked} .astro files scanned — script-src has no 'unsafe-inline', no inline executable script remains.`);
