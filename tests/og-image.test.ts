// og:image tests: social platforms do not render SVG previews, so the
// shared image must be a real PNG (1200×630), and every page's og:image /
// twitter:image tags must point at it. The SVG stays in place as the
// source design. Run: npx tsx tests/og-image.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const png = readFileSync(join(ROOT, 'public', 'og-image.png'));

// PNG magic bytes.
assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// IHDR chunk: width and height are the first 8 bytes of its data.
assert.equal(png.toString('ascii', 12, 16), 'IHDR');
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
assert.equal(width, 1200, `og-image.png width must be 1200, got ${width}`);
assert.equal(height, 630, `og-image.png height must be 630, got ${height}`);

const layout = readFileSync(join(ROOT, 'src', 'components', 'Layout.astro'), 'utf8');
assert.match(layout, /og:image" content="https:\/\/pakistan-finance-calculators\.pages\.dev\/og-image\.png"/);
assert.match(layout, /twitter:image" content="https:\/\/pakistan-finance-calculators\.pages\.dev\/og-image\.png"/);
assert.doesNotMatch(layout, /og-image\.svg/, 'og:image must not point at the SVG');

console.log(`ok - og-image.png is a real PNG (${width}x${height}) and all tags point at it`);
