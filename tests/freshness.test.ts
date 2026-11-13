// Unit tests for the extracted client freshness logic (src/lib/freshness.ts).
// Run: npx tsx tests/freshness.test.ts
// (npm test runs tests/calc.test.ts only — see the report for that caveat.)
// All timestamps below are TEST INPUTS ONLY.
import assert from 'node:assert/strict';
import {
  DAY_MS,
  STALE_LIMIT_MS,
  freshnessOf,
  goldFreshness,
} from '../src/lib/freshness';

const NOW = Date.parse('2026-11-13T12:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

// --- Currency freshnessOf (copied from currency-converter.astro) ---
check('currency: null / missing / untrusted timestamps are unavailable', () => {
  assert.equal(freshnessOf(null, NOW), 'unavailable');
  assert.equal(freshnessOf(undefined, NOW), 'unavailable');
  assert.equal(freshnessOf({}, NOW), 'unavailable');
  assert.equal(freshnessOf({ asOf: null }, NOW), 'unavailable');
  // No timezone suffix: untrusted, even though the date parses.
  assert.equal(freshnessOf({ asOf: '2026-11-13T12:00:00' }, NOW), 'unavailable');
  assert.equal(freshnessOf({ asOf: '2026-11-13 12:00:00' }, NOW), 'unavailable');
  assert.equal(freshnessOf({ asOf: 'not a date' }, NOW), 'unavailable');
  // Timezone suffix but unparseable.
  assert.equal(freshnessOf({ asOf: '2026-13-45T99:99:99Z' }, NOW), 'unavailable');
});

check('currency: future asOf is unavailable', () => {
  assert.equal(freshnessOf({ asOf: iso(NOW + 1000) }, NOW), 'unavailable');
  assert.equal(freshnessOf({ asOf: iso(NOW + DAY_MS) }, NOW), 'unavailable');
});

check('currency: 24h boundary — just under and exactly 24h are current', () => {
  assert.equal(freshnessOf({ asOf: iso(NOW - (DAY_MS - 1)) }, NOW), 'current');
  assert.equal(freshnessOf({ asOf: iso(NOW - DAY_MS) }, NOW), 'current');
  assert.equal(freshnessOf({ asOf: iso(NOW - 60 * 1000) }, NOW), 'current');
});

check('currency: just over 24h is stale', () => {
  assert.equal(freshnessOf({ asOf: iso(NOW - (DAY_MS + 1)) }, NOW), 'stale');
  assert.equal(freshnessOf({ asOf: iso(NOW - 2 * DAY_MS) }, NOW), 'stale');
});

check('currency: 7-day boundary — exactly 7 days is stale, just over is unavailable', () => {
  assert.equal(freshnessOf({ asOf: iso(NOW - (STALE_LIMIT_MS - 1)) }, NOW), 'stale');
  assert.equal(freshnessOf({ asOf: iso(NOW - STALE_LIMIT_MS) }, NOW), 'stale');
  assert.equal(freshnessOf({ asOf: iso(NOW - (STALE_LIMIT_MS + 1)) }, NOW), 'unavailable');
  assert.equal(freshnessOf({ asOf: iso(NOW - 8 * DAY_MS) }, NOW), 'unavailable');
});

check('currency: stale flag true forces stale even when fresh', () => {
  assert.equal(freshnessOf({ asOf: iso(NOW - 60 * 1000), stale: true }, NOW), 'stale');
  assert.equal(freshnessOf({ asOf: iso(NOW - 60 * 1000), stale: false }, NOW), 'current');
});

check('currency: provider next-update time passed forces stale', () => {
  // Fresh by age, but the provider said a newer rate was due.
  assert.equal(
    freshnessOf({ asOf: iso(NOW - 60 * 1000), nextUpdateAt: iso(NOW - 1000) }, NOW),
    'stale',
  );
  assert.equal(
    freshnessOf({ asOf: iso(NOW - 60 * 1000), nextUpdateAt: iso(NOW) }, NOW),
    'stale',
  );
  // Next update still in the future: current.
  assert.equal(
    freshnessOf({ asOf: iso(NOW - 60 * 1000), nextUpdateAt: iso(NOW + DAY_MS) }, NOW),
    'current',
  );
});

check('currency: next-update without timezone, or unparseable, is ignored', () => {
  assert.equal(
    freshnessOf({ asOf: iso(NOW - 60 * 1000), nextUpdateAt: '2026-11-13T11:00:00' }, NOW),
    'current',
  );
  assert.equal(
    freshnessOf({ asOf: iso(NOW - 60 * 1000), nextUpdateAt: 'not a date' }, NOW),
    'current',
  );
});

check('currency: stale flag beats a future next-update time', () => {
  assert.equal(
    freshnessOf(
      { asOf: iso(NOW - 60 * 1000), stale: true, nextUpdateAt: iso(NOW + DAY_MS) },
      NOW,
    ),
    'stale',
  );
});

check('currency: offset timestamps (+05:00) are trusted', () => {
  // 17:00 at +05:00 is 12:00 UTC == NOW.
  assert.equal(freshnessOf({ asOf: '2026-11-13T17:00:00+05:00' }, NOW), 'current');
});

// --- Gold goldFreshness (copied from gold-price-calculator.astro) ---
check('gold: fresh while asOf is under 24h old', () => {
  assert.equal(goldFreshness(NOW - 60 * 1000, NOW), 'current');
  assert.equal(goldFreshness(NOW - (DAY_MS - 1), NOW), 'current');
  assert.equal(goldFreshness(NOW, NOW), 'current');
});

check('gold: exactly 24h old is stale, not current', () => {
  assert.equal(goldFreshness(NOW - DAY_MS, NOW), 'stale');
  assert.equal(goldFreshness(NOW - (DAY_MS + 1), NOW), 'stale');
});

check('gold: 7-day boundary — exactly 7 days is stale, just over is unavailable', () => {
  assert.equal(goldFreshness(NOW - (STALE_LIMIT_MS - 1), NOW), 'stale');
  assert.equal(goldFreshness(NOW - STALE_LIMIT_MS, NOW), 'stale');
  assert.equal(goldFreshness(NOW - (STALE_LIMIT_MS + 1), NOW), 'unavailable');
  assert.equal(goldFreshness(NOW - 8 * DAY_MS, NOW), 'unavailable');
});

check('gold: timestamps more than 5 minutes in the future are unavailable', () => {
  const SKEW = 5 * 60 * 1000;
  assert.equal(goldFreshness(NOW + SKEW, NOW), 'current');
  assert.equal(goldFreshness(NOW + SKEW + 1, NOW), 'unavailable');
  assert.equal(goldFreshness(NOW + DAY_MS, NOW), 'unavailable');
});

check('gold: unparseable / non-finite timestamps are unavailable', () => {
  assert.equal(goldFreshness(Number.NaN, NOW), 'unavailable');
  assert.equal(goldFreshness(Date.parse('not a date'), NOW), 'unavailable');
  assert.equal(goldFreshness(NOW - 1000, NOW, Number.NaN), 'unavailable');
});

check('gold: fetchedAt is checked too — old fetch is not current', () => {
  // asOf fresh but fetched over 24h ago: not current; asOf within 7d: stale.
  assert.equal(goldFreshness(NOW - 1000, NOW, NOW - 2 * DAY_MS), 'stale');
  // Both fresh: current.
  assert.equal(goldFreshness(NOW - 1000, NOW, NOW - 1000), 'current');
  // fetchedAt more than 5 minutes in the future: unavailable.
  assert.equal(goldFreshness(NOW - 1000, NOW, NOW + 5 * 60 * 1000 + 1), 'unavailable');
});

console.log(`\n${passed} checks passed.`);
