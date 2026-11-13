// Sitemap tests: every indexed URL must carry a real <lastmod>, and the
// sitemap must list exactly the pages that exist (except 404), so a new
// tool cannot ship without a sitemap entry and a lastmod. The committed
// file must also match what tools/generate-sitemap.mjs produces.
// Run: npx tsx tests/sitemap.test.ts
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const xml = readFileSync(join(ROOT, 'public', 'sitemap.xml'), 'utf8');

const entries = [...xml.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod><\/url>/g)];
const urls = entries.map((m) => m[1]);
const today = new Date().toISOString().slice(0, 10);

// Every <url> in the file must have a <lastmod> in YYYY-MM-DD form.
const rawUrls = [...xml.matchAll(/<url>/g)].length;
assert.equal(entries.length, rawUrls, 'every <url> must have a <loc> and a <lastmod>');
assert.equal(new Set(urls).size, urls.length, 'sitemap URLs must be unique');
for (const [, , lastmod] of entries) {
  assert.match(lastmod, /^\d{4}-\d{2}-\d{2}$/, `lastmod must be YYYY-MM-DD, got ${lastmod}`);
  assert.ok(!Number.isNaN(Date.parse(lastmod)), `lastmod must be a real date, got ${lastmod}`);
  assert.ok(lastmod <= today, `lastmod must not be in the future, got ${lastmod}`);
}

// The sitemap must list exactly the pages that exist (except 404.astro).
const expected = readdirSync(join(ROOT, 'src', 'pages'))
  .filter((f) => f.endsWith('.astro') && f !== '404.astro')
  .map((f) => {
    const slug = f.replace(/\.astro$/, '');
    return `https://pakistan-finance-calculators.pages.dev${slug === 'index' ? '/' : `/${slug}/`}`;
  });
assert.deepEqual(
  [...urls].sort(),
  [...expected].sort(),
  'sitemap URLs must match src/pages (except 404)',
);

// The committed file must match the generator output (run the generator
// after adding or changing a page).
execFileSync('node', [join(ROOT, 'tools', 'generate-sitemap.mjs'), '--check'], {
  cwd: ROOT,
  stdio: 'pipe',
});

console.log(`ok - sitemap: ${entries.length} URLs, all with a valid <lastmod>, matching src/pages`);
