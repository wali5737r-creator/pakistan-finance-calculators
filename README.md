# Pakistan Finance Calculators — Live Site

[![CI](https://github.com/wali5737r-creator/pakistan-finance-calculators/actions/workflows/ci.yml/badge.svg)](https://github.com/wali5737r-creator/pakistan-finance-calculators/actions/workflows/ci.yml)

Astro + TypeScript + Tailwind CSS, static output for Cloudflare Pages.
Twenty-six free calculator tools, all calculations client-side, no accounts,
no stored inputs. Built from the specs in
`~/workspace/teams/pakistan-finance-calculators/` (SRS review, design
system, per-tool frontend specs with QA fixes applied, rates design,
SEO plan, content/security/launch handoff). The 26 tools: salary tax,
EMI, Zakat, currency, gold, percentage, age, unit/marla, fuel cost,
compound interest, loan eligibility, inflation, budget planner, debt
payoff, fixed deposit, loan comparison, goal savings, electricity bill,
gas bill, freelancer tax, solar size & payback, pension / EOBI, national
savings, GST, car loans, and home loans.

## Run locally

```sh
npm install
npm run dev        # http://localhost:4321
npm test           # calculation unit tests (tsx)
npm run build      # static output in dist/
npm run preview    # serve the built output
```

Without API keys configured, the currency and gold tools show their
honest Unavailable/manual-price states — never a guessed rate. The six
pure-arithmetic tools (tax, EMI, Zakat with entered prices, percentage,
age, area) work fully offline.

The Gold page also embeds a TradingView single-quote widget (XAUUSD, USD
per troy ounce) for display only, lazy-loaded when scrolled into view.
It never feeds the calculator and its price is never read or copied;
calculation still uses the live API price or a manually entered price.
The CSP in `public/_headers` allows the TradingView widget origins for
this purpose only, and the widget's "by TradingView" attribution is kept.

## Continuous integration

Every push to `main` and every pull request runs GitHub Actions CI
(`.github/workflows/ci.yml`): `npm ci`, `npm test`, `npm run build`.
Dependabot checks npm dependencies monthly
(`.github/dependabot.yml`). Deployment itself is Cloudflare Pages
connected to this repository (see below): pushing to `main` redeploys
the site automatically once the Pages project exists. No deploy
workflow or Cloudflare token lives in this repo.

## Deploy to Cloudflare Pages (free subdomain first)

1. Push this folder to a Git repository (do NOT commit any API key).
2. In Cloudflare Pages, create a project from the repository:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - The `functions/` directory at the project root is picked up
     automatically by Pages as Pages Functions.
3. The first deployment lands on a free `*.pages.dev` subdomain. Add a
   custom domain later from the Pages dashboard when one is chosen.
4. Replace the `[live-domain]` placeholder once, in one place:
   `src/components/Layout.astro` (canonical/OG URLs), `public/sitemap.xml`,
   and `public/robots.txt`. Every page's canonical, sitemap entry, and
   robots sitemap line use that token. Do not invent a domain in code.

## Environment variables (Cloudflare dashboard only — never in the repo)

| Variable | Purpose |
|---|---|
| `EXCHANGE_RATE_API_KEY` | ExchangeRate-API v6 Free key (currency rates). Server-side only. |
| `GOLDPRICE_API_KEY` | Optional goldprice.dev key (gold/silver prices). The goldprice.dev Free endpoints used by `/api/metals` need no key; if set, calls are attributed to the account. Server-side only. |

Set both in Pages → Settings → Environment variables (Production).
No key is ever written into code, docs, chat, or the client bundle;
the browser only ever calls the same-origin `/api/rates` and
`/api/metals` endpoints, which hold the keys server-side.

### Live test calls (required before launch — OQ-09)

1. Create both provider accounts under an account the owner controls.
   Record plan, quota, reset date, and attribution requirements with
   the date checked. Re-verify quotas/terms on implementation day —
   free-tier terms change.
2. Make one live server-side test call per provider (never from the
   browser, never with the key in a shared URL). Assert: currency call
   returns `success` with all 8 codes (PKR, USD, GBP, EUR, SAR, AED,
   AUD, CAD) present and finite; metals call returns `success` with
   XAU and XAG present and finite. Record timestamps and quota headers.
   Test-call rates are evidence only — never copy them into config
   or docs.
3. If either provider fails its test call, the named candidate is
   Metals.Dev for metals (see the backend spec); currency has no
   silent fallback — the stale cache / Unavailable state applies.

## Daily rate freshness rule (approved by the owner, 2026-10-28)

Both chosen free tiers publish updates **once per day**. The site
therefore fetches upstream once a day and serves snapshots with a
1-hour serving cache. A snapshot is labelled **Current** within 24
hours of its fetch; older snapshots are served only with a prominent
"Stale rate — last updated …" notice, for up to 7 days; after 7 days,
or if no snapshot exists, the tool shows **Unavailable** — never an
invented rate. A displayed result is frozen and never changes silently
when a newer rate arrives. The earlier 1-hour staleness derivation in
some frontend specs is superseded by this rule for the free tiers; a
paid hourly tier would need separate owner approval and is not assumed.

## EMI algorithm decision (QA Q-B1/Q-B2)

EMI is computed at full precision and displayed rounded to 2 decimals.
The amortisation schedule uses per-row rounding (interest rounded each
month, principal = EMI − interest), and the **final instalment is
adjusted** so the schedule sums exactly to the headline total and the
closing balance is zero. Headline totals are therefore schedule sums,
not unrounded-EMI × N, so the page never contradicts itself by a few
paisa; pages with tenure ≥ 240 months carry a visible rounding note.
Stall guard: if rounded interest consumes the whole EMI on a non-final
row, the calculation errors clearly instead of producing a schedule in
which the balance never falls. Caps: rate ≤ 100%, tenure ≤ 600 months.

## Config-driven values

One config file per changeable dataset, with value + effective date +
source citation. Changing next year's slabs is a config edit + QA
re-run, never a code rewrite:

- `src/config/tax.ts` — FBR 2026-27 salaried slabs.
- `src/config/zakat.ts` — nisab weights (87.48 g gold / 612.36 g silver), 2.5%.
- `src/config/units.ts` — area factors (Punjab revenue 272.25 sq ft/marla
  default + housing-society 225 sq ft/marla option, provisional).
- `src/config/currencies.ts` — 8 launch currencies and karat list.

## Remaining launch blockers (do not close by faking evidence)

1. **FBR citation (OQ-01) — CLOSED 2026-10-29.** Slabs re-verified
   against the Finance Act 2026 gazette; `SOURCE_CITATION` in
   `src/config/tax.ts` (Finance Act, 2026, Act No. XLIII of 2026,
   Gazette 26 June 2026, No. F.22(46)/2026-Legis.).
2. **Rate test calls + quota re-verification (OQ-09).** See above.
   Source names appear on live pages only after confirmation.
3. **Marla source (OQ-13) — CLOSED 2026-11-13.** Both standards now
   have citable official sources (see `src/config/units.ts`): the
   272.25 sq ft revenue figure from the CDA 2023 Regulation (S.R.O.
   886(I)/2023, Gazette of Pakistan, 7 July 2023) and the 225 sq ft
   society figure from DHA Lahore's Construction & Development
   Regulations 2014. No PLRA / Board of Revenue Punjab document
   stating 272.25 sq ft was found published online; the CDA Gazette
   defines the identical traditional revenue figures. The Provisional
   badge is removed. A 250 sq ft municipal variant reported in some
   CDA/Islamabad areas is deliberately not offered — no official
   source for it was found (CDA's 2023 Regulation defines 272.25).
4. **Working contact route (OQ-14).** The Contact page deliberately
   has no invented email address and no dead form. Confirm the contact
   address/form handling, then link it there.
5. **Built-page QA.** Formula vectors pass as unit tests, but mobile
   (360 px, no horizontal scroll), keyboard/screen-reader, print, and
   Core Web Vitals checks were NOT measured on a real device/browser
   and must be run against the production build before launch. The
   EMI long-tenure schedule-tolerance decision (Q-B1) is recorded
   above; QA must re-run schedule checks on the built page.
6. **Domain/brand.** Launch on the free Pages subdomain first; the
   `[live-domain]` placeholders must be replaced when a real domain
   is chosen. No brand/domain has been invented in code or copy.

## What was verified in this build

- `npm test`: 221 checks pass (13 November 2026) — every SRS worked example and boundary
  case (tax E1–E6 + boundary sweep, EMI E1–E4 + stall guard +
  240-month schedule, Zakat, currency cross-rates with test-injected
  tables only, gold E1–E4 with an illustrative test price, percentage
  E1–E7, age E1–E3 + month-end borrowing + 29 Feb rule, area E1–E4),
  plus the review-date tripwires, API/freshness behaviour, formatting
  guards, the config-driven electricity tariff table, and the
  SRS-consistency checks (SRS §1 salaried slabs, §5 Zakat constants,
  and the Addendum headline figures for all 16 post-v1.0 tools), plus car-loan (tenure caps, Rs 3m cap, worked example) and home-loan (commercial + two-phase Apna Ghar) checks.
- `npm run build`: passes; 32 pages (31 routes + 404) for 26 tools.
- Route smoke check (local server): all 31 routes return 200 with
  the correct H1; every tool page carries one JSON-LD block and a
  self-canonical link; visible FAQ count equals schema question count
  on all 26 tool pages.
- Grep: no hard-coded currency rate or gold price in `src/` or
  `functions/` outside config/test fixtures; no API key or secret
  anywhere in the repo; Functions files bundle cleanly with esbuild.
- NOT verified: real-device mobile layout, screen-reader pass, print
  output, Lighthouse/Core Web Vitals, live rate/metals payloads
  against configured keys, and the working contact form. See blockers.
