// Client freshness logic, extracted verbatim from the two pages that
// used it inline so it can be unit-tested. Pure functions only — no DOM,
// no fetch, no clock reads: the caller passes `nowMs` (Date.now()).
//
// Currency (currency-converter.astro `freshnessOf`): freshness is derived
// from the provider's next-update time when present, and from the
// endpoint's stale flag / 24-hour age otherwise. A snapshot is never shown
// as Current when any signal says it is stale. Past 7 days, or an
// untrustworthy timestamp, it is Unavailable.
//
// Gold (gold-price-calculator.astro `freshness()`): current only while
// BOTH the provider timestamp and the fetch time are under 24h old;
// stale while the provider timestamp is within 7 days; unavailable
// otherwise, including timestamps more than 5 minutes in the future
// (clock skew) or unparseable timestamps. The page keeps its own
// status check (`loading` / `unavailable`) around this function.

export type Freshness = 'current' | 'stale' | 'unavailable';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const STALE_LIMIT_MS = 7 * DAY_MS;

// Gold page constants, copied exactly (STALE_MAX_MS = 7 days).
export const GOLD_FRESH_MS = 24 * 60 * 60 * 1000;
export const GOLD_STALE_MAX_MS = 7 * 24 * 60 * 60 * 1000;
export const GOLD_SKEW_MS = 5 * 60 * 1000;

export interface CurrencyRateTable {
  asOf?: string | null;
  nextUpdateAt?: string | null;
  stale?: boolean;
}

// A timestamp is only trusted if it carries an explicit timezone
// (trailing Z or a ±hh:mm / ±hhmm offset), exactly as the page did.
const HAS_TIMEZONE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

export function freshnessOf(
  t: CurrencyRateTable | null | undefined,
  nowMs: number,
): Freshness {
  if (!t) return 'unavailable';
  const asOf = t.asOf;
  if (!asOf || !HAS_TIMEZONE.test(String(asOf).trim())) return 'unavailable';
  const asOfMs = Date.parse(asOf);
  if (!Number.isFinite(asOfMs)) return 'unavailable';
  const ageMs = nowMs - asOfMs;
  if (ageMs < 0) return 'unavailable';
  if (ageMs > STALE_LIMIT_MS) return 'unavailable';
  if (t.stale === true) return 'stale';
  if (t.nextUpdateAt) {
    const nextMs = Date.parse(t.nextUpdateAt);
    if (
      Number.isFinite(nextMs) &&
      HAS_TIMEZONE.test(String(t.nextUpdateAt).trim())
    ) {
      if (nowMs >= nextMs) return 'stale';
    }
  }
  if (ageMs > DAY_MS) return 'stale';
  return 'current';
}

// Gold freshness. `fetchedMs` is the /api/metals fetchedAt timestamp;
// when omitted it defaults to `asOfMs`, so a two-argument call behaves
// exactly like an asOf-only check. The page passes both timestamps.
export function goldFreshness(
  asOfMs: number,
  nowMs: number,
  fetchedMs: number = asOfMs,
): Freshness {
  if (!Number.isFinite(asOfMs) || !Number.isFinite(fetchedMs)) {
    return 'unavailable';
  }
  if (asOfMs - nowMs > GOLD_SKEW_MS || fetchedMs - nowMs > GOLD_SKEW_MS) {
    return 'unavailable';
  }
  if (nowMs - asOfMs < GOLD_FRESH_MS && nowMs - fetchedMs < GOLD_FRESH_MS) {
    return 'current';
  }
  if (nowMs - asOfMs <= GOLD_STALE_MAX_MS) return 'stale';
  return 'unavailable';
}
