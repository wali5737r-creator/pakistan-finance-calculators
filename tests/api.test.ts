// Unit tests for the Cloudflare Pages Functions (functions/api/rates.ts and
// functions/api/metals.ts). Run: npx tsx tests/api.test.ts
// (npm test runs tests/calc.test.ts only — see the report for that caveat.)
//
// Everything upstream is stubbed: global fetch, caches.default and
// Date.now are replaced per test and restored afterwards. No real network
// calls are made, no keys are used (the only key value is the literal
// test string 'TESTKEY'), and every rate/price figure below is a TEST
// INPUT ONLY — never a live rate, never site copy.
import assert from 'node:assert/strict';
import { onRequest as ratesOnRequest } from '../functions/api/rates';
import { onRequest as metalsOnRequest } from '../functions/api/metals';

const NOW = Date.parse('2026-11-13T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const iso = (ms: number) => new Date(ms).toISOString();

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`ok - ${name}`);
}
function approx(actual: number, expected: number, tol = 0.01) {
  assert.ok(Math.abs(actual - expected) <= tol, `expected ${expected} ± ${tol}, got ${actual}`);
}

type FetchImpl = (url: string, init?: unknown) => Response | Promise<Response>;

interface StubCtx {
  fetchCalls: string[];
  putCalls: { key: Request; value: Response }[];
}

// Installs stubbed globals for one test and restores them afterwards.
// `cached`: the Response caches.default.match() returns (null = no entry).
// `fetchImpl`: answers upstream calls; when omitted, fetch throws, so any
// unexpected upstream call fails the test instead of hitting the network.
async function withStubs(
  opts: { cached?: Response | null; fetchImpl?: FetchImpl },
  fn: (ctx: StubCtx) => Promise<void>,
): Promise<void> {
  const prevFetch = globalThis.fetch;
  const prevCaches = (globalThis as unknown as { caches?: unknown }).caches;
  const prevNow = Date.now;
  const fetchCalls: string[] = [];
  const putCalls: { key: Request; value: Response }[] = [];
  try {
    Date.now = () => NOW;
    (globalThis as unknown as { caches: unknown }).caches = {
      default: {
        match: async () => opts.cached ?? null,
        put: async (key: Request, value: Response) => {
          putCalls.push({ key, value });
        },
      },
    };
    globalThis.fetch = (async (input: unknown, init?: unknown) => {
      const url = String(input);
      fetchCalls.push(url);
      if (!opts.fetchImpl) throw new Error(`unexpected upstream fetch: ${url}`);
      return opts.fetchImpl(url, init);
    }) as typeof fetch;
    await fn({ fetchCalls, putCalls });
    // Let the fire-and-forget cache.put settle.
    await new Promise((resolve) => setTimeout(resolve, 0));
  } finally {
    globalThis.fetch = prevFetch;
    if (prevCaches === undefined) {
      delete (globalThis as unknown as { caches?: unknown }).caches;
    } else {
      (globalThis as unknown as { caches: unknown }).caches = prevCaches;
    }
    Date.now = prevNow;
  }
}

const req = (path: string, method = 'GET') =>
  new Request(`https://example.com${path}`, { method });
const ctx = (request: Request, env: Record<string, string> = {}) =>
  ({ request, env }) as never;

const json = async (res: Response) =>
  (res.status === 204 ? null : await res.json()) as Record<string, any>;

// --- Rates upstream stubs (test inputs only, NOT live rates) ---
const FULL_RATES = { USD: 1, PKR: 280, GBP: 0.8, EUR: 0.9, SAR: 3.75, AED: 3.67, AUD: 1.5, CAD: 1.35 };
function ratesUpstream(rates: Record<string, number>) {
  return () =>
    new Response(
      JSON.stringify({
        result: 'success',
        time_last_update_utc: 'Thu, 13 Nov 2026 00:00:01 +0000',
        time_next_update_utc: 'Fri, 14 Nov 2026 00:00:01 +0000',
        conversion_rates: rates,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
}
function ratesSnapshot(fetchedAtMs: number) {
  return new Response(
    JSON.stringify({
      pkrPerUnit: { PKR: 1, USD: 280, GBP: 350 },
      source: 'ExchangeRate-API',
      providerUpdatedAt: 'Thu, 13 Nov 2026 00:00:01 +0000',
      providerNextUpdateAt: 'Fri, 14 Nov 2026 00:00:01 +0000',
      fetchedAt: iso(fetchedAtMs),
      cachedAt: iso(fetchedAtMs),
    }),
    { status: 200 },
  );
}

// --- Rates ---
await check('rates: OPTIONS returns 204 without touching cache or upstream', async () => {
  await withStubs({}, async ({ fetchCalls }) => {
    const res = await ratesOnRequest(ctx(req('/api/rates', 'OPTIONS')));
    assert.equal(res.status, 204);
    assert.equal(await res.text(), '');
    assert.equal(fetchCalls.length, 0);
  });
});

await check('rates: POST returns 405 with Allow header', async () => {
  await withStubs({}, async ({ fetchCalls }) => {
    const res = await ratesOnRequest(ctx(req('/api/rates', 'POST')));
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('Allow'), 'GET, OPTIONS');
    assert.equal((await json(res)).status, 'error');
    assert.equal(fetchCalls.length, 0);
  });
});

await check('rates: 503 when key is missing and nothing is cached (no fetch)', async () => {
  await withStubs({}, async ({ fetchCalls }) => {
    const res = await ratesOnRequest(ctx(req('/api/rates'), {}));
    assert.equal(res.status, 503);
    const body = await json(res);
    assert.equal(body.status, 'unavailable');
    assert.ok(!('pkrPerUnit' in body), 'no rate is invented');
    assert.equal(fetchCalls.length, 0);
  });
});

await check('rates: fresh cached snapshot (<24h) is served, upstream untouched', async () => {
  await withStubs({ cached: ratesSnapshot(NOW - HOUR_MS) }, async ({ fetchCalls }) => {
    const res = await ratesOnRequest(ctx(req('/api/rates'), {}));
    assert.equal(res.status, 200);
    const body = await json(res);
    assert.equal(body.fresh, true);
    assert.equal(body.stale, false);
    assert.equal(body.cached, true);
    assert.equal(body.pkrPerUnit.USD, 280);
    assert.equal(body.pkrPerUnit.PKR, 1);
    assert.equal(fetchCalls.length, 0);
  });
});

await check('rates: stale cached snapshot (24h-7d) is served labelled stale', async () => {
  await withStubs({ cached: ratesSnapshot(NOW - 25 * HOUR_MS) }, async ({ fetchCalls }) => {
    const res = await ratesOnRequest(ctx(req('/api/rates'), {}));
    assert.equal(res.status, 200);
    const body = await json(res);
    assert.equal(body.fresh, false);
    assert.equal(body.stale, true);
    assert.equal(body.cached, true);
    assert.equal(fetchCalls.length, 0);
  });
});

await check('rates: cached snapshot exactly 24h old is stale, exactly 7d old is still served', async () => {
  await withStubs({ cached: ratesSnapshot(NOW - DAY_MS) }, async () => {
    const body = await json(await ratesOnRequest(ctx(req('/api/rates'), {})));
    assert.equal(body.fresh, false);
    assert.equal(body.stale, true);
  });
  await withStubs({ cached: ratesSnapshot(NOW - 7 * DAY_MS) }, async ({ fetchCalls }) => {
    const res = await ratesOnRequest(ctx(req('/api/rates'), {}));
    assert.equal(res.status, 200);
    assert.equal((await json(res)).stale, true);
    assert.equal(fetchCalls.length, 0);
  });
});

await check('rates: snapshot older than 7 days is NOT served (503 when no key)', async () => {
  await withStubs({ cached: ratesSnapshot(NOW - 8 * DAY_MS) }, async ({ fetchCalls }) => {
    const res = await ratesOnRequest(ctx(req('/api/rates'), {}));
    assert.equal(res.status, 503);
    assert.equal((await json(res)).status, 'unavailable');
    assert.equal(fetchCalls.length, 0);
  });
});

await check('rates: snapshot older than 7 days falls through to a refetch', async () => {
  await withStubs(
    { cached: ratesSnapshot(NOW - 8 * DAY_MS), fetchImpl: ratesUpstream(FULL_RATES) },
    async ({ fetchCalls, putCalls }) => {
      const res = await ratesOnRequest(ctx(req('/api/rates'), { EXCHANGE_RATE_API_KEY: 'TESTKEY' }));
      assert.equal(res.status, 200);
      const body = await json(res);
      assert.equal(body.fresh, true);
      assert.equal(body.cached, false);
      assert.equal(body.source, 'ExchangeRate-API');
      assert.equal(fetchCalls.length, 1);
      assert.ok(fetchCalls[0].includes('TESTKEY'), 'upstream called with the configured key');
      assert.equal(putCalls.length, 1, 'fresh snapshot is persisted to cache');
      const stored = await putCalls[0].value.json() as Record<string, any>;
      assert.equal(stored.pkrPerUnit.USD, 280);
    },
  );
});

await check('rates: upstream success derives PKR per unit through USD', async () => {
  await withStubs({ fetchImpl: ratesUpstream(FULL_RATES) }, async () => {
    const res = await ratesOnRequest(ctx(req('/api/rates'), { EXCHANGE_RATE_API_KEY: 'TESTKEY' }));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Cache-Control'), 'public, max-age=3600');
    const body = await json(res);
    // usdPerPkr 280; GBP: 280 / 0.8 = 350; EUR: 280 / 0.9; PKR is exactly 1.
    assert.equal(body.pkrPerUnit.PKR, 1);
    assert.equal(body.pkrPerUnit.USD, 280);
    assert.equal(body.pkrPerUnit.GBP, 350);
    approx(body.pkrPerUnit.EUR, 311.11);
    assert.equal(body.providerUpdatedAt, 'Thu, 13 Nov 2026 00:00:01 +0000');
    assert.equal(body.providerNextUpdateAt, 'Fri, 14 Nov 2026 00:00:01 +0000');
  });
});

await check('rates: upstream failure with no cache is a 503', async () => {
  await withStubs(
    { fetchImpl: () => new Response('bad gateway', { status: 502 }) },
    async () => {
      const res = await ratesOnRequest(ctx(req('/api/rates'), { EXCHANGE_RATE_API_KEY: 'TESTKEY' }));
      assert.equal(res.status, 503);
      assert.equal((await json(res)).status, 'unavailable');
    },
  );
  await withStubs(
    { fetchImpl: () => { throw new Error('network down'); } },
    async () => {
      const res = await ratesOnRequest(ctx(req('/api/rates'), { EXCHANGE_RATE_API_KEY: 'TESTKEY' }));
      assert.equal(res.status, 503);
      assert.equal((await json(res)).status, 'unavailable');
    },
  );
});

await check('rates: upstream response missing a currency is a 503', async () => {
  const { AUD: _omitted, ...withoutAud } = FULL_RATES;
  await withStubs({ fetchImpl: ratesUpstream(withoutAud) }, async ({ putCalls }) => {
    const res = await ratesOnRequest(ctx(req('/api/rates'), { EXCHANGE_RATE_API_KEY: 'TESTKEY' }));
    assert.equal(res.status, 503);
    assert.equal((await json(res)).status, 'unavailable');
    assert.equal(putCalls.length, 0, 'incomplete snapshot is not cached');
  });
});

await check('rates: upstream non-success result is a 503', async () => {
  await withStubs(
    { fetchImpl: () => new Response(JSON.stringify({ result: 'error' }), { status: 200 }) },
    async () => {
      const res = await ratesOnRequest(ctx(req('/api/rates'), { EXCHANGE_RATE_API_KEY: 'TESTKEY' }));
      assert.equal(res.status, 503);
    },
  );
});

// --- Metals upstream stubs (test inputs only, NOT live prices) ---
const CARAT_BODY = {
  price_gram_24k: '10000',
  price_gram_22k: '9000',
  price_gram_21k: '8000',
  price_gram_18k: '7000',
  timestamp: '2026-11-13T06:00:00Z',
};
const SILVER_BODY = { result: '1000' };
function metalsUpstream(caratStatus = 200, silverStatus = 200, caratBody: unknown = CARAT_BODY, silverBody: unknown = SILVER_BODY) {
  return (url: string) =>
    url.includes('/v1/carat')
      ? new Response(JSON.stringify(caratBody), { status: caratStatus })
      : new Response(JSON.stringify(silverBody), { status: silverStatus });
}
function metalsSnapshot(fetchedAtMs: number | null) {
  const body: Record<string, unknown> = {
    goldPerTola: 116640,
    silverPerTola: 11664,
    source: 'goldprice.dev',
    fresh: true,
    cached: false,
  };
  if (fetchedAtMs !== null) body.fetchedAt = iso(fetchedAtMs);
  return new Response(JSON.stringify(body), { status: 200 });
}

// --- Metals ---
await check('metals: OPTIONS returns 204 without touching cache or upstream', async () => {
  await withStubs({}, async ({ fetchCalls }) => {
    const res = await metalsOnRequest(ctx(req('/api/metals', 'OPTIONS')));
    assert.equal(res.status, 204);
    assert.equal(fetchCalls.length, 0);
  });
});

await check('metals: PUT returns 405 with Allow header', async () => {
  await withStubs({}, async ({ fetchCalls }) => {
    const res = await metalsOnRequest(ctx(req('/api/metals', 'PUT')));
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('Allow'), 'GET, OPTIONS');
    assert.equal(fetchCalls.length, 0);
  });
});

await check('metals: success returns per-tola figures as per-gram x 11.664', async () => {
  await withStubs({ fetchImpl: metalsUpstream() }, async ({ fetchCalls, putCalls }) => {
    const res = await metalsOnRequest(ctx(req('/api/metals'), {}));
    assert.equal(res.status, 200);
    const body = await json(res);
    approx(body.goldPerTola, 10000 * 11.664);
    approx(body.silverPerTola, 1000 * 11.664);
    assert.deepEqual(body.pricePerGramByKarat, { '24k': 10000, '22k': 9000, '21k': 8000, '18k': 7000 });
    assert.equal(body.source, 'goldprice.dev');
    assert.equal(body.creditUrl, 'https://goldprice.dev');
    assert.equal(body.providerTimestamp, '2026-11-13T06:00:00Z');
    assert.equal(body.fresh, true);
    assert.equal(body.cached, false);
    assert.equal(fetchCalls.length, 2, 'carat + silver are both fetched');
    assert.ok(fetchCalls.some((u) => u.includes('/v1/carat')));
    assert.ok(fetchCalls.some((u) => u.includes('from=XAG')));
    assert.equal(putCalls.length, 1, 'fresh snapshot is persisted to cache');
  });
});

await check('metals: configured key is sent as a Bearer token', async () => {
  const seen: unknown[] = [];
  await withStubs(
    {
      fetchImpl: (url, init) => {
        seen.push(init);
        return metalsUpstream()(url);
      },
    },
    async () => {
      const res = await metalsOnRequest(ctx(req('/api/metals'), { GOLDPRICE_API_KEY: 'TESTKEY' }));
      assert.equal(res.status, 200);
      assert.equal(seen.length, 2);
      for (const init of seen) {
        assert.equal((init as { headers: Record<string, string> }).headers.Authorization, 'Bearer TESTKEY');
      }
    },
  );
});

await check('metals: upstream failure with no cache is a 503 with upstreamStatuses', async () => {
  await withStubs({ fetchImpl: metalsUpstream(500, 500) }, async () => {
    const res = await metalsOnRequest(ctx(req('/api/metals'), {}));
    assert.equal(res.status, 503);
    const body = await json(res);
    assert.equal(body.status, 'unavailable');
    assert.deepEqual(body.upstreamStatuses, { carat: 500, silver: 500 });
  });
  await withStubs({ fetchImpl: metalsUpstream(200, 500) }, async () => {
    const body = await json(await metalsOnRequest(ctx(req('/api/metals'), {})));
    assert.deepEqual(body.upstreamStatuses, { carat: 200, silver: 500 });
  });
  await withStubs(
    { fetchImpl: () => { throw new Error('network down'); } },
    async () => {
      const res = await metalsOnRequest(ctx(req('/api/metals'), {}));
      assert.equal(res.status, 503);
      assert.deepEqual((await json(res)).upstreamStatuses, { carat: null, silver: null });
    },
  );
});

await check('metals: incomplete upstream payload (non-numeric price) is a 503', async () => {
  await withStubs(
    { fetchImpl: metalsUpstream(200, 200, { ...CARAT_BODY, price_gram_24k: 'not-a-number' }) },
    async ({ putCalls }) => {
      const res = await metalsOnRequest(ctx(req('/api/metals'), {}));
      assert.equal(res.status, 503);
      assert.equal(putCalls.length, 0, 'incomplete snapshot is not cached');
    },
  );
});

await check('metals: fresh cached snapshot (<24h) is served, upstream untouched', async () => {
  await withStubs({ cached: metalsSnapshot(NOW - HOUR_MS) }, async ({ fetchCalls }) => {
    const res = await metalsOnRequest(ctx(req('/api/metals'), {}));
    assert.equal(res.status, 200);
    const body = await json(res);
    assert.equal(body.fresh, true);
    assert.equal(body.stale, false);
    assert.equal(body.cached, true);
    assert.equal(body.goldPerTola, 116640);
    assert.equal(fetchCalls.length, 0);
  });
});

await check('metals: stale cached snapshot (24h-7d) is served labelled stale', async () => {
  await withStubs({ cached: metalsSnapshot(NOW - 25 * HOUR_MS) }, async ({ fetchCalls }) => {
    const res = await metalsOnRequest(ctx(req('/api/metals'), {}));
    assert.equal(res.status, 200);
    const body = await json(res);
    assert.equal(body.fresh, false);
    assert.equal(body.stale, true);
    assert.equal(body.cached, true);
    assert.equal(fetchCalls.length, 0);
  });
});

await check('metals: snapshot older than 7 days is NOT served — falls through to refetch', async () => {
  await withStubs(
    { cached: metalsSnapshot(NOW - 8 * DAY_MS), fetchImpl: metalsUpstream() },
    async ({ fetchCalls }) => {
      const res = await metalsOnRequest(ctx(req('/api/metals'), {}));
      assert.equal(res.status, 200);
      const body = await json(res);
      assert.equal(body.fresh, true);
      assert.equal(body.cached, false);
      assert.equal(fetchCalls.length, 2);
    },
  );
});

await check('metals: cached snapshot without fetchedAt is NOT served', async () => {
  await withStubs(
    { cached: metalsSnapshot(null), fetchImpl: metalsUpstream(500, 500) },
    async () => {
      const res = await metalsOnRequest(ctx(req('/api/metals'), {}));
      assert.equal(res.status, 503);
    },
  );
});

console.log(`\n${passed} checks passed.`);
