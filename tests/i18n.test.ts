// Urdu Phase 1 regression tests — homepage + navigation toggle.
// Run: npx tsx tests/i18n.test.ts
//
// Guards:
//   - every data-i18n key used in Layout.astro / index.astro has a
//     non-empty Urdu entry in public/js/i18n.js (26/26 tool labels,
//     26/26 card names + descriptions included);
//   - the toggle exists, is a plain <button> (no inline handler — the
//     CSP has no 'unsafe-inline' in script-src), and Layout loads the
//     external /js/i18n.js with defer;
//   - the toggle persists via localStorage and sets <html lang>;
//   - English is still the default: the built/source homepage keeps the
//     English hero H1 and all 26 English tool names;
//   - the Urdu font is self-hosted (font-src 'self' allows it, no
//     Google Fonts link) and stays light.
// DOM click behaviour is not unit-tested here (no jsdom harness in
// this repo) — it is covered by the live-browser click-through after
// deploy. The CSP test (tests/csp.test.ts) independently scans every
// .astro file for inline scripts / inline handlers.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

let checks = 0;
function check(cond: boolean, msg: string): void {
  checks += 1;
  assert.ok(cond, msg);
}

// --- 1. The dictionary ---------------------------------------------------
const i18nJs = readFileSync(join(ROOT, 'public', 'js', 'i18n.js'), 'utf8');
const dictBlock = i18nJs.match(/var UR = \{([\s\S]*?)\n  \};/);
assert.ok(dictBlock, 'i18n.js must define a var UR = { ... } dictionary');
const entries = [...dictBlock[1].matchAll(/'([^']+)':\s*'([^']*)'/g)];
const UR = new Map(entries.map((m) => [m[1], m[2]]));
check(UR.size >= 90, `dictionary must hold 90+ keys, found ${UR.size}`);
for (const [key, value] of UR) {
  check(value.trim().length > 0, `dictionary entry ${key} must be non-empty`);
  // GST is a Latin acronym kept as-is in the short nav label (the card
  // name adds the Urdu gloss: "GST کیلکولیٹر").
  if (key === 'tool.gst') {
    check(value === 'GST', 'tool.gst keeps the Latin acronym GST');
  } else {
    check(/[\u0600-\u06FF]/.test(value), `dictionary entry ${key} must contain Urdu script`);
  }
}

// The file must be plain, parseable JS (no TypeScript, no imports).
new Function(i18nJs);
check(i18nJs.includes("localStorage.getItem(STORAGE_KEY)"), 'i18n.js must read the saved language from localStorage');
check(i18nJs.includes("localStorage.setItem(STORAGE_KEY"), 'i18n.js must persist the language in localStorage');
check(i18nJs.includes('pfc-lang'), "i18n.js must use the 'pfc-lang' storage key");
check(i18nJs.includes('document.documentElement.lang'), 'i18n.js must set <html lang>');
check(i18nJs.includes("addEventListener('click'"), 'i18n.js must wire the toggle with addEventListener (no inline handler)');
check(!i18nJs.includes('onclick'), 'i18n.js must not use inline onclick');

// --- 2. Keys used in the templates ---------------------------------------
const layout = readFileSync(join(SRC, 'components', 'Layout.astro'), 'utf8');
const indexPage = readFileSync(join(SRC, 'pages', 'index.astro'), 'utf8');

function staticKeys(src: string): string[] {
  return [...src.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
}
function toolKeys(src: string): string[] {
  return [...src.matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1]);
}

const layoutTools = toolKeys(layout);
const indexTools = toolKeys(indexPage);
check(layoutTools.length === 26, `Layout must list 26 tool keys, found ${layoutTools.length}`);
check(indexTools.length === 26, `homepage must list 26 tool keys, found ${indexTools.length}`);
check(
  JSON.stringify([...layoutTools].sort()) === JSON.stringify([...indexTools].sort()),
  'Layout and homepage tool keys must match',
);

const used = new Set<string>([...staticKeys(layout), ...staticKeys(indexPage)]);
for (const k of layoutTools) used.add(`tool.${k}`);
for (const k of indexTools) {
  used.add(`card.${k}.name`);
  used.add(`card.${k}.desc`);
}
for (const key of [...used].sort()) {
  check(UR.has(key), `data-i18n key "${key}" is used but has no Urdu dictionary entry`);
}
// Tool labels, card names and descriptions: 26/26 each.
for (const k of layoutTools) {
  check((UR.get(`tool.${k}`) ?? '').length > 0, `tool label tool.${k} must have an Urdu translation`);
  check((UR.get(`card.${k}.name`) ?? '').length > 0, `card name card.${k}.name must have an Urdu translation`);
  check((UR.get(`card.${k}.desc`) ?? '').length > 0, `card desc card.${k}.desc must have an Urdu translation`);
}

// --- 3. Toggle + script wiring in Layout ---------------------------------
check(layout.includes('id="lang-toggle"'), 'Layout must contain the #lang-toggle button');
check(layout.includes('<button id="lang-toggle"'), 'the toggle must be a <button>, not a link');
check(layout.includes('type="button"'), 'the toggle button must have type="button"');
check(layout.includes('aria-pressed="false"'), 'the toggle must expose aria-pressed');
check(layout.includes('<script src="/js/i18n.js" defer>'), 'Layout must load /js/i18n.js with defer');
check(layout.includes('id="lang-note"') === false, 'the Urdu-only tools note lives on the homepage, not in Layout');
check(indexPage.includes('id="lang-note"'), 'homepage must contain the #lang-note element');
check(indexPage.includes('hidden>Calculators are currently in English'), 'the tools note must say plainly (in English) that calculators are still in English');
check(indexPage.includes('data-i18n="home.tools-note"'), 'the tools note must have a data-i18n key');

// --- 4. English default unchanged ----------------------------------------
// English strings stay in the HTML; JS only swaps textContent at runtime.
check(indexPage.includes('every rupee, worked out.'), 'homepage must keep the English hero H1');
const cardNames = [...indexPage.matchAll(/name:\s*'((?:[^'\\]|\\.)*)',\s*desc:/g)].map((m) => m[1].replace(/\\'/g, "'"));
check(cardNames.length === 26, `homepage must keep 26 English card names in source, found ${cardNames.length}`);
for (const name of cardNames) {
  // Names live in the tools array and render via {tool.name}.
  check(indexPage.includes(name), `English card name "${name}" must remain in the homepage source`);
}
// dir stays ltr by decision (layout stability); lang flips via JS.
check(layout.includes('<html lang="en">'), 'Layout must keep <html lang="en"> as the default');
check(!layout.includes('dir="rtl"'), 'Layout must not switch to dir="rtl" in Phase 1');

// --- 5. Self-hosted Urdu font --------------------------------------------
const fontPath = join(ROOT, 'public', 'fonts', 'noto-nastaliq-urdu-arabic.woff2');
check(existsSync(fontPath), 'public/fonts/noto-nastaliq-urdu-arabic.woff2 must exist');
const fontBytes = statSync(fontPath).size;
check(fontBytes > 100_000 && fontBytes < 500_000, `Urdu font must be a real subset (100–500 KB), found ${fontBytes} bytes`);
const css = readFileSync(join(SRC, 'styles', 'global.css'), 'utf8');
check(css.includes("@font-face"), 'global.css must declare the Urdu @font-face');
check(css.includes("url('/fonts/noto-nastaliq-urdu-arabic.woff2')"), '@font-face must point at the self-hosted woff2');
check(css.includes('html[lang="ur"] [data-i18n]'), 'global.css must apply the Urdu font only under html[lang="ur"]');
check(!css.includes('fonts.googleapis.com'), 'global.css must not reference Google Fonts (font-src is self-only)');
check(!layout.includes('fonts.googleapis.com'), 'Layout must not load a Google Fonts link (font-src is self-only)');
const headers = readFileSync(join(ROOT, 'public', '_headers'), 'utf8');
check(headers.includes("font-src 'self'"), "CSP font-src must stay 'self'");

// --- 6. Built homepage (only when dist is newer than the sources) ------
// npm test does not build, so a stale dist/ from before this change must
// not fail the suite — it just means "run npm run build first".
const distIndex = join(ROOT, 'dist', 'index.html');
if (existsSync(distIndex)) {
  const distTime = statSync(distIndex).mtimeMs;
  const srcTime = Math.max(
    statSync(join(SRC, 'components', 'Layout.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'index.astro')).mtimeMs,
    statSync(join(ROOT, 'public', 'js', 'i18n.js')).mtimeMs,
  );
  if (distTime >= srcTime) {
    const built = readFileSync(distIndex, 'utf8');
    check(built.includes('every rupee, worked out.'), 'built homepage must keep the English hero H1');
    for (const name of cardNames) {
      // "&" is escaped to "&amp;" in built HTML.
      check(built.includes(name.replace(/&/g, '&amp;')), `built homepage must keep English card name "${name}"`);
    }
    check(built.includes('id="lang-toggle"'), 'built homepage must contain the toggle button');
    check(built.includes('/js/i18n.js'), 'built homepage must load /js/i18n.js');
    check(built.includes('lang="en"'), 'built homepage must default to lang="en"');
  }
}

console.log(`i18n: ${checks} checks — ${used.size} data-i18n keys covered, 26/26 tool labels + card names + descriptions translated, font ${fontBytes} bytes.`);
