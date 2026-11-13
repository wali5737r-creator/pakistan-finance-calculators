// SRS config-consistency tests (P1 fix).
// Every figure the SRS states must match its config source. The SRS v1.0
// (27 Oct 2026) covers the original 8 tools; the Addendum at the top of
// ~/workspace/teams/pakistan-finance-calculators/01-srs/srs-review.md
// records the headline verified figures for the 16 tools added after
// v1.0, each with its config pointer. If a config figure changes, the
// SRS text must be updated to match — never the other way round.
// Run: npx tsx tests/srs-consistency.test.ts
import assert from 'node:assert/strict';
import { TAX_SLABS, TAX_YEAR } from '../src/config/tax';
import {
  NISAB_GOLD_GRAMS,
  NISAB_GOLD_TOLA,
  NISAB_SILVER_GRAMS,
  NISAB_SILVER_TOLA,
  TOLA_GRAMS,
  ZAKAT_RATE,
} from '../src/config/zakat';
import {
  ELECTRICITY_GST_RATE,
  LIFELINE_MINIMUM_CHARGE,
  LIFELINE_SLABS,
  PROTECTED_SLABS,
  UNPROTECTED_SLABS,
} from '../src/config/electricity';
import {
  GAS_GST_RATE,
  GAS_METER_RENT,
  GAS_NON_PROTECTED_FIXED_CHARGE_HIGH,
  GAS_NON_PROTECTED_FIXED_CHARGE_LOW,
  GAS_PROTECTED_FIXED_CHARGE,
  NON_PROTECTED_GAS_SLABS,
  PROTECTED_GAS_SLABS,
} from '../src/config/gas';
import {
  NON_PSEB_EXPORT_RATE,
  NON_SALARIED_SLABS,
  PSEB_EXPORT_RATE,
  SURCHARGE_RATE,
  SURCHARGE_THRESHOLD,
} from '../src/config/freelancer-tax';
import {
  SOLAR_CITY_YIELDS,
  SOLAR_DEFAULT_COST_PER_KW,
  SOLAR_DEFAULT_EXPORT_RATE,
  SOLAR_DEFAULT_IMPORT_RATE,
  SOLAR_EXPORT_RATE_HIGH,
  SOLAR_EXPORT_RATE_LOW,
} from '../src/config/solar';
import {
  EOBI_EMPLOYEE_RATE,
  EOBI_EMPLOYER_RATE,
  EOBI_FORMULA_DIVISOR,
  EOBI_MINIMUM_PENSION,
  EOBI_MIN_SERVICE_YEARS,
} from '../src/config/pension';
import {
  NATIONAL_SAVINGS_SCHEMES,
  NSS_WHT_FILER_RATE,
  NSS_WHT_NON_FILER_RATE,
} from '../src/config/national-savings';
import { GST_STANDARD_RATE, GST_STANDARD_RATE_PCT } from '../src/config/gst';
import { calcTax, round2 } from '../src/lib/calc';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

// --- SRS §1: salaried tax slabs (Finance Act 2026, Gazette-verified) ---
check('SRS §1 salaried slab table matches src/config/tax.ts', () => {
  assert.equal(TAX_YEAR, '2026-27');
  assert.deepEqual(TAX_SLABS, [
    { upTo: 600000, rate: 0, baseTax: 0 },
    { upTo: 1200000, rate: 0.01, baseTax: 0 },
    { upTo: 2200000, rate: 0.11, baseTax: 6000 },
    { upTo: 3200000, rate: 0.2, baseTax: 116000 },
    { upTo: 4100000, rate: 0.25, baseTax: 316000 },
    { upTo: 5600000, rate: 0.29, baseTax: 541000 },
    { upTo: 7000000, rate: 0.32, baseTax: 976000 },
    { upTo: null, rate: 0.35, baseTax: 1424000 },
  ]);
});

check('SRS §1 slab table is internally continuous (base tax reconciles)', () => {
  const lowers = [0, 600000, 1200000, 2200000, 3200000, 4100000, 5600000, 7000000];
  TAX_SLABS.forEach((slab, i) => {
    if (i === 0) {
      assert.equal(slab.baseTax, 0);
      return;
    }
    const prev = TAX_SLABS[i - 1];
    const expected = prev.baseTax + prev.rate * (lowers[i] - lowers[i - 1]);
    assert.equal(slab.baseTax, expected, `slab ${i} base tax`);
  });
});

check('SRS §3.5 worked examples E1–E4 reproduce from the config slabs', () => {
  assert.equal(round2(calcTax(900000).annualTax), 3000);
  assert.equal(round2(calcTax(1800000).annualTax), 72000);
  assert.equal(round2(calcTax(5000000).annualTax), 802000);
  assert.equal(round2(calcTax(8000000).annualTax), 1774000);
});

// --- SRS §5: Zakat nisab and rate ---
check('SRS §5 nisab weights, tola conversion and 2.5% rate match zakat.ts', () => {
  assert.equal(NISAB_GOLD_GRAMS, 87.48);
  assert.equal(NISAB_SILVER_GRAMS, 612.36);
  assert.equal(ZAKAT_RATE, 0.025);
  assert.equal(TOLA_GRAMS, 11.664);
  assert.equal(NISAB_GOLD_TOLA, 7.5);
  assert.equal(NISAB_SILVER_TOLA, 52.5);
  assert.equal(round2(NISAB_GOLD_TOLA * TOLA_GRAMS), 87.48);
  assert.equal(round2(NISAB_SILVER_TOLA * TOLA_GRAMS), 612.36);
});

// --- Addendum: Electricity (NEPRA SRO 279(I)/2026) ---
check('Addendum electricity tariffs match electricity.ts', () => {
  assert.deepEqual(
    LIFELINE_SLABS.map((s) => s.ratePerUnit),
    [3.95, 7.74],
  );
  assert.deepEqual(
    PROTECTED_SLABS.map((s) => s.ratePerUnit),
    [10.54, 13.01],
  );
  assert.equal(UNPROTECTED_SLABS[UNPROTECTED_SLABS.length - 1].ratePerUnit, 47.2);
  assert.equal(ELECTRICITY_GST_RATE, 0.18);
  assert.equal(LIFELINE_MINIMUM_CHARGE, 75);
});

// --- Addendum: Gas (OGRA notification 29 Jun 2025) ---
check('Addendum gas slabs, fixed charges, meter rent and GST match gas.ts', () => {
  assert.deepEqual(
    PROTECTED_GAS_SLABS.map((s) => s.ratePerMmbtu),
    [200, 250, 300, 350],
  );
  assert.deepEqual(
    NON_PROTECTED_GAS_SLABS.map((s) => s.ratePerMmbtu),
    [500, 850, 1250, 1450, 1900, 3300, 3800, 4200],
  );
  assert.equal(GAS_PROTECTED_FIXED_CHARGE, 600);
  assert.equal(GAS_NON_PROTECTED_FIXED_CHARGE_LOW, 1500);
  assert.equal(GAS_NON_PROTECTED_FIXED_CHARGE_HIGH, 3000);
  assert.equal(GAS_METER_RENT, 40);
  assert.equal(GAS_GST_RATE, 0.18);
});

// --- Addendum: Freelancer / non-salaried tax (Finance Act 2026) ---
check('Addendum non-salaried slabs, export rates and surcharge match freelancer-tax.ts', () => {
  assert.deepEqual(NON_SALARIED_SLABS, [
    { upTo: 600000, rate: 0, baseTax: 0 },
    { upTo: 1200000, rate: 0.15, baseTax: 0 },
    { upTo: 1600000, rate: 0.2, baseTax: 90000 },
    { upTo: 3200000, rate: 0.3, baseTax: 170000 },
    { upTo: 5600000, rate: 0.4, baseTax: 650000 },
    { upTo: null, rate: 0.45, baseTax: 1610000 },
  ]);
  assert.equal(PSEB_EXPORT_RATE, 0.0025);
  assert.equal(NON_PSEB_EXPORT_RATE, 0.01);
  assert.equal(SURCHARGE_THRESHOLD, 10000000);
  assert.equal(SURCHARGE_RATE, 0.1);
});

// --- Addendum: Solar (NEPRA Prosumer Regulations 2026, SRO 251(I)/2026) ---
check('Addendum solar yields, cost and net-billing rates match solar.ts', () => {
  const yields = Object.fromEntries(
    SOLAR_CITY_YIELDS.map((y) => [y.city, y.yieldPerKwPerDay]),
  );
  assert.equal(yields.Lahore, 3.85);
  assert.equal(yields.Karachi, 4.38);
  assert.equal(yields.Islamabad, 3.82);
  assert.equal(SOLAR_DEFAULT_COST_PER_KW, 130000);
  assert.equal(SOLAR_DEFAULT_EXPORT_RATE, 10);
  assert.equal(SOLAR_EXPORT_RATE_LOW, 8.13);
  assert.equal(SOLAR_EXPORT_RATE_HIGH, 11);
  assert.equal(SOLAR_DEFAULT_IMPORT_RATE, 48);
});

// --- Addendum: Pension / EOBI (EOB Act 1976) ---
check('Addendum EOBI minimum pension, contributions and formula match pension.ts', () => {
  assert.equal(EOBI_MINIMUM_PENSION, 11500);
  assert.equal(EOBI_EMPLOYER_RATE, 0.05);
  assert.equal(EOBI_EMPLOYEE_RATE, 0.01);
  assert.equal(EOBI_FORMULA_DIVISOR, 50);
  assert.equal(EOBI_MIN_SERVICE_YEARS, 15);
});

// --- Addendum: National Savings (CDNS rates w.e.f. 21 Oct 2026) ---
check('Addendum National Savings scheme rates and WHT match national-savings.ts', () => {
  const rates = Object.fromEntries(
    NATIONAL_SAVINGS_SCHEMES.map((s) => [s.id, s.ratePct]),
  );
  assert.equal(rates.dsc, 11.94);
  assert.equal(rates.ric, 12.12);
  assert.equal(rates.bsc, 12.96);
  assert.equal(rates.pba, 12.96);
  assert.equal(rates.ssc, 12.0);
  assert.equal(rates.sa, 10.0);
  assert.equal(rates.sfwa, 12.96);
  assert.equal(NSS_WHT_FILER_RATE, 0.15);
  assert.equal(NSS_WHT_NON_FILER_RATE, 0.3);
});

// --- Addendum: GST (Sales Tax Act 1990 s.3(1)) ---
check('Addendum GST standard rate matches gst.ts', () => {
  assert.equal(GST_STANDARD_RATE, 0.18);
  assert.equal(GST_STANDARD_RATE_PCT, 18);
});

console.log(`\n${passed} checks passed.`);
