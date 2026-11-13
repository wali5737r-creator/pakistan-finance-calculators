// Sitemap generator — run after adding or changing a page:
//   node tools/generate-sitemap.mjs
// It rewrites public/sitemap.xml from src/pages/*.astro (except 404.astro,
// which must never be indexed). Every URL gets a <lastmod>:
//   - the last commit date of that page's file (git log), if available;
//   - otherwise the file's last-modified date — a real date, never invented.
// Order is preserved from the existing sitemap so the diff stays small;
// a brand-new page is inserted at the end of the tool list, just before
// /about/. Workflow: edit pages, commit them, re-run this script, commit
// the sitemap. tests/sitemap.test.ts fails if a page is missing from the
// sitemap or any URL lacks a <lastmod>, so a new tool cannot ship without
// one. Run with --check to compare without writing (used by the test).
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES_DIR = join(ROOT, 'src', 'pages');
const SITEMAP_PATH = join(ROOT, 'public', 'sitemap.xml');
const BASE = 'https://pakistan-finance-calculators.pages.dev';
const INFO_PAGES = ['/about/', '/contact/', '/privacy/', '/terms/'];

function pageUrl(file) {
  const slug = file.replace(/\.astro$/, '');
  return slug === 'index' ? '/' : `/${slug}/`;
}

function lastmodFor(file) {
  const path = join(PAGES_DIR, file);
  try {
    const date = execSync(`git log -1 --format=%cs -- ${JSON.stringify(path)}`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  } catch {
    // Fall through to the file's own modified date.
  }
  return statSync(path).mtime.toISOString().slice(0, 10);
}

function existingOrder() {
  try {
    const xml = readFileSync(SITEMAP_PATH, 'utf8');
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(BASE, ''));
  } catch {
    return [];
  }
}

function buildSitemap() {
  const files = readdirSync(PAGES_DIR).filter((f) => f.endsWith('.astro') && f !== '404.astro');
  const dates = new Map(files.map((f) => [pageUrl(f), lastmodFor(f)]));
  const order = existingOrder().filter((u) => dates.has(u));
  for (const url of dates.keys()) {
    if (!order.includes(url)) {
      // New page: end of the tool list, just before the info pages.
      const at = order.findIndex((u) => INFO_PAGES.includes(u));
      if (at === -1) order.push(url);
      else order.splice(at, 0, url);
    }
  }
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- All indexed pages are listed (SEO plan §1): home, 26 tool pages, About, Contact, Privacy, Terms. -->',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  for (const url of order) {
    lines.push(`  <url><loc>${BASE}${url}</loc><lastmod>${dates.get(url)}</lastmod></url>`);
  }
  lines.push('</urlset>', '');
  return lines.join('\n');
}

const xml = buildSitemap();
if (process.argv.includes('--check')) {
  const current = readFileSync(SITEMAP_PATH, 'utf8');
  if (current !== xml) {
    console.error('public/sitemap.xml is out of date. Run: node tools/generate-sitemap.mjs');
    process.exit(1);
  }
  console.log('sitemap.xml is up to date.');
} else {
  writeFileSync(SITEMAP_PATH, xml);
  console.log(`Wrote public/sitemap.xml (${xml.split('\n').length - 5} URLs).`);
}
