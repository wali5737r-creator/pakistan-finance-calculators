// Cloudflare Pages Function: currency rates (same-origin only).
// Upstream: ExchangeRate-API v6 Free, daily refresh. The API key lives
// ONLY in the Cloudflare environment secret EXCHANGE_RATE_API_KEY —
// never in the repo, never in client code, never in a URL the browser
// fetches. No user input is read, logged, or forwarded here.
//
// Response contract (see backend spec §3.2): PKR per 1 unit of each
// launch currency, plus source name, provider timestamps, and freshness.
// If the key is not configured, or the upstream call fails and no
// snapshot is cached, the response is an honest 503 unavailable —
// never an invented or hard-coded rate.
interface Env {
  EXCHANGE_RATE_API_KEY?: string;
  ASSETS: Fetcher;
}

interface Snapshot {
  pkrPerUnit: Record<string, number>;
  source: string;
  providerUpdatedAt: string | null;
  providerNextUpdateAt: string | null;
  fetchedAt: string;
}

const CURRENCIES = ['PKR', 'USD', 'GBP', 'EUR', 'SAR', 'AED', 'AUD', 'CAD'];
const STALE_LIMIT_MS = 7 * 24 * 60 * 60 * 1000;

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/rates', request.url).toString(), request);
  const cached = await cache.match(cacheKey);
  if (cached) {
    const body = (await cached.clone().json()) as Snapshot & { cachedAt: string };
    const ageMs = Date.now() - new Date(body.fetchedAt).getTime();
    if (ageMs <= STALE_LIMIT_MS) {
      // Daily upstream data: fresh within 24h, stale (labelled) up to 7 days.
      return jsonResponse({ ...body, fresh: ageMs < 24 * 60 * 60 * 1000, stale: ageMs >= 24 * 60 * 60 * 1000, cached: true });
    }
    // Older than 7 days: never serve it; fall through to refetch.
  }
  if (!env.EXCHANGE_RATE_API_KEY) {
    return jsonResponse({ status: 'unavailable', reason: 'Rates are not configured yet. No rate is shown rather than a guessed rate.' }, 503);
  }
  try {
    const upstream = await fetch(
      `https://v6.exchangerate-api.com/v6/${env.EXCHANGE_RATE_API_KEY}/latest/USD`,
      { headers: { Accept: 'application/json' } },
    );
    if (!upstream.ok) throw new Error(`Upstream status ${upstream.status}`);
    const data = (await upstream.json()) as {
      result?: string;
      time_last_update_utc?: string;
      time_next_update_utc?: string;
      conversion_rates?: Record<string, number>;
    };
    if (data.result !== 'success' || !data.conversion_rates) throw new Error('Upstream response was not successful');
    const missing = CURRENCIES.filter((c) => !(c in data.conversion_rates!));
    if (missing.length > 0) throw new Error(`Upstream response is missing: ${missing.join(', ')}`);
    const usdPerPkr = data.conversion_rates.PKR;
    const pkrPerUnit: Record<string, number> = {};
    for (const code of CURRENCIES) {
      pkrPerUnit[code] = code === 'PKR' ? 1 : usdPerPkr / data.conversion_rates[code];
    }
    const snapshot: Snapshot & { cachedAt: string } = {
      pkrPerUnit,
      source: 'ExchangeRate-API',
      providerUpdatedAt: data.time_last_update_utc ?? null,
      providerNextUpdateAt: data.time_next_update_utc ?? null,
      fetchedAt: new Date().toISOString(),
      cachedAt: new Date().toISOString(),
    };
    const response = jsonResponse({ ...snapshot, fresh: true, cached: false });
    response.headers.set('Cache-Control', 'public, max-age=3600');
    contextWaitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch {
    return jsonResponse({ status: 'unavailable', reason: 'The rate source could not be reached and no recent snapshot is cached. No rate is shown rather than a guessed rate.' }, 503);
  }
}

function isFresh(body: { fetchedAt: string }): boolean {
  return Date.now() - new Date(body.fetchedAt).getTime() < STALE_LIMIT_MS;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function contextWaitUntil(promise: Promise<unknown>): void {
  // Pages Functions provide waitUntil on the context in production; in
  // local/dev contexts this is a no-op guard.
  void promise.catch(() => undefined);
}
