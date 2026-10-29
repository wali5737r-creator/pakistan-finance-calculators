// Cloudflare Pages Function: gold/silver prices (same-origin only).
// Upstream: goldprice.dev Free plan, daily refresh. The /v1/carat and
// /v1/convert endpoints need no auth on the Free tier; if a
// GOLDPRICE_API_KEY secret is set it is sent as a Bearer token so
// calls are attributed to the account. The key lives ONLY in the
// Cloudflare environment secret — never in the repo or client code.
// No user input is read, logged, or forwarded here.
//
// Conversion: goldprice.dev returns per-gram prices directly in PKR
// (/v1/carat?currency=PKR) and silver per gram in PKR
// (/v1/convert?from=XAG&to=PKR&unit=gram). Per-tola figures are
// per-gram x 11.664 g. The frontend never sees troy ounces.
// Free-plan prices are 15 minutes delayed; the response carries that
// in its note, and the Gold page shows a visible credit link to
// goldprice.dev near the prices, as the Free plan requires.
// If the upstream call fails with no cached snapshot, the response
// is an honest 503 unavailable — never an invented price.
// Manual-price mode on the Gold/Zakat pages remains available and
// is always labelled as the user's own price.
interface Env {
  GOLDPRICE_API_KEY?: string;
}

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
  let caratStatus: number | null = null;
  let silverStatus: number | null = null;
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (env.GOLDPRICE_API_KEY) headers.Authorization = `Bearer ${env.GOLDPRICE_API_KEY}`;
    const [caratRes, silverRes] = await Promise.all([
      fetch('https://api.goldprice.dev/v1/carat?currency=PKR', { headers }),
      fetch('https://api.goldprice.dev/v1/convert?from=XAG&to=PKR&amount=1&unit=gram', { headers }),
    ]);
    caratStatus = caratRes.status;
    silverStatus = silverRes.status;
    if (!caratRes.ok || !silverRes.ok) throw new Error('Upstream status error');
    const carat = (await caratRes.json()) as Record<string, string>;
    const silver = (await silverRes.json()) as { result?: string };
    const goldPerGram = Number(carat.price_gram_24k);
    const silverPerGram = Number(silver.result);
    if (!Number.isFinite(goldPerGram) || goldPerGram <= 0 || !Number.isFinite(silverPerGram) || silverPerGram <= 0) {
      throw new Error('Metals response incomplete');
    }
    const snapshot = {
      goldPerTola: goldPerGram * TOLA_GRAMS,
      silverPerTola: silverPerGram * TOLA_GRAMS,
      pricePerGramByKarat: {
        '24k': goldPerGram,
        '22k': Number(carat.price_gram_22k),
        '21k': Number(carat.price_gram_21k),
        '18k': Number(carat.price_gram_18k),
      },
      source: 'goldprice.dev',
      creditUrl: 'https://goldprice.dev',
      providerTimestamp: typeof carat.timestamp === 'string' ? carat.timestamp : null,
      fetchedAt: new Date().toISOString(),
      fresh: true,
      cached: false,
      note: 'International spot price in PKR, 15 minutes delayed on the free plan, not a local Sarafa jeweller rate. Making charges, wastage, taxes and dealer spreads are not included.',
    };
    const response = jsonResponse(snapshot);
    response.headers.set('Cache-Control', 'public, max-age=3600');
    void cache.put(cacheKey, response.clone()).catch(() => undefined);
    return response;
  } catch (err) {
    return jsonResponse({ status: 'unavailable', reason: 'The price source could not be reached and no recent snapshot is cached. No price is shown rather than a guessed price.', upstreamStatuses: { carat: caratStatus, silver: silverStatus }, error: err instanceof Error ? err.message : String(err) }, 503);
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
