// Urdu Phase 1 + 2 + 3 + 4 + 5 regression tests — homepage + navigation toggle,
// plus the Phase 2 tax cluster (Salary, Freelancer, GST), the Phase 3
// loans cluster (EMI, Eligibility, Comparison, Car, Home), the Phase 4
// Zakat/savings cluster (Zakat, National Savings, Fixed Deposit) and the
// Phase 5 bills cluster (Electricity, Gas).
// Run: npx tsx tests/i18n.test.ts
//
// Guards:
//   - every data-i18n key used in Layout.astro / index.astro / the three
//     tax pages / the five loans pages / the three Zakat/savings pages
//     / the two bills pages
//     has a non-empty Urdu entry in public/js/i18n.js (26/26 tool labels,
//     26/26 card names + descriptions included, plus 58 salary + 73
//     freelancer + 99 GST + 71 EMI + 61 eligibility + 63 comparison +
//     108 car + 113 home + 96 zakat + 141 national-savings + 61
//     fixed-deposit + 63 electricity + 92 gas keys);
//   - the toggle exists, is a plain <button> (no inline handler — the
//     CSP has no 'unsafe-inline' in script-src), and Layout loads the
//     external /js/i18n.js with defer;
//   - the toggle persists via localStorage and sets <html lang>;
//   - English is still the default: the built/source homepage keeps the
//     English hero H1 and all 26 English tool names;
//   - the Urdu font is self-hosted (font-src 'self' allows it, no
//     Google Fonts link) and stays light.
// DOM click behaviour is not unit-tested here (no jsdom harness in
// this repo) — it is covered by the live-browser click-through after
// deploy. The CSP test (tests/csp.test.ts) independently scans every
// .astro file for inline scripts / inline handlers.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

let checks = 0;
function check(cond: boolean, msg: string): void {
  checks += 1;
  assert.ok(cond, msg);
}

// --- 1. The dictionary ---------------------------------------------------
const i18nJs = readFileSync(join(ROOT, 'public', 'js', 'i18n.js'), 'utf8');
const dictBlock = i18nJs.match(/var UR = \{([\s\S]*?)\n  \};/);
assert.ok(dictBlock, 'i18n.js must define a var UR = { ... } dictionary');
const entries = [...dictBlock[1].matchAll(/'([^']+)':\s*'([^']*)'/g)];
const UR = new Map(entries.map((m) => [m[1], m[2]]));
check(UR.size >= 1219, `dictionary must hold 1219+ keys, found ${UR.size}`);
for (const [key, value] of UR) {
  check(value.trim().length > 0, `dictionary entry ${key} must be non-empty`);
  // GST is a Latin acronym kept as-is in the short nav label (the card
  // name adds the Urdu gloss: "GST کیلکولیٹر").
  if (key === 'tool.gst') {
    check(value === 'GST', 'tool.gst keeps the Latin acronym GST');
  } else {
    check(/[\u0600-\u06FF]/.test(value), `dictionary entry ${key} must contain Urdu script`);
  }
}

// The file must be plain, parseable JS (no TypeScript, no imports).
new Function(i18nJs);
check(i18nJs.includes("localStorage.getItem(STORAGE_KEY)"), 'i18n.js must read the saved language from localStorage');
check(i18nJs.includes("localStorage.setItem(STORAGE_KEY"), 'i18n.js must persist the language in localStorage');
check(i18nJs.includes('pfc-lang'), "i18n.js must use the 'pfc-lang' storage key");
check(i18nJs.includes('document.documentElement.lang'), 'i18n.js must set <html lang>');
check(i18nJs.includes("addEventListener('click'"), 'i18n.js must wire the toggle with addEventListener (no inline handler)');
check(!i18nJs.includes('onclick'), 'i18n.js must not use inline onclick');

// --- 2. Keys used in the templates ---------------------------------------
const layout = readFileSync(join(SRC, 'components', 'Layout.astro'), 'utf8');
const indexPage = readFileSync(join(SRC, 'pages', 'index.astro'), 'utf8');
const salaryPage = readFileSync(join(SRC, 'pages', 'salary-income-tax-calculator.astro'), 'utf8');
const freelancerPage = readFileSync(join(SRC, 'pages', 'freelancer-tax-calculator.astro'), 'utf8');
const gstPage = readFileSync(join(SRC, 'pages', 'gst-calculator.astro'), 'utf8');
const taxPages = [salaryPage, freelancerPage, gstPage];
const emiPage = readFileSync(join(SRC, 'pages', 'emi-loan-calculator.astro'), 'utf8');
const eligPage = readFileSync(join(SRC, 'pages', 'loan-eligibility-calculator.astro'), 'utf8');
const compPage = readFileSync(join(SRC, 'pages', 'loan-comparison-calculator.astro'), 'utf8');
const carPage = readFileSync(join(SRC, 'pages', 'car-loan-calculator.astro'), 'utf8');
const homePage = readFileSync(join(SRC, 'pages', 'home-loan-calculator.astro'), 'utf8');
const loansPages = [emiPage, eligPage, compPage, carPage, homePage];
const zakatPage = readFileSync(join(SRC, 'pages', 'zakat-calculator.astro'), 'utf8');
const nssPage = readFileSync(join(SRC, 'pages', 'national-savings-calculator.astro'), 'utf8');
const fdPage = readFileSync(join(SRC, 'pages', 'fixed-deposit-calculator.astro'), 'utf8');
const savingsPages = [zakatPage, nssPage, fdPage];
const elecPage = readFileSync(join(SRC, 'pages', 'electricity-bill-calculator.astro'), 'utf8');
const gasPage = readFileSync(join(SRC, 'pages', 'gas-bill-calculator.astro'), 'utf8');
const billsPages = [elecPage, gasPage];

function staticKeys(src: string): string[] {
  return [...src.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
}
function toolKeys(src: string): string[] {
  return [...src.matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1]);
}

const layoutTools = toolKeys(layout);
const indexTools = toolKeys(indexPage);
check(layoutTools.length === 26, `Layout must list 26 tool keys, found ${layoutTools.length}`);
check(indexTools.length === 26, `homepage must list 26 tool keys, found ${indexTools.length}`);
check(
  JSON.stringify([...layoutTools].sort()) === JSON.stringify([...indexTools].sort()),
  'Layout and homepage tool keys must match',
);

const used = new Set<string>([...staticKeys(layout), ...staticKeys(indexPage)]);
for (const page of taxPages) for (const k of staticKeys(page)) used.add(k);
for (const page of loansPages) for (const k of staticKeys(page)) used.add(k);
for (const page of savingsPages) for (const k of staticKeys(page)) used.add(k);
for (const page of billsPages) for (const k of staticKeys(page)) used.add(k);
// Dynamic keys: the FAQ maps use indexed sal/fr/gst.faq${i}q/a keys, the
// GST preset options use gst.preset.${id} from src/config/gst.ts, and the
// related-tool cards use fr/gst.rel${i}(-desc).
for (let i = 1; i <= 5; i++) {
  used.add(`sal.faq${i}q`);
  used.add(`sal.faq${i}a`);
}
for (let i = 1; i <= 6; i++) {
  used.add(`fr.faq${i}q`);
  used.add(`fr.faq${i}a`);
  used.add(`gst.faq${i}q`);
  used.add(`gst.faq${i}a`);
}
const gstConfig = readFileSync(join(ROOT, 'src', 'config', 'gst.ts'), 'utf8');
for (const m of gstConfig.matchAll(/id: '([^']+)'/g)) used.add(`gst.preset.${m[1]}`);
for (let i = 1; i <= 2; i++) {
  used.add(`fr.rel${i}`);
  used.add(`fr.rel${i}-desc`);
  used.add(`gst.rel${i}`);
  used.add(`gst.rel${i}-desc`);
  used.add(`elig.rel${i}`);
  used.add(`elig.rel${i}-desc`);
  used.add(`comp.rel${i}`);
  used.add(`comp.rel${i}-desc`);
}
for (let i = 1; i <= 3; i++) {
  used.add(`car.rel${i}`);
  used.add(`car.rel${i}-desc`);
  used.add(`home.rel${i}`);
  used.add(`home.rel${i}-desc`);
}
// Dynamic keys: the FAQ maps use indexed emi/elig/comp/car/home.faq${i}q/a
// keys, and the related-tool cards use elig/comp/car/home.rel${i}(-desc).
for (let i = 1; i <= 5; i++) {
  used.add(`emi.faq${i}q`);
  used.add(`emi.faq${i}a`);
  used.add(`elig.faq${i}q`);
  used.add(`elig.faq${i}a`);
  used.add(`comp.faq${i}q`);
  used.add(`comp.faq${i}a`);
}
for (let i = 1; i <= 6; i++) {
  used.add(`car.faq${i}q`);
  used.add(`car.faq${i}a`);
  used.add(`home.faq${i}q`);
  used.add(`home.faq${i}a`);
}
// Dynamic keys: the FAQ maps use indexed zak/nss/fd.faq${i}q/a keys, and
// the related-tool cards use zak/nss/fd.rel${i}(-desc).
for (let i = 1; i <= 5; i++) {
  used.add(`zak.faq${i}q`);
  used.add(`zak.faq${i}a`);
}
for (let i = 1; i <= 6; i++) {
  used.add(`nss.faq${i}q`);
  used.add(`nss.faq${i}a`);
  used.add(`fd.faq${i}q`);
  used.add(`fd.faq${i}a`);
}
for (let i = 1; i <= 2; i++) {
  used.add(`zak.rel${i}`);
  used.add(`zak.rel${i}-desc`);
  used.add(`nss.rel${i}`);
  used.add(`nss.rel${i}-desc`);
  used.add(`fd.rel${i}`);
  used.add(`fd.rel${i}-desc`);
}
// Dynamic keys: the FAQ maps use indexed elec/gas.faq${i}q/a keys, and
// the related-tool cards use elec/gas.rel${i}(-desc).
for (let i = 1; i <= 6; i++) {
  used.add(`elec.faq${i}q`);
  used.add(`elec.faq${i}a`);
  used.add(`gas.faq${i}q`);
  used.add(`gas.faq${i}a`);
}
for (let i = 1; i <= 2; i++) {
  used.add(`elec.rel${i}`);
  used.add(`elec.rel${i}-desc`);
  used.add(`gas.rel${i}`);
  used.add(`gas.rel${i}-desc`);
}
check(salaryPage.includes('sal.faq${i + 1}q'), 'salary FAQ summaries must use indexed sal.faq keys');
check(freelancerPage.includes('fr.faq${i + 1}q'), 'freelancer FAQ summaries must use indexed fr.faq keys');
check(gstPage.includes('gst.faq${i + 1}q'), 'GST FAQ summaries must use indexed gst.faq keys');
check(gstPage.includes('gst.preset.${p.id}'), 'GST preset options must use gst.preset.${id} keys');
check(freelancerPage.includes('fr.rel${i + 1}'), 'freelancer related cards must use indexed fr.rel keys');
check(gstPage.includes('gst.rel${i + 1}'), 'GST related cards must use indexed gst.rel keys');
check(emiPage.includes('emi.faq${i + 1}q'), 'EMI FAQ summaries must use indexed emi.faq keys');
check(eligPage.includes('elig.faq${i + 1}q'), 'eligibility FAQ summaries must use indexed elig.faq keys');
check(compPage.includes('comp.faq${i + 1}q'), 'comparison FAQ summaries must use indexed comp.faq keys');
check(carPage.includes('car.faq${i + 1}q'), 'car FAQ summaries must use indexed car.faq keys');
check(homePage.includes('home.faq${i + 1}q'), 'home FAQ summaries must use indexed home.faq keys');
check(eligPage.includes('elig.rel${i + 1}'), 'eligibility related cards must use indexed elig.rel keys');
check(compPage.includes('comp.rel${i + 1}'), 'comparison related cards must use indexed comp.rel keys');
check(carPage.includes('car.rel${i + 1}'), 'car related cards must use indexed car.rel keys');
check(homePage.includes('home.rel${i + 1}'), 'home related cards must use indexed home.rel keys');
check(zakatPage.includes('zak.faq${i + 1}q'), 'zakat FAQ summaries must use indexed zak.faq keys');
check(nssPage.includes('nss.faq${i + 1}q'), 'national savings FAQ summaries must use indexed nss.faq keys');
check(fdPage.includes('fd.faq${i + 1}q'), 'fixed deposit FAQ summaries must use indexed fd.faq keys');
check(nssPage.includes('nss.rel${i + 1}'), 'national savings related cards must use indexed nss.rel keys');
check(fdPage.includes('fd.rel${i + 1}'), 'fixed deposit related cards must use indexed fd.rel keys');
check(elecPage.includes('elec.faq${i + 1}q'), 'electricity FAQ summaries must use indexed elec.faq keys');
check(gasPage.includes('gas.faq${i + 1}q'), 'gas FAQ summaries must use indexed gas.faq keys');
check(elecPage.includes('elec.rel${i + 1}'), 'electricity related cards must use indexed elec.rel keys');
check(gasPage.includes('gas.rel${i + 1}'), 'gas related cards must use indexed gas.rel keys');
// The comparison formula is pure symbols with <sup> (EMI = [P x R x ...]),
// the same in both languages, so it stays English and has no comp.f1 key.
check(compPage.includes('EMI = [P × R × (1 + R)<sup>N</sup>]'), 'comparison formula must keep its superscript form');
// The Urdu strings hard-code the November 2026 bands and check date
// (car.notice-*, car.rates-intro, home.notice-*, home.rates-intro): a
// band change must update them too.
const carLoanConfig = readFileSync(join(ROOT, 'src', 'config', 'car-loan.ts'), 'utf8');
check(carLoanConfig.includes('12.94%'), 'car-loan config must still quote 1-year KIBOR 12.94% — the Urdu notice hard-codes that figure');
check(carLoanConfig.includes('13.5%'), 'car-loan config must still quote the 13.5% band floor — the Urdu strings hard-code it');
const homeLoanConfig = readFileSync(join(ROOT, 'src', 'config', 'home-loan.ts'), 'utf8');
check(homeLoanConfig.includes('14.9–17.2%'), 'home-loan config must still quote the 14.9–17.2% band — the Urdu strings hard-code it');
// The Urdu strings hard-code tax year 2026-27 (sal.h1, sal.slab-h,
// sal.how3, fr.slabs-h): a year change must update them too.
const taxConfig = readFileSync(join(ROOT, 'src', 'config', 'tax.ts'), 'utf8');
check(taxConfig.includes("TAX_YEAR = '2026-27'"), "TAX_YEAR must still be 2026-27 — the Urdu strings hard-code that year");
// The Urdu strings hard-code the Zakat constants (2.5% rate, 87.48 g gold
// / 612.36 g silver nisab, 11.664 g per tola): a config change must update
// them too.
const zakatConfig = readFileSync(join(ROOT, 'src', 'config', 'zakat.ts'), 'utf8');
check(zakatConfig.includes('ZAKAT_RATE = 0.025'), 'zakat config must still set ZAKAT_RATE 0.025 — the Urdu strings hard-code 2.5%');
check(zakatConfig.includes('NISAB_GOLD_GRAMS = 87.48'), 'zakat config must still set gold nisab 87.48 g — the Urdu strings hard-code it');
check(zakatConfig.includes('NISAB_SILVER_GRAMS = 612.36'), 'zakat config must still set silver nisab 612.36 g — the Urdu strings hard-code it');
check(zakatConfig.includes('TOLA_GRAMS = 11.664'), 'zakat config must still set 11.664 g per tola — the Urdu strings hard-code it');
// The Urdu strings hard-code the CDNS rates w.e.f. 21 October 2026
// (DSC 11.94%, RIC 12.12%, BSC/PBA/SFWA 12.96%, SSC 12.00%/12.80%,
// SA 10.00%, WHT 15%/30%, Zakat nisab Rs 503,529): a CDNS revision
// must update them too. The NSS intro and formula f4 embed figures in
// the Urdu string itself, so those are pinned directly.
const nssConfig = readFileSync(join(ROOT, 'src', 'config', 'national-savings.ts'), 'utf8');
check(nssConfig.includes('ratePct: 11.94'), 'national-savings config must still quote DSC 11.94% — the Urdu strings hard-code it');
check(nssConfig.includes('ratePct: 12.12'), 'national-savings config must still quote RIC 12.12% — the Urdu strings hard-code it');
check(nssConfig.includes('ratePct: 12.96'), 'national-savings config must still quote BSC/PBA/SFWA 12.96% — the Urdu strings hard-code it');
check(nssConfig.includes('ratePct: 12.0'), 'national-savings config must still quote SSC 12.0% — the Urdu strings hard-code 12.00%/12.80%');
check(nssConfig.includes('ratePct: 10.0'), 'national-savings config must still quote Savings Account 10.0% — the Urdu strings hard-code 10.00%');
check(nssConfig.includes('503,529'), 'national-savings config must still quote Zakat nisab Rs 503,529 — the Urdu strings hard-code it');
check(nssConfig.includes("NATIONAL_SAVINGS_RATES_EFFECTIVE = '21 October 2026'"), "CDNS rates must still be w.e.f. 21 October 2026 — the Urdu strings hard-code that date");
check((UR.get('nss.intro-pre1') ?? '').includes('Rs 100,000'), 'nss.intro-pre1 must keep the Rs 100,000 figure — it is embedded in the Urdu string, not a separate literal');
check((UR.get('nss.f4') ?? '').includes('10.00%'), 'nss.f4 must keep the 10.00% figure — it is embedded in the Urdu string, not a separate literal');
check((UR.get('fd.ex-pre1') ?? '').includes('12%'), 'fd.ex-pre1 must keep the 12% figure — it is embedded in the Urdu string, not a separate literal');
// The Urdu strings hard-code the NEPRA tariff figures (S.R.O.
// 279(I)/2026, lifeline Rs 3.95/7.74, protected Rs 10.54/13.01, 201–300
// slab Rs 33.10, Rs 75 minimum, 18% GST, Time of Use peak Rs 46.85 /
// off-peak Rs 34.53): a tariff change must update them too. The
// electricity tariff table rows are config-driven and stay English.
const elecConfig = readFileSync(join(ROOT, 'src', 'config', 'electricity.ts'), 'utf8');
check(elecConfig.includes('S.R.O. 279(I)/2026'), 'electricity config must still cite S.R.O. 279(I)/2026 — the Urdu strings hard-code it');
check(elecConfig.includes('ratePerUnit: 3.95'), 'electricity config must still quote lifeline Rs 3.95 — the Urdu strings hard-code it');
check(elecConfig.includes('ratePerUnit: 7.74'), 'electricity config must still quote lifeline Rs 7.74 — the Urdu strings hard-code it');
check(elecConfig.includes('ratePerUnit: 10.54'), 'electricity config must still quote protected Rs 10.54 — the Urdu strings hard-code it');
check(elecConfig.includes('ratePerUnit: 13.01'), 'electricity config must still quote protected Rs 13.01 — the Urdu strings hard-code it');
check(elecConfig.includes('ratePerUnit: 33.1'), 'electricity config must still quote the 201–300 slab Rs 33.10 — the Urdu strings hard-code it');
check(elecConfig.includes('LIFELINE_MINIMUM_CHARGE = 75'), 'electricity config must still set the Rs 75 minimum — the Urdu strings hard-code it');
check(elecConfig.includes('ELECTRICITY_GST_RATE = 0.18'), 'electricity config must still set GST 18% — the Urdu strings hard-code it');
check((UR.get('elec.ex1-rest') ?? '').includes('Rs 11,003.50'), 'elec.ex1-rest must keep the Rs 11,003.50 total — it is embedded in the Urdu string, not a separate literal');
check((UR.get('elec.ex2-rest') ?? '').includes('Rs 2,719.31'), 'elec.ex2-rest must keep the Rs 2,719.31 total — it is embedded in the Urdu string, not a separate literal');
check((UR.get('elec.faq6a') ?? '').includes('Rs 46.85'), 'elec.faq6a must keep the Rs 46.85 peak Time of Use rate — it is embedded in the Urdu string, not a separate literal');
// The Urdu strings hard-code the OGRA gas figures (protected fixed
// Rs 600, non-protected Rs 1,500/3,000, 1.5 hm3 slab Rs 1,450, 2.0 hm3
// slab Rs 1,900, above 4 hm3 Rs 4,200, MMBTU divisor 281.7385, exact
// 3.5139 MMBTU per hm3): a tariff change must update them too.
const gasConfig = readFileSync(join(ROOT, 'src', 'config', 'gas.ts'), 'utf8');
check(gasConfig.includes('GAS_PROTECTED_FIXED_CHARGE = 600'), 'gas config must still set protected fixed Rs 600 — the Urdu strings hard-code it');
check(gasConfig.includes('GAS_NON_PROTECTED_FIXED_CHARGE_LOW = 1500'), 'gas config must still set non-protected fixed Rs 1,500 — the Urdu strings hard-code it');
check(gasConfig.includes('GAS_NON_PROTECTED_FIXED_CHARGE_HIGH = 3000'), 'gas config must still set non-protected fixed Rs 3,000 — the Urdu strings hard-code it');
check(gasConfig.includes('ratePerMmbtu: 1450'), 'gas config must still quote the 1.5 hm3 slab Rs 1,450 — the Urdu strings hard-code it');
check(gasConfig.includes('ratePerMmbtu: 1900'), 'gas config must still quote the 2.0 hm3 slab Rs 1,900 — the Urdu strings hard-code it');
check(gasConfig.includes('ratePerMmbtu: 4200'), 'gas config must still quote above-4 hm3 Rs 4,200 — the Urdu strings hard-code it');
check(gasConfig.includes('MMBTU_DIVISOR = 281.7385'), 'gas config must still set the MMBTU divisor 281.7385 — the Urdu strings hard-code it');
check(gasConfig.includes('3.5139 MMBTU'), 'gas config must still quote 3.5139 MMBTU per hm3 — the Urdu strings hard-code it');
check((UR.get('gas.ex1-rest') ?? '').includes('Rs 1,932.25'), 'gas.ex1-rest must keep the Rs 1,932.25 total — it is embedded in the Urdu string, not a separate literal');
check((UR.get('gas.ex2-rest') ?? '').includes('Rs 16,493.45'), 'gas.ex2-rest must keep the Rs 16,493.45 total — it is embedded in the Urdu string, not a separate literal');
check((UR.get('gas.ex-note') ?? '').includes('Rs 16,544.70'), 'gas.ex-note must keep the Rs 16,544.70 exact-conversion total — it is embedded in the Urdu string, not a separate literal');
// The bills pages have no script-rewritten static labels (all script
// text is dynamic results: breakdown, echo, formula, validation errors,
// and the gas helper's computed category), so like Fixed Deposit they
// need no __pfcAfterLang hook.
check(!elecPage.includes('__pfcAfterLang'), 'electricity page must not define a __pfcAfterLang hook — it has no script-rewritten static labels');
check(!gasPage.includes('__pfcAfterLang'), 'gas page must not define a __pfcAfterLang hook — it has no script-rewritten static labels');
// The electricity tariff table rows are config-driven
// (electricityTariffTableRows), so they carry no data-i18n; only the
// static headers switch. The gas table rows are static markup, so
// every row cell carries a data-i18n key.
check(!elecPage.includes('data-i18n="elec.row'), 'electricity tariff rows must stay English (config-driven) — no elec.row keys');
check(gasPage.includes('data-i18n="gas.row-p025"'), 'gas tariff table must translate its protected 0.25 hm3 row');
check(gasPage.includes('data-i18n="gas.row-np-above4"'), 'gas tariff table must translate its above-4 hm3 row');
check(gasPage.includes('data-i18n="gas.fixed-600"'), 'gas tariff table must translate its Rs 600 fixed-charge cell');
// Labels the calculator scripts rewrite (Salary amount / take-home,
// GST headline) are translated in the page scripts and refreshed via
// the __pfcAfterLang hook i18n.js calls after every language apply.
check(i18nJs.includes('__pfcAfterLang'), 'i18n.js must call the per-page __pfcAfterLang hook after applying the language');
check(salaryPage.includes('__pfcAfterLang'), 'salary page must define the __pfcAfterLang hook for its script-managed labels');
check(gstPage.includes('__pfcAfterLang'), 'GST page must define the __pfcAfterLang hook for its headline label');
// Labels the loans scripts rewrite (EMI total-months / schedule-toggle /
// show-all, Car tenure hint, Home mode hints / rate label / headline
// label) are translated in the page scripts and refreshed via the hook.
check(emiPage.includes('__pfcAfterLang'), 'EMI page must define the __pfcAfterLang hook for its script-managed labels');
check(carPage.includes('__pfcAfterLang'), 'car page must define the __pfcAfterLang hook for its tenure hint');
check(homePage.includes('__pfcAfterLang'), 'home page must define the __pfcAfterLang hook for its mode hints and headline label');
// Labels the Zakat/savings scripts rewrite (Zakat empty-result state and
// static formula line, National Savings filer hint) are translated in the
// page scripts and refreshed via the hook. Fixed Deposit has no
// script-rewritten static labels, so it needs no hook.
check(zakatPage.includes('__pfcAfterLang'), 'zakat page must define the __pfcAfterLang hook for its empty state and formula line');
check(nssPage.includes('__pfcAfterLang'), 'national savings page must define the __pfcAfterLang hook for its filer hint');
check(zakatPage.includes('زکوٰۃ واجب'), 'zakat page script must carry the Urdu empty-result heading');
check(zakatPage.includes('خالص دولت ×'), 'zakat page script must carry the Urdu static formula line');
check(nssPage.includes('ودہولڈنگ ٹیکس کٹتا ہے'), 'national savings page script must carry the Urdu filer hint');
// Each tax page carries the Urdu-only note that the other tools are
// still English in this phase (same hidden-until-Urdu pattern as home).
for (const [name, page] of [['salary', salaryPage], ['freelancer', freelancerPage], ['gst', gstPage]] as const) {
  check(page.includes('id="lang-note"'), `${name} page must contain the #lang-note element`);
  check(page.includes('data-i18n="tax.others-note"'), `${name} page note must use the tax.others-note key`);
}
// Each loans page carries the same Urdu-only note (same key, same pattern).
for (const [name, page] of [['emi', emiPage], ['eligibility', eligPage], ['comparison', compPage], ['car', carPage], ['home', homePage]] as const) {
  check(page.includes('id="lang-note"'), `${name} page must contain the #lang-note element`);
  check(page.includes('data-i18n="tax.others-note"'), `${name} page note must use the tax.others-note key`);
}
// Each Zakat/savings page carries the same Urdu-only note.
for (const [name, page] of [['zakat', zakatPage], ['national-savings', nssPage], ['fixed-deposit', fdPage]] as const) {
  check(page.includes('id="lang-note"'), `${name} page must contain the #lang-note element`);
  check(page.includes('data-i18n="tax.others-note"'), `${name} page note must use the tax.others-note key`);
}
// Each bills page carries the same Urdu-only note.
for (const [name, page] of [['electricity', elecPage], ['gas', gasPage]] as const) {
  check(page.includes('id="lang-note"'), `${name} page must contain the #lang-note element`);
  check(page.includes('data-i18n="tax.others-note"'), `${name} page note must use the tax.others-note key`);
}
for (const k of layoutTools) used.add(`tool.${k}`);
for (const k of indexTools) {
  used.add(`card.${k}.name`);
  used.add(`card.${k}.desc`);
}
for (const key of [...used].sort()) {
  check(UR.has(key), `data-i18n key "${key}" is used but has no Urdu dictionary entry`);
}
// Tool labels, card names and descriptions: 26/26 each.
for (const k of layoutTools) {
  check((UR.get(`tool.${k}`) ?? '').length > 0, `tool label tool.${k} must have an Urdu translation`);
  check((UR.get(`card.${k}.name`) ?? '').length > 0, `card name card.${k}.name must have an Urdu translation`);
  check((UR.get(`card.${k}.desc`) ?? '').length > 0, `card desc card.${k}.desc must have an Urdu translation`);
}

// --- 3. Toggle + script wiring in Layout ---------------------------------
check(layout.includes('id="lang-toggle"'), 'Layout must contain the #lang-toggle button');
check(layout.includes('<button id="lang-toggle"'), 'the toggle must be a <button>, not a link');
check(layout.includes('type="button"'), 'the toggle button must have type="button"');
check(layout.includes('aria-pressed="false"'), 'the toggle must expose aria-pressed');
check(layout.includes('<script src="/js/i18n.js" defer>'), 'Layout must load /js/i18n.js with defer');
check(layout.includes('id="lang-note"') === false, 'the Urdu-only tools note lives on the homepage, not in Layout');
check(indexPage.includes('id="lang-note"'), 'homepage must contain the #lang-note element');
check(indexPage.includes('hidden>Tax, loans, Zakat/savings and bills calculators are now available in Urdu'), 'the tools note must say plainly (in English) that the tax, loans, Zakat/savings and bills calculators are now in Urdu and the rest follow');
check(indexPage.includes('data-i18n="home.tools-note"'), 'the tools note must have a data-i18n key');

// --- 4. English default unchanged ----------------------------------------
// English strings stay in the HTML; JS only swaps textContent at runtime.
check(indexPage.includes('every rupee, worked out.'), 'homepage must keep the English hero H1');
const cardNames = [...indexPage.matchAll(/name:\s*'((?:[^'\\]|\\.)*)',\s*desc:/g)].map((m) => m[1].replace(/\\'/g, "'"));
check(cardNames.length === 26, `homepage must keep 26 English card names in source, found ${cardNames.length}`);
for (const name of cardNames) {
  // Names live in the tools array and render via {tool.name}.
  check(indexPage.includes(name), `English card name "${name}" must remain in the homepage source`);
}
// dir stays ltr by decision (layout stability); lang flips via JS.
check(layout.includes('<html lang="en">'), 'Layout must keep <html lang="en"> as the default');
check(!layout.includes('dir="rtl"'), 'Layout must not switch to dir="rtl" in Phase 1');

// --- 5. Self-hosted Urdu font --------------------------------------------
const fontPath = join(ROOT, 'public', 'fonts', 'noto-nastaliq-urdu-arabic.woff2');
check(existsSync(fontPath), 'public/fonts/noto-nastaliq-urdu-arabic.woff2 must exist');
const fontBytes = statSync(fontPath).size;
check(fontBytes > 100_000 && fontBytes < 500_000, `Urdu font must be a real subset (100–500 KB), found ${fontBytes} bytes`);
const css = readFileSync(join(SRC, 'styles', 'global.css'), 'utf8');
check(css.includes("@font-face"), 'global.css must declare the Urdu @font-face');
check(css.includes("url('/fonts/noto-nastaliq-urdu-arabic.woff2')"), '@font-face must point at the self-hosted woff2');
check(css.includes('html[lang="ur"] [data-i18n]'), 'global.css must apply the Urdu font only under html[lang="ur"]');
check(!css.includes('fonts.googleapis.com'), 'global.css must not reference Google Fonts (font-src is self-only)');
check(!layout.includes('fonts.googleapis.com'), 'Layout must not load a Google Fonts link (font-src is self-only)');
const headers = readFileSync(join(ROOT, 'public', '_headers'), 'utf8');
check(headers.includes("font-src 'self'"), "CSP font-src must stay 'self'");

// --- 6. Built homepage + tax + loans pages (only when dist is newer) ---
const distIndex = join(ROOT, 'dist', 'index.html');
if (existsSync(distIndex)) {
  const distTime = statSync(distIndex).mtimeMs;
  const srcTime = Math.max(
    statSync(join(SRC, 'components', 'Layout.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'index.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'salary-income-tax-calculator.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'freelancer-tax-calculator.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'gst-calculator.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'emi-loan-calculator.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'loan-eligibility-calculator.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'loan-comparison-calculator.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'car-loan-calculator.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'home-loan-calculator.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'zakat-calculator.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'national-savings-calculator.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'fixed-deposit-calculator.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'electricity-bill-calculator.astro')).mtimeMs,
    statSync(join(SRC, 'pages', 'gas-bill-calculator.astro')).mtimeMs,
    statSync(join(ROOT, 'public', 'js', 'i18n.js')).mtimeMs,
  );
  if (distTime >= srcTime) {
    const built = readFileSync(distIndex, 'utf8');
    check(built.includes('every rupee, worked out.'), 'built homepage must keep the English hero H1');
    for (const name of cardNames) {
      // "&" is escaped to "&amp;" in built HTML.
      check(built.includes(name.replace(/&/g, '&amp;')), `built homepage must keep English card name "${name}"`);
    }
    check(built.includes('id="lang-toggle"'), 'built homepage must contain the toggle button');
    check(built.includes('/js/i18n.js'), 'built homepage must load /js/i18n.js');
    check(built.includes('lang="en"'), 'built homepage must default to lang="en"');
    check(built.includes('Tax, loans, Zakat/savings and bills calculators are now available in Urdu'), 'built homepage note must say the tax, loans, Zakat/savings and bills calculators are in Urdu');
    // Built tax pages: English default intact, Urdu keys wired.
    const builtTax: Array<[string, string, string]> = [
      ['salary-income-tax-calculator', 'Salary / Income Tax Calculator Pakistan 2026-27', 'sal.h1'],
      ['freelancer-tax-calculator', 'Freelancer Tax Calculator', 'fr.h1'],
      ['gst-calculator', 'GST Calculator Pakistan', 'gst.h1'],
    ];
    for (const [slug, h1, key] of builtTax) {
      const pagePath = join(ROOT, 'dist', slug, 'index.html');
      check(existsSync(pagePath), `built ${slug} page must exist`);
      const pageBuilt = readFileSync(pagePath, 'utf8');
      check(pageBuilt.includes(h1), `built ${slug} page must keep the English H1`);
      check(pageBuilt.includes(`data-i18n="${key}"`), `built ${slug} page must carry data-i18n="${key}"`);
      check(pageBuilt.includes('id="lang-toggle"'), `built ${slug} page must contain the toggle button`);
      check(pageBuilt.includes('id="lang-note"'), `built ${slug} page must contain the other-tools note`);
    }
    // Built loans pages: English default intact, Urdu keys wired.
    const builtLoans: Array<[string, string, string]> = [
      ['emi-loan-calculator', 'EMI / Loan Calculator', 'emi.h1'],
      ['loan-eligibility-calculator', 'Loan Eligibility Calculator', 'elig.h1'],
      ['loan-comparison-calculator', 'Loan Comparison Calculator', 'comp.h1'],
      ['car-loan-calculator', 'Car Loan Calculator Pakistan', 'car.h1'],
      ['home-loan-calculator', 'Home Loan Calculator Pakistan', 'home.h1'],
    ];
    for (const [slug, h1, key] of builtLoans) {
      const pagePath = join(ROOT, 'dist', slug, 'index.html');
      check(existsSync(pagePath), `built ${slug} page must exist`);
      const pageBuilt = readFileSync(pagePath, 'utf8');
      check(pageBuilt.includes(h1), `built ${slug} page must keep the English H1`);
      check(pageBuilt.includes(`data-i18n="${key}"`), `built ${slug} page must carry data-i18n="${key}"`);
      check(pageBuilt.includes('id="lang-toggle"'), `built ${slug} page must contain the toggle button`);
      check(pageBuilt.includes('id="lang-note"'), `built ${slug} page must contain the other-tools note`);
    }
    // Built Zakat/savings pages: English default intact, Urdu keys wired.
    const builtSavings: Array<[string, string, string]> = [
      ['zakat-calculator', 'Zakat Calculator', 'zak.h1'],
      ['national-savings-calculator', 'National Savings Calculator', 'nss.h1'],
      ['fixed-deposit-calculator', 'Fixed Deposit Calculator', 'fd.h1'],
    ];
    for (const [slug, h1, key] of builtSavings) {
      const pagePath = join(ROOT, 'dist', slug, 'index.html');
      check(existsSync(pagePath), `built ${slug} page must exist`);
      const pageBuilt = readFileSync(pagePath, 'utf8');
      check(pageBuilt.includes(h1), `built ${slug} page must keep the English H1`);
      check(pageBuilt.includes(`data-i18n="${key}"`), `built ${slug} page must carry data-i18n="${key}"`);
      check(pageBuilt.includes('id="lang-toggle"'), `built ${slug} page must contain the toggle button`);
      check(pageBuilt.includes('id="lang-note"'), `built ${slug} page must contain the other-tools note`);
    }
    // Built bills pages: English default intact, Urdu keys wired.
    const builtBills: Array<[string, string, string]> = [
      ['electricity-bill-calculator', 'Electricity Bill Calculator', 'elec.h1'],
      ['gas-bill-calculator', 'Gas Bill Calculator', 'gas.h1'],
    ];
    for (const [slug, h1, key] of builtBills) {
      const pagePath = join(ROOT, 'dist', slug, 'index.html');
      check(existsSync(pagePath), `built ${slug} page must exist`);
      const pageBuilt = readFileSync(pagePath, 'utf8');
      check(pageBuilt.includes(h1), `built ${slug} page must keep the English H1`);
      check(pageBuilt.includes(`data-i18n="${key}"`), `built ${slug} page must carry data-i18n="${key}"`);
      check(pageBuilt.includes('id="lang-toggle"'), `built ${slug} page must contain the toggle button`);
      check(pageBuilt.includes('id="lang-note"'), `built ${slug} page must contain the other-tools note`);
    }
  }
}

console.log(`i18n: ${checks} checks — ${used.size} data-i18n keys covered, 26/26 tool labels + card names + descriptions translated, tax cluster (Salary 58 + Freelancer 73 + GST 99 keys) + loans cluster (EMI 71 + Eligibility 61 + Comparison 63 + Car 108 + Home 113 keys) + Zakat/savings cluster (Zakat 96 + National Savings 141 + Fixed Deposit 61 keys) + bills cluster (Electricity 63 + Gas 92 keys) translated, font ${fontBytes} bytes.`);
