// Cache-Control regression tests — the 2026-11-13 long-cache work (audit P2).
// Run: npx tsx tests/cache-headers.test.ts
//
// Before this change, Cloudflare Pages served every static file with
// `public, max-age=0, must-revalidate`, so repeat visits re-downloaded
// every script, font and image. public/_headers now sets:
//   - /_astro/*            -> public, max-age=31536000, immutable
//     (Astro content-hashes these filenames, e.g. calc.BSFSJBk3.js, so a
//     new build gets a new URL and the old file can never go stale)
//   - /js/*, /fonts/*, /og-image.png, /favicon.svg
//                          -> public, max-age=3600, must-revalidate
//     (unhashed files that change on deploy — i18n.js alone carries 2,011
//     Urdu keys and grows every phase — so a year-long cache here would
//     serve stale files after a deploy)
//   - HTML pages and /api/* -> NO Cache-Control rule at all (pages must stay
//     fresh for rates/lastmod/new tools; the API Functions set their own
//     headers — /api/rates is no-store)
//
// These tests guard the invariant at the source level, so a future header
// edit that long-caches the wrong thing fails CI instead of silently
// serving stale calculators or rates.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const headers = readFileSync(join(ROOT, 'public', '_headers'), 'utf8');

// Parse the _headers file into rules: [{ pattern, headers: { name: value } }].
// A rule is a non-indented path line followed by indented `Name: value` lines.
// Comment lines (# ...) and blank lines are ignored.
interface Rule {
  pattern: string;
  headers: Map<string, string>;
}
const rules: Rule[] = [];
for (const raw of headers.split('\n')) {
  const line = raw.replace(/\r$/, '');
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (/^\s/.test(line)) {
    const m = line.trim().match(/^([^:]+):\s*(.+)$/);
    assert.ok(m, `malformed header line in public/_headers: ${line}`);
    assert.ok(rules.length > 0, `header line before any rule in public/_headers: ${line}`);
    rules[rules.length - 1].headers.set(m[1].toLowerCase(), m[2].trim());
  } else {
    rules.push({ pattern: line.trim(), headers: new Map() });
  }
}

function ruleFor(pattern: string): Rule {
  const r = rules.find((x) => x.pattern === pattern);
  assert.ok(r, `public/_headers must contain a rule for ${pattern}`);
  return r!;
}

function maxAge(cacheControl: string): number {
  const m = cacheControl.match(/max-age=(\d+)/);
  assert.ok(m, `Cache-Control is missing max-age: ${cacheControl}`);
  return Number(m[1]);
}

// --- 1. Hashed Astro bundles: 1 year, immutable --------------------------
const astro = ruleFor('/_astro/*');
const astroCC = astro.headers.get('cache-control');
assert.ok(astroCC, '/_astro/* must set Cache-Control');
assert.equal(maxAge(astroCC), 31536000, `/_astro/* must be max-age=31536000, got: ${astroCC}`);
assert.match(astroCC, /\bimmutable\b/, `/_astro/* must be immutable: ${astroCC}`);
assert.match(astroCC, /^\s*public\b/, `/_astro/* must be public: ${astroCC}`);

// The immutable rule must match real files: dist/_astro must contain hashed
// .js/.css (a hash is an 8+ char [A-Za-z0-9] suffix before the extension).
const distAstro = join(ROOT, 'dist', '_astro');
assert.ok(existsSync(distAstro), 'dist/_astro must exist — run `npm run build` first');
const hashed = readdirSync(distAstro).filter((f) => /\.[A-Za-z0-9_-]{8,}\.(js|css)$/.test(f));
assert.ok(hashed.length > 0, `dist/_astro must contain hashed bundles, found: ${readdirSync(distAstro).join(', ')}`);

// --- 2. Unhashed public files: 1 hour, never immutable, never 1 year -----
const SHORT = ['/js/*', '/fonts/*', '/og-image.png', '/favicon.svg'];
for (const pattern of SHORT) {
  const r = ruleFor(pattern);
  const cc = r.headers.get('cache-control');
  assert.ok(cc, `${pattern} must set Cache-Control`);
  assert.equal(maxAge(cc), 3600, `${pattern} must be max-age=3600, got: ${cc}`);
  assert.doesNotMatch(cc, /\bimmutable\b/, `${pattern} must NOT be immutable (file changes on deploy): ${cc}`);
  assert.match(cc, /must-revalidate/, `${pattern} must be must-revalidate: ${cc}`);
}
// The files these rules cover must actually exist.
for (const f of ['public/js/i18n.js', 'public/js/shared.js', 'public/fonts/noto-nastaliq-urdu-arabic.woff2', 'public/og-image.png', 'public/favicon.svg']) {
  assert.ok(existsSync(join(ROOT, f)), `${f} must exist (a Cache-Control rule covers it)`);
}

// --- 3. HTML pages and the API must NOT be long-cached --------------------
// No rule may set a Cache-Control with max-age > 3600 except /_astro/*.
for (const r of rules) {
  const cc = r.headers.get('cache-control');
  if (!cc) continue;
  if (r.pattern === '/_astro/*') continue;
  assert.ok(
    maxAge(cc) <= 3600,
    `${r.pattern} must not be long-cached (max-age=${maxAge(cc)}): ${cc}`,
  );
  assert.doesNotMatch(cc, /\bimmutable\b/, `${r.pattern} must not be immutable: ${cc}`);
}
// In particular, the catch-all /* rule (security headers) must carry NO
// Cache-Control at all, so HTML keeps Cloudflare's default
// (public, max-age=0, must-revalidate) and stays fresh.
const catchAll = ruleFor('/*');
assert.ok(!catchAll.headers.has('cache-control'), '/* must NOT set Cache-Control — HTML pages must stay fresh');
// And no rule may cover /api/* with any Cache-Control.
assert.ok(
  !rules.some((r) => r.pattern.startsWith('/api')),
  'no /api/* rule may exist in public/_headers — the Functions set their own headers',
);

// --- 4. The CSP header must still be intact (see tests/csp.test.ts) ------
// A light re-check here so a header edit that breaks the CSP fails this
// suite too, not only the CSP suite.
const cspLine = headers.split('\n').find((l) => l.includes('Content-Security-Policy:'));
assert.ok(cspLine, 'public/_headers must still contain a Content-Security-Policy line');
assert.doesNotMatch(
  cspLine,
  /script-src[^;]*'unsafe-inline'/,
  'script-src must not regain unsafe-inline',
);

console.log(
  `cache-headers: ${rules.length} rules — /_astro/* immutable 1y, ${SHORT.length} unhashed paths 1h, no Cache-Control on /* or /api/*, CSP intact.`,
);
