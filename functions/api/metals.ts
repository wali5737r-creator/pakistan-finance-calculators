// Cloudflare Pages Function: gold/silver prices (same-origin only).
// Upstream: MetalpriceAPI Free, daily refresh, one call returning XAU
// and XAG together. The API key lives ONLY in the Cloudflare
// environment secret METALPRICE_API_KEY — never in the repo or client
// code. No user input is read, logged, or forwarded here.
//
// Conversion (backend spec §3.3): the provider quotes USD per troy
// ounce. The adapter converts once, here, to PKR per tola using the
// currency snapshot's USD->PKR rate and 1 troy ounce = 31.1034768 g,
// 1 tola = 11.664 g. The frontend never sees troy ounces.
// If keys are missing or the upstream call fails with no cached
// snapshot, the response is an honest 503 unavailable — never an
// invented price. Manual-price mode on the Gold/Zakat pages remains
// available and is always labelled as the user's own price.
interface Env {
  METALPRICE_API_KEY?: string;
  EXCHANGE_RATE_API_KEY?: string;
}

const TROY_OUNCE_GRAMS = 31.1034768;
const TOLA_GRAMS = 11.664;
const STALE_LIMIT_MS = 7 * 24 * 60 * 60 * 1000;

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/metals', request.url).toString(), request);
  const cached = await cache.match(cacheKey);
  if (cached) {
    const body = (await cached.clone().json()) as Record<string, unknown> & { fetchedAt?: string };
    const ageMs = body.fetchedAt ? Date.now() - new Date(body.fetchedAt).getTime() : Number.POSITIVE_INFINITY;
    if (ageMs <= STALE_LIMIT_MS) {
      return jsonResponse({ ...body, fresh: ageMs < 24 * 60 * 60 * 1000, stale: ageMs >= 24 * 60 * 60 * 1000, cached: true });
    }
    // Older than 7 days: never serve it; fall through to refetch.
  }
  if (!env.METALPRICE_API_KEY || !env.EXCHANGE_RATE_API_KEY) {
    return jsonResponse({ status: 'unavailable', reason: 'Metal prices are not configured yet. Use your own price, clearly labelled, or try again later.' }, 503);
  }
  try {
    const [metalsRes, currencyRes] = await Promise.all([
      fetch(`https://api.metalpriceapi.com/v1/latest?base=USD&currencies=XAU,XAG&api_key=${env.METALPRICE_API_KEY}`, { headers: { Accept: 'application/json' } }),
      fetch(`https://v6.exchangerate-api.com/v6/${env.EXCHANGE_RATE_API_KEY}/latest/USD`, { headers: { Accept: 'application/json' } }),
    ]);
    if (!metalsRes.ok || !currencyRes.ok) throw new Error('Upstream status error');
    const metals = (await metalsRes.json()) as { success?: boolean; timestamp?: number; rates?: Record<string, number> };
    const currency = (await currencyRes.json()) as { result?: string; conversion_rates?: Record<string, number> };
    if (!metals.success || !metals.rates?.USDXAU || !metals.rates?.USDXAG) throw new Error('Metals response incomplete');
    if (currency.result !== 'success' || !currency.conversion_rates?.PKR) throw new Error('Currency response incomplete');
    const pkrPerUsd = currency.conversion_rates.PKR;
    const gramsPerTolaFactor = TOLA_GRAMS / TROY_OUNCE_GRAMS;
    const goldPerTola = metals.rates.USDXAU * pkrPerUsd * gramsPerTolaFactor;
    const silverPerTola = metals.rates.USDXAG * pkrPerUsd * gramsPerTolaFactor;
    const snapshot = {
      goldPerTola,
      silverPerTola,
      source: 'MetalpriceAPI',
      providerTimestamp: metals.timestamp ? new Date(metals.timestamp * 1000).toISOString() : null,
      fetchedAt: new Date().toISOString(),
      fresh: true,
      cached: false,
      note: 'International spot price, not a local Sarafa jeweller rate. Making charges, wastage, taxes and dealer spreads are not included.',
    };
    const response = jsonResponse(snapshot);
    response.headers.set('Cache-Control', 'public, max-age=3600');
    void cache.put(cacheKey, response.clone()).catch(() => undefined);
    return response;
  } catch {
    return jsonResponse({ status: 'unavailable', reason: 'The price source could not be reached and no recent snapshot is cached. No price is shown rather than a guessed price.' }, 503);
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function __staleLimitMs(): number {
  return STALE_LIMIT_MS;
}
