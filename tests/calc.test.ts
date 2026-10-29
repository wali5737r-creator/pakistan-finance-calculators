// Unit tests against EVERY SRS worked example and boundary case.
// Run: npm test (tsx). Illustrative prices below are TEST INPUTS ONLY —
// they are never a live rate and never appear in site copy (SRS §6.5/§7.5).
import assert from 'node:assert/strict';
import {
  calcAge, calcEMI, calcGold, calcPercentage, calcTax, calcZakat,
  convertArea, convertAreaToAll, convertAreaWithUnits, convertAreaToAllWithUnits,
  convertCurrency, formatNumber,
  goldValueFromWeight, parseDecimal, round2, todayInKarachi,
} from '../src/lib/calc';
import { AREA_UNITS, areaUnitsForStandard } from '../src/config/units';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}
function approx(actual: number, expected: number, tol = 0.01) {
  assert.ok(Math.abs(actual - expected) <= tol, `expected ${expected} ± ${tol}, got ${actual}`);
}

// --- Tax (SRS §3.5 E1-E6, boundary sweep) ---
check('tax E1 monthly 75,000', () => {
  const r = calcTax(900000);
  assert.equal(round2(r.annualTax), 3000);
  assert.equal(round2(r.monthlyTax), 250);
  approx(r.effectiveRate, 0.33);
  assert.equal(r.marginalRate, 1);
});
check('tax E2 1,800,000', () => {
  const r = calcTax(1800000);
  assert.equal(round2(r.annualTax), 72000);
  assert.equal(round2(r.monthlyTax), 6000);
  assert.equal(r.marginalRate, 11);
});
check('tax E3 5,000,000', () => {
  const r = calcTax(5000000);
  assert.equal(round2(r.annualTax), 802000);
  approx(r.effectiveRate, 16.04);
  assert.equal(r.marginalRate, 29);
});
check('tax E4 8,000,000', () => {
  const r = calcTax(8000000);
  assert.equal(round2(r.annualTax), 1774000);
  approx(r.effectiveRate, 22.18);
  assert.equal(r.marginalRate, 35);
});
check('tax boundaries continuous', () => {
  assert.equal(calcTax(600000).annualTax, 0);
  assert.equal(calcTax(1200000).annualTax, 6000);
  approx(calcTax(600001).annualTax, 0.01, 0.001);
  approx(calcTax(1200001).annualTax, 6000.11, 0.001);
  assert.equal(calcTax(2200000).annualTax, 116000);
  assert.equal(calcTax(3200000).annualTax, 316000);
  assert.equal(calcTax(4100000).annualTax, 541000);
  assert.equal(calcTax(5600000).annualTax, 976000);
  assert.equal(calcTax(7000000).annualTax, 1424000);
});
check('tax monthly/annual equivalence', () => {
  assert.equal(calcTax(75000 * 12).annualTax, calcTax(900000).annualTax);
});

// --- EMI (SRS §4.5 E1-E4) ---
function emiScheduleInvariants(principal: number, rate: number, months: number) {
  const r = calcEMI(principal, rate, months);
  const sumEmi = round2(r.schedule.reduce((s, row) => s + row.emi, 0));
  const sumPrincipal = round2(r.schedule.reduce((s, row) => s + row.principal, 0));
  assert.equal(sumEmi, r.totalPayment);
  assert.equal(sumPrincipal, principal);
  assert.equal(r.schedule[r.schedule.length - 1].balance, 0);
  assert.equal(round2(r.totalPayment - principal), r.totalInterest);
  return r;
}
check('emi E1 1,000,000 @18% 24m', () => {
  const r = emiScheduleInvariants(1000000, 18, 24);
  assert.equal(r.emi, 49924.1);
  approx(r.totalPayment, 1198178.45, 0.1);
});
check('emi E2 500,000 @12% 12m', () => {
  const r = emiScheduleInvariants(500000, 12, 12);
  assert.equal(r.emi, 44424.39);
  approx(r.totalPayment, 533092.73, 0.1);
});
check('emi E3 2,000,000 @20% 60m', () => {
  const r = emiScheduleInvariants(2000000, 20, 60);
  assert.equal(r.emi, 52987.77);
  approx(r.totalPayment, 3179266.05, 0.1);
});
check('emi E4 zero rate', () => {
  const r = emiScheduleInvariants(1000000, 0, 12);
  assert.equal(r.emi, 83333.33);
  assert.equal(r.totalPayment, 1000000);
  assert.equal(r.totalInterest, 0);
});
check('emi N=1', () => {
  const r = calcEMI(100000, 12, 1);
  assert.equal(r.emi, 101000);
});
check('emi stall guard throws', () => {
  assert.throws(() => calcEMI(1000000, 100, 600), /interest uses up/);
});
check('emi long tenure 240m completes with schedule sum', () => {
  const r = emiScheduleInvariants(1000000, 18, 240);
  assert.equal(r.schedule.length, 240);
});

// --- Zakat (SRS §5.5) ---
check('zakat E1 cash 2,000,000', () => {
  const r = calcZakat({ cash: 2000000, goldValue: 0, silverValue: 0, tradeGoods: 0, otherAssets: 0, debts: 0, goldPricePerTola: null, silverPricePerTola: null, nisabBasis: 'silver' });
  // No price -> no PKR nisab -> zakat cannot be decided from price; result
  // is 0 with no threshold. The arithmetic vector uses a test-injected
  // threshold via the silver price below in E2-style check.
  assert.equal(r.gross, 2000000);
  assert.equal(r.nisabThreshold, null);
});
check('zakat E1/E2 arithmetic with test-injected prices', () => {
  // Prices are test inputs chosen so nisab is met (silver nisab at
  // 30,000/tola is 1,575,000; at 20,000/tola it is 1,050,000).
  const r1 = calcZakat({ cash: 2000000, goldValue: 0, silverValue: 0, tradeGoods: 0, otherAssets: 0, debts: 0, goldPricePerTola: 30000, silverPricePerTola: 30000, nisabBasis: 'silver' });
  assert.equal(r1.zakat, 50000);
  const r2 = calcZakat({ cash: 800000, goldValue: 500000, silverValue: 0, tradeGoods: 200000, otherAssets: 0, debts: 100000, goldPricePerTola: 20000, silverPricePerTola: 20000, nisabBasis: 'silver' });
  assert.equal(r2.gross, 1500000);
  assert.equal(r2.net, 1400000);
  assert.equal(r2.zakat, 35000);
});
check('zakat E3 debts exceed assets', () => {
  const r = calcZakat({ cash: 100000, goldValue: 0, silverValue: 0, tradeGoods: 0, otherAssets: 0, debts: 150000, goldPricePerTola: 100000, silverPricePerTola: 100000, nisabBasis: 'silver' });
  assert.equal(r.net, 0);
  assert.equal(r.zakat, 0);
});
check('zakat weight mode + nisab grams', () => {
  assert.equal(goldValueFromWeight(5, 'tola', 300000), 1500000);
  assert.equal(round2(7.5 * 11.664), 87.48);
  assert.equal(round2(52.5 * 11.664), 612.36);
  // SRS E4 states "nisab met" as an assumption; at the illustrative
  // gold price the gold nisab (Rs 2,250,000) exceeds the gold value, so
  // the test uses the silver basis with a test silver price, under
  // which nisab is met and 2.5% of Rs 1,500,000 = Rs 37,500.
  const r = calcZakat({ cash: 0, goldValue: goldValueFromWeight(5, 'tola', 300000), silverValue: 0, tradeGoods: 0, otherAssets: 0, debts: 0, goldPricePerTola: 300000, silverPricePerTola: 20000, nisabBasis: 'silver' });
  assert.equal(r.zakat, 37500);
});
check('zakat nisab boundary', () => {
  const price = 100000;
  const silverNisab = 612.36 * (price / 11.664);
  const at = calcZakat({ cash: silverNisab, goldValue: 0, silverValue: 0, tradeGoods: 0, otherAssets: 0, debts: 0, goldPricePerTola: price, silverPricePerTola: price, nisabBasis: 'silver' });
  assert.ok(at.nisabMet && at.zakat > 0);
  const below = calcZakat({ cash: silverNisab - 1, goldValue: 0, silverValue: 0, tradeGoods: 0, otherAssets: 0, debts: 0, goldPricePerTola: price, silverPricePerTola: price, nisabBasis: 'silver' });
  assert.equal(below.zakat, 0);
});

// --- Currency (test-injected rate table only, SRS §6.7) ---
check('currency illustrative arithmetic with test table', () => {
  const table = { USD: 280, PKR: 1 }; // test input only, NOT a live rate
  const r = convertCurrency(100, 'USD', 'PKR', table);
  assert.equal(r.converted, 28000);
  approx(r.inverseRate, 0.003571, 0.000001);
  const same = convertCurrency(500, 'PKR', 'PKR', table);
  assert.equal(same.converted, 500);
  assert.equal(same.rate, 1);
});
check('currency cross rate through PKR', () => {
  const table = { PKR: 1, USD: 280, GBP: 350 };
  const r = convertCurrency(350, 'GBP', 'USD', table);
  assert.equal(r.converted, 437.5);
});

// --- Gold (SRS §7.5, illustrative price = test input only) ---
check('gold E1-E4', () => {
  const price = 300000;
  assert.equal(calcGold(1, 'tola', 24, price).adjustedValue, 300000);
  assert.equal(calcGold(2, 'tola', 22, price).adjustedValue, 550000);
  approx(calcGold(5, 'grams', 24, price).adjustedValue, 128600.82, 0.01);
  approx(calcGold(10, 'grams', 18, price).adjustedValue, 192901.23, 0.01);
  assert.equal(calcGold(1, 'tola', 24, price).grams, 11.664);
});

// --- Percentage (SRS §8.5 E1-E7) ---
check('percentage E1-E7', () => {
  assert.equal(calcPercentage('6a', 15, 2000).result, 300);
  assert.equal(calcPercentage('6a', 150, 400).result, 600);
  assert.equal(calcPercentage('6b', 450, 1800).result, 25);
  assert.equal(calcPercentage('6b', 0, 500).result, 0);
  const e5 = calcPercentage('6c', 800, 1000);
  assert.equal(e5.result, 25); assert.equal(e5.direction, 'increase'); assert.equal(e5.difference, 200);
  const e6 = calcPercentage('6c', 1000, 800);
  assert.equal(e6.result, -20); assert.equal(e6.direction, 'decrease');
  assert.equal(calcPercentage('6c', 500, 500).result, 0);
  assert.equal(calcPercentage('6a', 12.5, 80).result, 10);
  approx(calcPercentage('6b', 1, 3).result, 33.33);
  assert.throws(() => calcPercentage('6b', 1, 0), /divide by zero/);
  assert.throws(() => calcPercentage('6c', 0, 100), /from zero/);
  assert.equal(calcPercentage('6c', 100, -50).result, -150);
});

// --- Age (SRS §9.5 E1-E3) ---
check('age E1-E3', () => {
  const e1 = calcAge('1995-03-15', '2026-10-28');
  assert.deepEqual([e1.years, e1.months, e1.days], [31, 7, 13]);
  assert.equal(e1.totalDays, 11550);
  assert.equal(e1.totalWeeks, 1650);
  assert.equal(e1.daysUntilNextBirthday, 138);
  const e2 = calcAge('2026-10-28', '2026-10-28');
  assert.deepEqual([e2.years, e2.months, e2.days], [0, 0, 0]);
  const e3 = calcAge('2000-01-01', '2025-01-01');
  assert.deepEqual([e3.years, e3.months, e3.days], [25, 0, 0]);
  assert.equal(e3.totalDays, 9132);
});
check('age month-end borrowing (QA AT7.3)', () => {
  const r1 = calcAge('2000-01-31', '2025-02-28');
  assert.deepEqual([r1.years, r1.months, r1.days], [25, 0, 28]);
  const r2 = calcAge('2000-01-31', '2025-03-01');
  assert.deepEqual([r2.years, r2.months, r2.days], [25, 0, 29]);
  const r3 = calcAge('2000-01-31', '2025-03-31');
  assert.deepEqual([r3.years, r3.months, r3.days], [25, 2, 0]);
  assert.equal(r2.totalDays, Math.floor((Date.UTC(2025, 2, 1) - Date.UTC(2000, 0, 31)) / 86400000));
});
check('age 150-year warning, 200-year rejection', () => {
  const warn = calcAge('1870-01-01', '2026-10-28');
  assert.equal(warn.implausibleAgeWarning, true);
  assert.throws(() => calcAge('1800-01-01', '2026-10-28'), /200 years/);
});
check('age 29 Feb rule', () => {
  const r = calcAge('2000-02-29', '2026-03-01');
  assert.equal(r.nextBirthday, '2027-03-01');
  assert.throws(() => calcAge('2026-10-28', '2026-10-27'), /before/);
  assert.throws(() => calcAge('2000-02-31', '2026-10-28'), /real calendar/);
  assert.match(todayInKarachi(), /^\d{4}-\d{2}-\d{2}$/);
});

// --- Area (SRS §10.5 provisional factors) ---
check('area E1-E4', () => {
  approx(convertArea(10, 'marla', 'sqft'), 2722.5);
  approx(convertArea(10, 'marla', 'sqyd'), 302.5);
  assert.equal(convertArea(1, 'kanal', 'marla'), 20);
  assert.equal(convertArea(1, 'acre', 'marla'), 160);
  approx(convertArea(100, 'sqm', 'sqft'), 1076.39, 0.01);
  const all = convertAreaToAll(0, 'marla');
  assert.ok(Object.values(all).every((v) => v === 0));
  approx(convertArea(100, 'marla', 'marla'), 100);
  assert.equal(parseDecimal('1,000'), 1000);
  assert.equal(parseDecimal('1,,000'), null);
  assert.equal(parseDecimal('.5'), 0.5);
  assert.equal(parseDecimal('75.'), 75);
  assert.equal(formatNumber(1234567.891), '1,234,567.89');
});

// --- Area: housing-society marla standard (225 sq ft) ---
check('area society standard', () => {
  const society = areaUnitsForStandard('society');
  const revenue = areaUnitsForStandard('revenue');
  assert.equal(society.find((u) => u.id === 'marla')!.sqft, 225);
  assert.equal(society.find((u) => u.id === 'kanal')!.sqft, 4500);
  assert.equal(revenue.find((u) => u.id === 'marla')!.sqft, 272.25);
  assert.equal(revenue.find((u) => u.id === 'kanal')!.sqft, 5445);
  approx(convertAreaWithUnits(10, 'marla', 'sqft', society), 2250);
  approx(convertAreaWithUnits(1, 'kanal', 'sqft', society), 4500);
  assert.equal(convertAreaWithUnits(1, 'kanal', 'marla', society), 20);
  approx(convertAreaWithUnits(1, 'acre', 'marla', society), 193.6);
  approx(convertAreaWithUnits(10, 'marla', 'sqft', revenue), 2722.5);
  const all = convertAreaToAllWithUnits(10, 'marla', society);
  approx(all.sqft, 2250);
  approx(all.kanal, 0.5);
  // Default convertArea is unchanged (revenue standard).
  approx(convertArea(10, 'marla', 'sqft'), 2722.5);
  assert.equal(AREA_UNITS.find((u) => u.id === 'marla')!.sqft, 272.25);
});

console.log(`\n${passed} checks passed.`);
