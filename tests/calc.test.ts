// Unit tests against EVERY SRS worked example and boundary case.
// Run: npm test (tsx). Illustrative prices below are TEST INPUTS ONLY —
// they are never a live rate and never appear in site copy (SRS §6.5/§7.5).
import assert from 'node:assert/strict';
import {
  calcAge, calcDscEncashment, calcEMI, calcEobiContributions, calcEobiPension, calcExportTax, calcFreelancerTax, calcGold, calcGst, calcGstAdd, calcGstRemove, calcInvalidityPension, calcNationalSavings, calcNonSalariedTax, calcOldAgeGrant, calcPercentage, calcReducedPension, calcSaProfit, calcSscProfit, calcSurvivorPension, calcTax, calcZakat,
  applyNssWht, calcNssMonthlyProfit, convertArea, convertAreaToAll, convertAreaWithUnits, convertAreaToAllWithUnits,
  convertCurrency, formatNumber,
  goldValueFromWeight, nssSchemeById, parseDecimal, pensionCreditedYears, pensionWageForPreset, round2, todayInKarachi,
} from '../src/lib/calc';
import { NON_SALARIED_SLABS } from '../src/config/freelancer-tax';
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

// --- New tools (2026): fuel, compound, eligibility, inflation, budget,
// --- debt payoff, fixed deposit, loan comparison, goal savings ---
import {
  calcBudget, calcCompound, calcDebtPayoff, calcElectricityBill, calcFixedDeposit, calcFuel,
  calcGasBill, calcGoalDuration, calcGoalMonthly, calcInflation, calcLoanComparison,
  calcLoanEligibility, calcMonthlyGeneration, calcSolarPayback, checkProtectedStatus,
  cubicMetresToHm3, mmbtuPerHm3, recommendedSystemKw, solarMonthlySaving, solarRoofAreaSqft,
  solarSlabBaseRate, solarYieldForCity, unitsFromBill,
} from '../src/lib/calc';

check('fuel one-way and return trip', () => {
  const one = calcFuel(300, 12, 270, false);
  assert.equal(one.litres, 25);
  assert.equal(one.totalCost, 6750);
  assert.equal(one.costPerKm, 22.5);
  assert.equal(one.totalDistance, 300);
  const ret = calcFuel(300, 12, 270, true);
  assert.equal(ret.totalDistance, 600);
  assert.equal(ret.litres, 50);
  assert.equal(ret.totalCost, 13500);
  assert.equal(ret.costPerKm, 22.5);
  assert.throws(() => calcFuel(0, 12, 270, false), /Distance/);
  assert.throws(() => calcFuel(100, 0, 270, false), /Mileage/);
  assert.throws(() => calcFuel(100, 12, -5, false), /Fuel price/);
  assert.throws(() => calcFuel(100, 12, 270, false) && calcFuel(-1, 12, 270, false), /Distance/);
});

check('compound interest with monthly contributions', () => {
  const r = calcCompound(100000, 5000, 10, 10, 12);
  assert.equal(r.finalAmount, 1294929.07);
  assert.equal(r.totalContributions, 700000);
  assert.equal(r.interestEarned, 594929.07);
  assert.equal(r.rows.length, 10);
  assert.equal(r.rows[0].balance, 173299.13);
  assert.equal(r.rows[4].balance, 551716.24);
  // Zero rate: no interest, balance is exactly contributions.
  const zero = calcCompound(50000, 1000, 0, 5, 12);
  assert.equal(zero.finalAmount, 110000);
  assert.equal(zero.interestEarned, 0);
  // No contributions: pure growth, annual compounding.
  const pure = calcCompound(100000, 0, 10, 10, 1);
  approx(pure.finalAmount, 259374.25, 0.01);
  assert.throws(() => calcCompound(-1, 0, 10, 10, 12), /Starting amount/);
  assert.throws(() => calcCompound(1000, 0, 101, 10, 12), /between 0 and 100/);
  assert.throws(() => calcCompound(1000, 0, 10, 0, 12), /Years/);
  assert.throws(() => calcCompound(1000, 0, 10, 10, 3), /frequency/);
});

check('loan eligibility inverse EMI', () => {
  const r = calcLoanEligibility(200000, 20000, 40, 18, 240);
  assert.equal(r.maxEmi, 80000);
  assert.equal(r.affordableEmi, 60000);
  assert.equal(r.maxLoan, 3887743.93);
  // Zero rate: loan is simply affordable EMI x months.
  const zero = calcLoanEligibility(100000, 0, 50, 0, 120);
  assert.equal(zero.maxLoan, 6000000);
  assert.throws(() => calcLoanEligibility(100000, 60000, 40, 18, 240), /no room/);
  assert.throws(() => calcLoanEligibility(100000, 0, 0, 18, 240), /share/);
  assert.throws(() => calcLoanEligibility(100000, 0, 40, 18, 0), /Tenure/);
});

check('inflation future cost and purchasing power', () => {
  const r = calcInflation(100000, 8, 10);
  assert.equal(r.futureCost, 215892.5);
  assert.equal(r.purchasingPower, 46319.35);
  const zero = calcInflation(50000, 0, 10);
  assert.equal(zero.futureCost, 50000);
  assert.equal(zero.purchasingPower, 50000);
  const now = calcInflation(50000, 8, 0);
  assert.equal(now.futureCost, 50000);
  assert.throws(() => calcInflation(-1, 8, 10), /Amount/);
  assert.throws(() => calcInflation(1000, -1, 10), /Inflation rate/);
});

check('budget 50/30/20 and sum validation', () => {
  const r = calcBudget(200000, 50, 30, 20);
  assert.deepEqual([r.needs, r.wants, r.savings], [100000, 60000, 40000]);
  const custom = calcBudget(150000, 60, 25, 15);
  assert.deepEqual([custom.needs, custom.wants, custom.savings], [90000, 37500, 22500]);
  assert.throws(() => calcBudget(100000, 50, 30, 10), /add up to 100/);
  assert.throws(() => calcBudget(100000, 50, 30, 25), /add up to 100/);
  assert.throws(() => calcBudget(0, 50, 30, 20), /take-home pay/);
  assert.throws(() => calcBudget(100000, -5, 30, 75), /between 0 and 100/);
});

check('debt payoff extra payment saves interest, stall guard throws', () => {
  const r = calcDebtPayoff(500000, 20, 15000, 5000);
  assert.equal(r.monthsWithExtra, 33);
  assert.equal(r.monthsWithoutExtra, 50);
  assert.equal(r.totalInterestWithExtra, 152210.26);
  assert.equal(r.totalInterestWithoutExtra, 235909.43);
  assert.equal(r.interestSaved, 83699.17);
  // No extra payment: both figures are the same.
  const plain = calcDebtPayoff(500000, 20, 15000, 0);
  assert.equal(plain.monthsWithExtra, plain.monthsWithoutExtra);
  assert.equal(plain.interestSaved, 0);
  // Payment below monthly interest must throw, never loop forever.
  assert.throws(() => calcDebtPayoff(500000, 20, 5000, 0), /does not cover/);
  assert.throws(() => calcDebtPayoff(500000, 20, 5000, 3000), /does not cover/);
  // Zero rate pays off exactly.
  const zero = calcDebtPayoff(120000, 0, 10000, 0);
  assert.equal(zero.monthsWithExtra, 12);
  assert.equal(zero.totalInterestWithExtra, 0);
  assert.throws(() => calcDebtPayoff(0, 20, 10000, 0), /balance/);
});

check('fixed deposit compounding and withholding tax', () => {
  const r = calcFixedDeposit(500000, 12, 3, 'quarterly', 15);
  assert.equal(r.maturityAmount, 712880.44);
  assert.equal(r.profitBeforeTax, 212880.44);
  assert.equal(r.taxAmount, 31932.07);
  assert.equal(r.profitAfterTax, 180948.37);
  const simple = calcFixedDeposit(500000, 12, 3, 'maturity', 0);
  assert.equal(simple.maturityAmount, 680000);
  assert.equal(simple.profitBeforeTax, 180000);
  assert.equal(simple.taxAmount, 0);
  // Monthly compounding beats quarterly at the same nominal rate.
  const monthly = calcFixedDeposit(500000, 12, 3, 'monthly', 0);
  assert.ok(monthly.maturityAmount > r.maturityAmount + r.taxAmount - r.taxAmount);
  assert.ok(monthly.profitBeforeTax > r.profitBeforeTax);
  assert.throws(() => calcFixedDeposit(500000, 12, 3, 'quarterly', 101), /Withholding tax/);
  assert.throws(() => calcFixedDeposit(-1, 12, 3, 'monthly', 0), /Deposit amount/);
});

check('loan comparison cheaper loan by total payment', () => {
  const r = calcLoanComparison(1000000, 18, 60, 1000000, 15, 60);
  assert.equal(r.loanA.emi, 25393.43);
  assert.equal(r.loanB.emi, 23789.93);
  assert.equal(r.loanA.totalPayment, 1523605.61);
  assert.equal(r.loanB.totalPayment, 1427395.77);
  assert.equal(r.cheaper, 'B');
  assert.equal(r.saving, 96209.84);
  const equal = calcLoanComparison(500000, 12, 12, 500000, 12, 12);
  assert.equal(equal.cheaper, 'equal');
  assert.equal(equal.saving, 0);
  assert.throws(() => calcLoanComparison(0, 12, 12, 500000, 12, 12), /positive/);
});

check('goal savings monthly mode and duration mode', () => {
  const m = calcGoalMonthly(1000000, 100000, 10, 60);
  assert.equal(m.monthlyContribution, 10789.01);
  assert.equal(m.futureValueOfCurrent, 164530.89);
  assert.equal(m.shortfall, 835469.11);
  // Already funded: no monthly saving needed.
  const funded = calcGoalMonthly(100000, 200000, 10, 60);
  assert.equal(funded.monthlyContribution, 0);
  const d = calcGoalDuration(1000000, 100000, 10, 10000);
  assert.equal(d.months, 64);
  const noReturn = calcGoalDuration(100000, 0, 0, 5000);
  assert.equal(noReturn.months, 20);
  const already = calcGoalDuration(100000, 100000, 10, 5000);
  assert.equal(already.months, 0);
  assert.throws(() => calcGoalMonthly(100000, 0, 10, 0), /months/);
  assert.throws(() => calcGoalDuration(100000, 0, 10, 0), /positive/);
  assert.throws(() => calcGoalDuration(100000, 0, 101, 5000), /between 0 and 100/);
});

// --- Electricity bill (NEPRA domestic tariff A-1, S.R.O. 279(I)/2026) ---
// Worked example: 250 units, unprotected, 3 kW load, no FPA:
// energy 250 x 33.10 = 8,275; fixed 350 x 3 = 1,050; subtotal 9,325;
// GST 18% = 1,678.50; total 11,003.50.
check('electricity worked example 250 units unprotected', () => {
  const r = calcElectricityBill(250, 'unprotected', 3, 0);
  assert.equal(r.slabRows.length, 1);
  assert.equal(r.slabRows[0].ratePerUnit, 33.1);
  assert.equal(r.energyCharge, 8275);
  assert.equal(r.fixedRatePerKw, 350);
  assert.equal(r.fixedCharge, 1050);
  assert.equal(r.fpaAmount, 0);
  assert.equal(r.subtotal, 9325);
  assert.equal(r.gst, 1678.5);
  assert.equal(r.total, 11003.5);
  assert.equal(r.minimumChargeApplied, false);
});

check('electricity lifeline boundaries and minimum charge', () => {
  // 50 units: 50 x 3.95 = 197.50; GST 35.55; total 233.05.
  const fifty = calcElectricityBill(50, 'lifeline', 1, 0);
  assert.equal(fifty.energyCharge, 197.5);
  assert.equal(fifty.fixedCharge, 0);
  assert.equal(fifty.gst, 35.55);
  assert.equal(fifty.total, 233.05);
  assert.equal(fifty.minimumChargeApplied, false);
  // 51 units: NO slab benefit — all 51 units at 7.74 = 394.74.
  const fiftyOne = calcElectricityBill(51, 'lifeline', 1, 0);
  assert.equal(fiftyOne.slabRows[0].ratePerUnit, 7.74);
  assert.equal(fiftyOne.energyCharge, 394.74);
  assert.equal(fiftyOne.total, 465.79);
  // 10 units: 10 x 3.95 = 39.50, below the Rs 75 minimum charge.
  const ten = calcElectricityBill(10, 'lifeline', 1, 0);
  assert.equal(ten.energyCharge, 75);
  assert.equal(ten.minimumChargeApplied, true);
  assert.equal(ten.total, 88.5);
  assert.throws(() => calcElectricityBill(101, 'lifeline', 1, 0), /Lifeline/);
});

check('electricity protected one-previous-slab benefit', () => {
  // 100 units: 100 x 10.54 = 1,054; fixed 200 x 2 = 400; total 1,715.72.
  const hundred = calcElectricityBill(100, 'protected', 2, 0);
  assert.equal(hundred.energyCharge, 1054);
  assert.equal(hundred.fixedRatePerKw, 200);
  assert.equal(hundred.total, 1715.72);
  // 150 units: first 100 at 10.54, next 50 at 13.01 = 1,704.50.
  const oneFifty = calcElectricityBill(150, 'protected', 2, 0);
  assert.equal(oneFifty.slabRows.length, 2);
  assert.equal(oneFifty.energyCharge, 1704.5);
  assert.equal(oneFifty.fixedRatePerKw, 300);
  assert.equal(oneFifty.fixedCharge, 600);
  assert.equal(oneFifty.total, 2719.31);
  // 200 units: 1,054 + 100 x 13.01 = 2,355; total 3,486.90.
  const twoHundred = calcElectricityBill(200, 'protected', 2, 0);
  assert.equal(twoHundred.energyCharge, 2355);
  assert.equal(twoHundred.total, 3486.9);
  assert.throws(() => calcElectricityBill(201, 'protected', 2, 0), /Protected/);
});

check('electricity unprotected slab boundaries (flat rate)', () => {
  // 100 units: 100 x 22.44 = 2,244; fixed 275; total 2,972.42.
  const hundred = calcElectricityBill(100, 'unprotected', 1, 0);
  assert.equal(hundred.energyCharge, 2244);
  assert.equal(hundred.total, 2972.42);
  // 200 units: 200 x 28.91 = 5,782; total 7,176.76.
  const twoHundred = calcElectricityBill(200, 'unprotected', 1, 0);
  assert.equal(twoHundred.energyCharge, 5782);
  assert.equal(twoHundred.total, 7176.76);
  // 201 units: the cliff — all 201 units at 33.10 = 6,653.10.
  const twoOhOne = calcElectricityBill(201, 'unprotected', 1, 0);
  assert.equal(twoOhOne.slabRows[0].ratePerUnit, 33.1);
  assert.equal(twoOhOne.energyCharge, 6653.1);
  assert.equal(twoOhOne.total, 8263.66);
  // 300 units: 300 x 33.10 = 9,930; total 12,130.40.
  assert.equal(calcElectricityBill(300, 'unprotected', 1, 0).total, 12130.4);
  // 700 units: 700 x 41.85 = 29,295; total 35,364.60.
  const sevenHundred = calcElectricityBill(700, 'unprotected', 1, 0);
  assert.equal(sevenHundred.slabRows[0].ratePerUnit, 41.85);
  assert.equal(sevenHundred.total, 35364.6);
  // 701 units: 701 x 47.20 = 33,087.20; total 39,839.40.
  const sevenOhOne = calcElectricityBill(701, 'unprotected', 1, 0);
  assert.equal(sevenOhOne.slabRows[0].ratePerUnit, 47.2);
  assert.equal(sevenOhOne.total, 39839.4);
});

check('electricity FPA and validation', () => {
  // FPA Rs 2.50/unit on the worked example: 625 more, total 11,741.
  const withFpa = calcElectricityBill(250, 'unprotected', 3, 2.5);
  assert.equal(withFpa.fpaAmount, 625);
  assert.equal(withFpa.subtotal, 9950);
  assert.equal(withFpa.total, 11741);
  // Negative FPA lowers the bill.
  const negFpa = calcElectricityBill(100, 'unprotected', 1, -1.5);
  assert.equal(negFpa.fpaAmount, -150);
  assert.equal(negFpa.total, 2795.42);
  assert.throws(() => calcElectricityBill(100, 'unprotected', 5.5, 0), /Time of Use/);
  assert.throws(() => calcElectricityBill(100, 'unprotected', 0, 0), /Sanctioned load/);
  assert.throws(() => calcElectricityBill(0, 'unprotected', 1, 0), /units/);
  assert.throws(() => calcElectricityBill(100, 'unprotected', 1, 11), /Fuel price adjustment/);
});

// --- Gas bill (OGRA domestic sale price, notification 29 June 2025, effective 1 July 2025) ---
// Worked examples use the rounded 3.5 MMBTU per hm3 factor, exactly as
// the page presents them; the exact-formula variants use GCV 990
// (3.5139 MMBTU per hm3).
check('gas worked example A protected 0.9 hm3 (rounded factor)', () => {
  // First 0.6 hm3 at 300: 0.6 x 3.5 = 2.10 MMBTU x 300 = 630.00.
  // Rest 0.3 hm3 at 350: 0.3 x 3.5 = 1.05 MMBTU x 350 = 367.50.
  // Gas 997.50 + fixed 600 + meter rent 40 = 1,637.50; GST 294.75.
  const r = calcGasBill(0.9, 'protected', { useRoundedFactor: true });
  assert.equal(r.slabRows.length, 2);
  assert.equal(r.slabRows[0].amount, 630);
  assert.equal(r.slabRows[1].amount, 367.5);
  assert.equal(r.gasCharge, 997.5);
  assert.equal(r.fixedCharge, 600);
  assert.equal(r.meterRent, 40);
  assert.equal(r.subtotal, 1637.5);
  assert.equal(r.gst, 294.75);
  assert.equal(r.total, 1932.25);
});

check('gas worked example B non-protected 2.0 hm3 (rounded factor)', () => {
  // First 1.5 hm3 at 1,450: 1.5 x 3.5 = 5.25 MMBTU x 1,450 = 7,612.50.
  // Rest 0.5 hm3 at 1,900: 0.5 x 3.5 = 1.75 MMBTU x 1,900 = 3,325.00.
  // Gas 10,937.50 + fixed 3,000 + meter rent 40 = 13,977.50; GST 2,515.95.
  const r = calcGasBill(2.0, 'non-protected', { useRoundedFactor: true });
  assert.equal(r.slabRows.length, 2);
  assert.equal(r.slabRows[0].amount, 7612.5);
  assert.equal(r.slabRows[1].amount, 3325);
  assert.equal(r.gasCharge, 10937.5);
  assert.equal(r.fixedCharge, 3000);
  assert.equal(r.subtotal, 13977.5);
  assert.equal(r.gst, 2515.95);
  assert.equal(r.total, 16493.45);
});

check('gas worked example C non-protected 1.0 hm3 (rounded factor)', () => {
  // First 0.6 hm3 at 850: 0.6 x 3.5 = 2.10 MMBTU x 850 = 1,785.00.
  // Rest 0.4 hm3 at 1,250: 0.4 x 3.5 = 1.40 MMBTU x 1,250 = 1,750.00.
  // Gas 3,535.00 + fixed 1,500 + meter rent 40 = 5,075.00; GST 913.50.
  const r = calcGasBill(1.0, 'non-protected', { useRoundedFactor: true });
  assert.equal(r.gasCharge, 3535);
  assert.equal(r.fixedCharge, 1500);
  assert.equal(r.subtotal, 5075);
  assert.equal(r.gst, 913.5);
  assert.equal(r.total, 5988.5);
});

check('gas worked example D non-protected 4.5 hm3, no benefit (rounded factor)', () => {
  // Above 4 hm3 the WHOLE consumption bills at 4,200: 4.5 x 3.5 = 15.75
  // MMBTU x 4,200 = 66,150.00. Gas + fixed 3,000 + meter rent 40 =
  // 69,190.00; GST 12,454.20.
  const r = calcGasBill(4.5, 'non-protected', { useRoundedFactor: true });
  assert.equal(r.slabRows.length, 1);
  assert.equal(r.slabRows[0].ratePerMmbtu, 4200);
  assert.equal(r.gasCharge, 66150);
  assert.equal(r.fixedCharge, 3000);
  assert.equal(r.subtotal, 69190);
  assert.equal(r.gst, 12454.2);
  assert.equal(r.total, 81644.2);
});

check('gas worked examples with the exact GCV formula', () => {
  // Same four examples, exact conversion (GCV 990 -> 3.5139 MMBTU/hm3).
  const a = calcGasBill(0.9, 'protected');
  assert.equal(a.mmbtuPerHm3, 3.5139);
  assert.equal(a.gasCharge, 1001.46);
  assert.equal(a.total, 1936.92);
  const b = calcGasBill(2.0, 'non-protected');
  assert.equal(b.gasCharge, 10980.93);
  assert.equal(b.total, 16544.7);
  const c = calcGasBill(1.0, 'non-protected');
  assert.equal(c.gasCharge, 3549.04);
  assert.equal(c.total, 6005.07);
  const d = calcGasBill(4.5, 'non-protected');
  assert.equal(d.gasCharge, 66412.65);
  assert.equal(d.total, 81954.13);
});

check('gas slab boundaries (exact formula)', () => {
  // Protected first slab: 0.25 hm3 entirely at 200.
  const p25 = calcGasBill(0.25, 'protected');
  assert.equal(p25.slabRows.length, 1);
  assert.equal(p25.gasCharge, 175.69);
  assert.equal(p25.total, 962.51);
  // Protected 0.5 hm3: first 0.25 at 200, rest at 250.
  const p50 = calcGasBill(0.5, 'protected');
  assert.equal(p50.gasCharge, 395.31);
  assert.equal(p50.total, 1221.67);
  // Protected 0.9 hm3 is the top of the protected table.
  assert.equal(calcGasBill(0.9, 'protected').fixedCharge, 600);
  // Non-protected first slab: 0.25 hm3 at 500.
  const n25 = calcGasBill(0.25, 'non-protected');
  assert.equal(n25.gasCharge, 439.24);
  assert.equal(n25.total, 2335.5);
  // Non-protected 0.6 hm3: first 0.25 at 500, rest at 850.
  const n06 = calcGasBill(0.6, 'non-protected');
  assert.equal(n06.gasCharge, 1484.62);
  assert.equal(n06.total, 3569.05);
  // Non-protected 1.5 hm3: first 1.0 at 1,250, rest at 1,450.
  const n15 = calcGasBill(1.5, 'non-protected');
  assert.equal(n15.gasCharge, 6939.95);
  assert.equal(n15.fixedCharge, 1500);
  assert.equal(n15.total, 10006.34);
  // Non-protected 3.0 hm3: first 2.0 at 1,900, rest at 3,300.
  const n30 = calcGasBill(3.0, 'non-protected');
  assert.equal(n30.gasCharge, 24948.67);
  assert.equal(n30.fixedCharge, 3000);
  assert.equal(n30.total, 33026.63);
  // Non-protected 4.0 hm3: first 3.0 at 3,300, rest at 3,800.
  const n40 = calcGasBill(4.0, 'non-protected');
  assert.equal(n40.gasCharge, 48140.39);
  assert.equal(n40.total, 60392.86);
  // 4.01 hm3: the cliff — everything at 4,200, no benefit.
  const n401 = calcGasBill(4.01, 'non-protected');
  assert.equal(n401.slabRows.length, 1);
  assert.equal(n401.gasCharge, 59181.05);
  assert.equal(n401.total, 73420.84);
});

check('gas fixed-charge boundary and validation', () => {
  // 1.5 hm3 still takes the lower fixed charge; just above it, the higher.
  assert.equal(calcGasBill(1.5, 'non-protected').fixedCharge, 1500);
  assert.equal(calcGasBill(1.51, 'non-protected').fixedCharge, 3000);
  // Protected above 0.90 hm3 is outside the protected table.
  assert.throws(() => calcGasBill(0.91, 'protected'), /Protected slabs/);
  assert.throws(() => calcGasBill(0, 'non-protected'), /consumption/);
  assert.throws(() => calcGasBill(101, 'non-protected'), /consumption/);
  assert.throws(() => calcGasBill(1, 'non-protected', { gcv: 400 }), /GCV/);
  assert.throws(() => calcGasBill(1, 'non-protected', { gcv: 1600 }), /GCV/);
  assert.throws(() => calcGasBill(1, 'non-protected', { pcf: 0.4 }), /PCF/);
  assert.throws(() => calcGasBill(1, 'non-protected', { pcf: 2.5 }), /PCF/);
});

check('gas conversion helpers and protected-status helper', () => {
  approx(mmbtuPerHm3(990, 1.0), 3.5139, 0.0001);
  assert.equal(mmbtuPerHm3(990, 1.0, true), 3.5);
  approx(mmbtuPerHm3(990, 1.05), 3.6896, 0.0001);
  assert.equal(cubicMetresToHm3(90), 0.9);
  assert.equal(cubicMetresToHm3(250), 2.5);
  assert.throws(() => cubicMetresToHm3(0), /Consumption/);
  assert.throws(() => cubicMetresToHm3(10001), /Consumption/);
  // Winter average 0.8625 -> 0.86 hm3: protected.
  const prot = checkProtectedStatus(0.8, 0.9, 0.85, 0.9);
  assert.equal(prot.averageHm3, 0.86);
  assert.equal(prot.protected, true);
  // Exactly 0.90 average is still protected.
  const edge = checkProtectedStatus(0.9, 0.9, 0.9, 0.9);
  assert.equal(edge.averageHm3, 0.9);
  assert.equal(edge.protected, true);
  // Average 0.925 -> 0.93 hm3: non-protected.
  const non = checkProtectedStatus(1.0, 0.9, 0.9, 0.9);
  assert.equal(non.averageHm3, 0.93);
  assert.equal(non.protected, false);
  assert.throws(() => checkProtectedStatus(-0.1, 0.9, 0.9, 0.9), /winter month/);
});


// --- Freelancer / non-salaried tax (s.154A + clause (1) slabs) ---
check('non-salaried: every slab boundary', () => {
  assert.equal(calcNonSalariedTax(600000).tax, 0);
  assert.equal(calcNonSalariedTax(600001).tax, 0.15);
  assert.equal(calcNonSalariedTax(1200000).tax, 90000);
  assert.equal(calcNonSalariedTax(1200001).tax, 90000.2);
  assert.equal(calcNonSalariedTax(1600000).tax, 170000);
  assert.equal(calcNonSalariedTax(3200000).tax, 650000);
  assert.equal(calcNonSalariedTax(5600000).tax, 1610000);
  assert.equal(calcNonSalariedTax(5600001).tax, 1610000.45);
});
check('non-salaried: baseTax equals tax at each boundary (continuous slabs)', () => {
  // baseTax of slab i+1 is the tax due at the top of slab i's band.
  for (let i = 0; i < NON_SALARIED_SLABS.length - 1; i++) {
    const slab = NON_SALARIED_SLABS[i];
    if (slab.upTo === null) continue;
    assert.equal(calcNonSalariedTax(slab.upTo).tax, NON_SALARIED_SLABS[i + 1].baseTax, `boundary ${slab.upTo}`);
  }
});
check('non-salaried: slab rows sum to the headline tax', () => {
  for (const income of [100000, 1000000, 3000000, 7000000, 12000000]) {
    const r = calcNonSalariedTax(income);
    const sum = round2(r.slabRows.reduce((s, row) => s + row.amount, 0));
    assert.equal(sum, r.tax, `income ${income}`);
  }
});
check('non-salaried: zero income is zero tax, no surcharge', () => {
  const r = calcNonSalariedTax(0);
  assert.equal(r.tax, 0);
  assert.equal(r.surcharge, 0);
  assert.equal(r.total, 0);
});
check('freelancer example D: local only Rs 3,000,000 = Rs 590,000', () => {
  const r = calcNonSalariedTax(3000000);
  assert.equal(r.tax, 590000);
  assert.equal(r.surcharge, 0);
  assert.equal(r.total, 590000);
  assert.equal(r.marginalRate, 30);
});
check('freelancer example F: Rs 11,000,000 local = Rs 4,444,000 with surcharge', () => {
  const r = calcNonSalariedTax(11000000);
  assert.equal(r.tax, 4040000);
  assert.equal(r.surcharge, 404000);
  assert.equal(r.total, 4444000);
});
check('freelancer surcharge: exactly Rs 10,000,000 has NO surcharge', () => {
  const r = calcNonSalariedTax(10000000);
  assert.equal(r.tax, 3590000);
  assert.equal(r.surcharge, 0);
  assert.equal(r.total, 3590000);
});
check('freelancer surcharge: just above Rs 10m triggers 10%', () => {
  const r = calcNonSalariedTax(10000001);
  assert.equal(r.tax, 3590000.45);
  assert.equal(r.surcharge, 359000.05);
  assert.equal(r.total, 3949000.5);
});
check('freelancer example A: export Rs 2,000,000 PSEB = Rs 5,000 final tax', () => {
  const r = calcExportTax(2000000, true);
  assert.equal(r.rate, 0.0025);
  assert.equal(r.tax, 5000);
});
check('freelancer example B: export Rs 2,000,000 non-PSEB = Rs 20,000 final tax', () => {
  const r = calcExportTax(2000000, false);
  assert.equal(r.rate, 0.01);
  assert.equal(r.tax, 20000);
});
check('freelancer example C: mixed — export excluded from slabs', () => {
  const pseb = calcFreelancerTax({ exportIncome: 2000000, psebRegistered: true, localTaxableIncome: 1000000, returnFiled: true });
  assert.equal(pseb.totalPayable, 65000); // 5,000 export + 60,000 local
  assert.equal(pseb.slabTax, 60000);
  assert.equal(pseb.slabIncome, 1000000);
  assert.equal(pseb.finalityLost, false);
  const nonPseb = calcFreelancerTax({ exportIncome: 2000000, psebRegistered: false, localTaxableIncome: 1000000, returnFiled: true });
  assert.equal(nonPseb.totalPayable, 80000); // 20,000 export + 60,000 local
  // Slabbing the combined Rs 3,000,000 (Rs 590,000) would be WRONG.
  assert.notEqual(pseb.slabTax, 590000);
});
check('freelancer example E: non-filer — slabs on combined, less deduction credit', () => {
  const r = calcFreelancerTax({ exportIncome: 2000000, psebRegistered: false, localTaxableIncome: 0, returnFiled: false });
  assert.equal(r.slabTax, 290000);
  assert.equal(r.exportDeduction, 20000);
  assert.equal(r.totalPayable, 270000);
  assert.equal(r.finalityLost, true);
  assert.equal(r.slabIncome, 2000000);
});
check('freelancer non-filer with local income: surcharge on combined income', () => {
  const r = calcFreelancerTax({ exportIncome: 2000000, psebRegistered: true, localTaxableIncome: 9000000, returnFiled: false });
  // Combined 11,000,000: slabs 4,040,000 + surcharge 404,000 = 4,444,000, less 5,000 deducted.
  assert.equal(r.slabTax, 4040000);
  assert.equal(r.surcharge, 404000);
  assert.equal(r.totalPayable, 4439000);
});
check('freelancer: return filed with no export is just the local slabs', () => {
  const r = calcFreelancerTax({ exportIncome: 0, psebRegistered: true, localTaxableIncome: 3000000, returnFiled: true });
  assert.equal(r.totalPayable, 590000);
  assert.equal(r.exportDeduction, 0);
});
check('freelancer: validation throws', () => {
  assert.throws(() => calcNonSalariedTax(-1), /zero or more/);
  assert.throws(() => calcNonSalariedTax(NaN), /zero or more/);
  assert.throws(() => calcNonSalariedTax(1e15), /zero or more/);
  assert.throws(() => calcExportTax(-100, true), /zero or more/);
  assert.throws(() => calcFreelancerTax({ exportIncome: 0, psebRegistered: true, localTaxableIncome: -5, returnFiled: true }), /zero or more/);
});

// --- Solar size & payback (NEPRA Prosumer Regulations 2026, SRO 251(I)/2026) ---
check('solar city yields: Lahore 3.85, Karachi 4.38, Islamabad 3.82, other city 4.0', () => {
  assert.equal(solarYieldForCity('Lahore'), 3.85);
  assert.equal(solarYieldForCity('Karachi'), 4.38);
  assert.equal(solarYieldForCity('Islamabad'), 3.82);
  assert.equal(solarYieldForCity('Multan'), 4.0);
  assert.equal(solarYieldForCity('lahore'), 3.85);
});
check('solar worked illustration: 5 kW Lahore, Rs 650,000', () => {
  // 5 x 3.85 x 365/12 = 585.52 units/month; 60% self-use at Rs 48,
  // 40% export at Rs 10 -> Rs 19,204.98/month; payback 33.85 months.
  const gen = calcMonthlyGeneration(5, 3.85);
  assert.equal(gen, 585.52);
  const r = calcSolarPayback({ systemKw: 5, monthlyGeneration: gen, systemCost: 650000 });
  assert.equal(r.selfUsedUnits, 351.31);
  assert.equal(r.exportedUnits, 234.21);
  assert.equal(r.selfUseSaving, 16862.88);
  assert.equal(r.exportCredit, 2342.1);
  assert.equal(r.monthlySaving, 19204.98);
  assert.equal(r.paybackMonths, 33.85);
  assert.equal(r.paybackYears, 2.82);
  // Payback is ~34 months (~2.8 years), as stated on the page.
  assert.ok(r.paybackMonths > 33 && r.paybackMonths < 35);
  assert.equal(r.importRatePerUnit, 48);
  assert.equal(r.exportRatePerUnit, 10);
});
check('solar worked illustration: 10 kW Karachi, Rs 1,300,000', () => {
  // 10 x 4.38 x 365/12 = 1,332.25 units/month.
  const gen = calcMonthlyGeneration(10, 4.38);
  assert.equal(gen, 1332.25);
  const r = calcSolarPayback({ systemKw: 10, monthlyGeneration: gen, systemCost: 1300000 });
  assert.equal(r.monthlySaving, 43697.8);
  assert.equal(r.paybackMonths, 29.75);
});
check('solar payback at 50% and 70% side by side (5 kW Lahore)', () => {
  const r = calcSolarPayback({ systemKw: 5, monthlyGeneration: 585.52, systemCost: 650000 });
  // 50%: more export at Rs 10, so slower payback; 70%: faster.
  assert.equal(r.paybackMonthsAt50Pct, 38.28);
  assert.equal(r.paybackMonthsAt70Pct, 30.33);
  assert.ok(r.paybackMonthsAt50Pct > r.paybackMonths);
  assert.ok(r.paybackMonthsAt70Pct < r.paybackMonths);
});
check('solar lifetime saving: 25 years at 0.5% degradation', () => {
  const r = calcSolarPayback({ systemKw: 5, monthlyGeneration: 585.52, systemCost: 650000 });
  // Year factors sum to (1 - 0.995^25) / 0.005 = 23.564...; gross =
  // 19,204.98 x 12 x 23.564... = 5,428,698.91; net less Rs 650,000.
  assert.equal(r.lifetimeGrossSaving, 5428698.91);
  assert.equal(r.lifetimeNetSaving, 4778698.91);
  // With a Rs 200,000 inverter replacement, net falls by exactly that.
  const withInverter = calcSolarPayback({ systemKw: 5, monthlyGeneration: 585.52, systemCost: 650000, inverterReplacementCost: 200000 });
  assert.equal(withInverter.lifetimeNetSaving, 4578698.91);
  assert.equal(withInverter.paybackMonths, 33.85); // replacement does not change simple payback
});
check('solar legacy agreement: export credited at import rate (1:1)', () => {
  const r = calcSolarPayback({ systemKw: 5, monthlyGeneration: 585.52, systemCost: 650000, legacyAgreement: true });
  assert.equal(r.exportRatePerUnit, 48);
  assert.equal(r.monthlySaving, 28104.96); // every unit worth Rs 48
  assert.equal(r.paybackMonths, 23.13);
  assert.equal(r.legacyAgreement, true);
});
check('solar recommended size rounds up to nearest 0.5 kW, minimum 1 kW', () => {
  assert.equal(recommendedSystemKw(585, 3.85), 5);
  assert.equal(recommendedSystemKw(300, 3.85), 3); // 2.56 -> 3.0
  assert.equal(recommendedSystemKw(100, 3.85), 1); // 0.85 -> 1.0
  assert.equal(recommendedSystemKw(585, 4.38), 4.5); // 4.39 -> 4.5
  assert.equal(recommendedSystemKw(1332.25, 4.38), 10);
});
check('solar units from bill at flat Rs 48', () => {
  assert.equal(unitsFromBill(28080), 585);
  assert.equal(unitsFromBill(24000), 500);
  assert.equal(unitsFromBill(19200, 48), 400);
});
check('solar slab base rate reuses SRO 279(I)/2026 unprotected slabs', () => {
  assert.equal(solarSlabBaseRate(100), 22.44);
  assert.equal(solarSlabBaseRate(350), 36.46);
  assert.equal(solarSlabBaseRate(585), 40.22);
  assert.equal(solarSlabBaseRate(701), 47.2);
});
check('solar roof area: 100 sq ft per kW rule of thumb', () => {
  assert.equal(solarRoofAreaSqft(5), 500);
  assert.equal(solarRoofAreaSqft(10), 1000);
});
check('solar monthly saving helper at the boundaries', () => {
  // 100% self-use: every unit at Rs 48. 0% self-use: every unit at Rs 10.
  assert.equal(solarMonthlySaving(585.52, 100, 48, 10), 28104.96);
  assert.equal(solarMonthlySaving(585.52, 0, 48, 10), 5855.2);
  assert.equal(solarMonthlySaving(100, 60, 48, 10), 3280);
});
check('solar: validation throws', () => {
  assert.throws(() => calcMonthlyGeneration(0, 3.85), /between/);
  assert.throws(() => calcMonthlyGeneration(101, 3.85), /between/);
  assert.throws(() => calcMonthlyGeneration(5, 0), /Yield/);
  assert.throws(() => recommendedSystemKw(0, 3.85), /between 1/);
  assert.throws(() => unitsFromBill(0), /positive/);
  assert.throws(() => solarSlabBaseRate(0), /between 1/);
  assert.throws(() => calcSolarPayback({ systemKw: 5, monthlyGeneration: 585.52, systemCost: 650000, selfUsePct: 101 }), /0% and 100%/);
  assert.throws(() => calcSolarPayback({ systemKw: 5, monthlyGeneration: 585.52, systemCost: 650000, exportRatePerUnit: -1 }), /Export rate/);
  assert.throws(() => calcSolarPayback({ systemKw: 5, monthlyGeneration: 585.52, systemCost: 650000, importRatePerUnit: 0 }), /Import rate/);
  assert.throws(() => calcSolarPayback({ systemKw: 5, monthlyGeneration: 585.52, systemCost: 0 }), /positive/);
  assert.throws(() => calcSolarPayback({ systemKw: 5, monthlyGeneration: 585.52, systemCost: 650000, inverterReplacementCost: -1 }), /zero or more/);
});
// --- Pension / EOBI (EOB Act 1976 Schedule: wage x years / 50) ---
check('pension credited years: 6+ months counts as a full year', () => {
  assert.equal(pensionCreditedYears(14.5), 15); // FCC rounding-off point
  assert.equal(pensionCreditedYears(14.4), 14);
  assert.equal(pensionCreditedYears(14.6), 15);
  assert.equal(pensionCreditedYears(15), 15);
  assert.equal(pensionCreditedYears(8), 8);
  assert.equal(pensionCreditedYears(1.9), 2);
});
check('pension worked examples on Rs 40,700 (ICT wage)', () => {
  assert.equal(calcEobiPension(40700, 15).monthlyPension, 12210);
  assert.equal(calcEobiPension(40700, 20).monthlyPension, 16280);
  assert.equal(calcEobiPension(40700, 25).monthlyPension, 20350);
  assert.equal(calcEobiPension(40700, 30).monthlyPension, 24420);
  assert.equal(calcEobiPension(40700, 40).monthlyPension, 32560);
  assert.equal(calcEobiPension(40700, 25).annualPension, 244200);
  assert.equal(calcEobiPension(40700, 25).formulaPension, 20350);
  assert.equal(calcEobiPension(40700, 25).floorApplied, false);
});
check('pension minimum floor: formula below Rs 11,500 is raised to it', () => {
  // 15 years at a Rs 30,000 wage: formula Rs 9,000 -> floored to Rs 11,500.
  const r = calcEobiPension(30000, 15);
  assert.equal(r.formulaPension, 9000);
  assert.equal(r.monthlyPension, 11500);
  assert.equal(r.floorApplied, true);
  assert.equal(r.entitled, true);
  // 15 years at Rs 37,000 (Balochistan wage): formula Rs 11,100 -> floored.
  assert.equal(calcEobiPension(37000, 15).monthlyPension, 11500);
  // 20 years at Rs 37,000: formula Rs 14,800 -> above the floor.
  assert.equal(calcEobiPension(37000, 20).monthlyPension, 14800);
});
check('pension 14.5 years counts as 15 (FCC rounding-off); 14 years does not', () => {
  const r = calcEobiPension(40700, 14.5);
  assert.equal(r.creditedYears, 15);
  assert.equal(r.entitled, true);
  assert.equal(r.monthlyPension, 12210);
  const short = calcEobiPension(40700, 14);
  assert.equal(short.entitled, false);
  assert.equal(short.monthlyPension, 0);
  assert.equal(short.formulaPension, 11396);
});
check('pension contributions on Rs 40,700: 5% + 1% = Rs 2,442/month', () => {
  const c = calcEobiContributions(40700);
  assert.equal(c.employerMonthly, 2035);
  assert.equal(c.employeeMonthly, 407);
  assert.equal(c.totalMonthly, 2442);
  assert.equal(c.employerAnnual, 24420);
  assert.equal(c.employeeAnnual, 4884);
  assert.equal(c.totalAnnual, 29304);
  // Sindh Rs 43,000: employer Rs 2,150, employee Rs 430, total Rs 2,580.
  const s = calcEobiContributions(43000);
  assert.equal(s.employerMonthly, 2150);
  assert.equal(s.employeeMonthly, 430);
  assert.equal(s.totalMonthly, 2580);
});
check('pension wage presets', () => {
  assert.equal(pensionWageForPreset('ICT / federal'), 40700);
  assert.equal(pensionWageForPreset('Sindh'), 43000);
  assert.equal(pensionWageForPreset('Punjab'), 40000);
  assert.equal(pensionWageForPreset('Khyber Pakhtunkhwa'), 40000);
  assert.equal(pensionWageForPreset('Balochistan'), 37000);
});
check('pension reduced: 0.5% per month short, for life', () => {
  // 25 years at Rs 40,700, retiring 36 months early: 20,350 x (1 - 0.18) = 16,687.
  const r = calcReducedPension(40700, 25, 36);
  assert.equal(r.reductionFraction, 0.18);
  assert.equal(r.reducedMonthlyPension, 16687);
  assert.equal(r.reducedAnnualPension, 200244);
  // 12 months short: 6% cut — 20,350 x 0.94 = 19,129.
  assert.equal(calcReducedPension(40700, 25, 12).reducedMonthlyPension, 19129);
  // 60 months short (retire at 55): 30% cut — 20,350 x 0.70 = 14,245.
  assert.equal(calcReducedPension(40700, 25, 60).reducedMonthlyPension, 14245);
  // Minimum also cut the same way: 15 yrs at Rs 30,000 floored to 11,500,
  // 12 months short -> 11,500 x 0.94 = 10,810.
  assert.equal(calcReducedPension(30000, 15, 12).reducedMonthlyPension, 10810);
});
check('pension old-age grant: one month wage per credited year, 2 to under 15 years', () => {
  // 8 years at Rs 40,700 = Rs 325,600 once.
  const g = calcOldAgeGrant(40700, 8);
  assert.equal(g.entitled, true);
  assert.equal(g.grant, 325600);
  assert.equal(calcOldAgeGrant(40700, 2).grant, 81400);
  assert.equal(calcOldAgeGrant(40700, 14.5).grant, 0); // 14.5 -> 15 credited, so pension not grant
  assert.equal(calcOldAgeGrant(40700, 14.5).entitled, false);
  assert.equal(calcOldAgeGrant(40700, 14).grant, 569800);
  assert.equal(calcOldAgeGrant(40700, 1).entitled, false);
  assert.equal(calcOldAgeGrant(40700, 15).entitled, false);
});
check('pension survivor: formula with minimum floor; pensioner spouse gets his pension', () => {
  // Deceased with 20 years at Rs 40,700, died in service: formula Rs 16,280.
  const s = calcSurvivorPension(40700, 20, false, undefined, true);
  assert.equal(s.entitled, true);
  assert.equal(s.monthlyPension, 16280);
  assert.equal(s.floorApplied, false);
  // 5 years at Rs 40,700: formula Rs 4,070 -> floored to Rs 11,500.
  const low = calcSurvivorPension(40700, 5, false, undefined, true);
  assert.equal(low.formulaPension, 4070);
  assert.equal(low.monthlyPension, 11500);
  assert.equal(low.floorApplied, true);
  // Under 36 months in service: not entitled.
  assert.equal(calcSurvivorPension(40700, 2, false, undefined, true).entitled, false);
  // Out of service needs 5 years: 4 years is not enough, 5 is.
  assert.equal(calcSurvivorPension(40700, 4, false, undefined, false).entitled, false);
  assert.equal(calcSurvivorPension(40700, 5, false, undefined, false).entitled, true);
  // Deceased was a pensioner on Rs 18,000: spouse gets Rs 18,000 (s.22B(2)).
  const p = calcSurvivorPension(40700, 25, true, 18000);
  assert.equal(p.monthlyPension, 18000);
  assert.equal(p.annualPension, 216000);
});
check('pension invalidity: same formula; 15 years or 5-since-entry + 3-in-last-5', () => {
  // 18 years: route (a), formula Rs 14,652.
  const a = calcInvalidityPension(40700, 18, 5);
  assert.equal(a.entitled, true);
  assert.equal(a.monthlyPension, 14652);
  // 8 years, 4 of them in the last 5: route (b), formula Rs 6,512 -> floored.
  const b = calcInvalidityPension(40700, 8, 4);
  assert.equal(b.entitled, true);
  assert.equal(b.monthlyPension, 11500);
  assert.equal(b.floorApplied, true);
  // 8 years but only 2 in the last 5: neither route.
  assert.equal(calcInvalidityPension(40700, 8, 2).entitled, false);
  // 4 years since entry: route (b) needs 5.
  assert.equal(calcInvalidityPension(40700, 4, 4).entitled, false);
});
check('pension: validation throws', () => {
  assert.throws(() => calcEobiPension(0, 25), /between/);
  assert.throws(() => calcEobiPension(40700, -1), /between 0/);
  assert.throws(() => calcEobiPension(40700, 61), /between 0/);
  assert.throws(() => calcEobiContributions(-100), /between/);
  assert.throws(() => calcReducedPension(40700, 25, 0), /between 1/);
  assert.throws(() => calcReducedPension(40700, 25, 61), /between 1/);
  assert.throws(() => calcOldAgeGrant(40700, 100), /between 0/);
  assert.throws(() => calcSurvivorPension(40700, 25, true), /pensioner/);
  assert.throws(() => calcSurvivorPension(40700, 25, true, 0), /pensioner/);
  assert.throws(() => calcInvalidityPension(40700, 10, 6), /between 0 and 5/);
});

// --- National Savings (CDNS rates w.e.f. 21 Oct 2026; SA 10.00% since 26 May 2026) ---
check('nss monthly profit: RIC 12.12% = Rs 1,010/month per Rs 100,000', () => {
  assert.equal(calcNssMonthlyProfit(100000, 12.12), 1010);
  assert.equal(calcNssMonthlyProfit(50000, 12.12), 505);
  assert.equal(calcNssMonthlyProfit(1000000, 12.12), 10100);
});
check('nss monthly profit: BSC/PBA/SFWA 12.96% = Rs 1,080/month per Rs 100,000', () => {
  assert.equal(calcNssMonthlyProfit(100000, 12.96), 1080);
  assert.equal(calcNssMonthlyProfit(500000, 12.96), 5400);
  assert.equal(calcNssMonthlyProfit(7500000, 12.96), 81000);
});
check('nss DSC encashment table on Rs 100,000 (CDNS schedule, not flat compounding)', () => {
  assert.equal(calcDscEncashment(100000, 10).profit, 215000);
  assert.equal(calcDscEncashment(100000, 10).value, 315000);
  assert.equal(calcDscEncashment(100000, 10).profitPct, 215);
  assert.equal(calcDscEncashment(100000, 1).profit, 10000);
  assert.equal(calcDscEncashment(100000, 1).value, 110000);
  assert.equal(calcDscEncashment(100000, 5).profit, 67000);
  assert.equal(calcDscEncashment(100000, 5).value, 167000);
  assert.equal(calcDscEncashment(100000, 2).profit, 21000);
  assert.equal(calcDscEncashment(100000, 9).profit, 176000);
  // Whole years only: 5.9 years pays the year-5 figure.
  assert.equal(calcDscEncashment(100000, 5.9).wholeYears, 5);
  assert.equal(calcDscEncashment(100000, 5.9).profit, 67000);
});
check('nss DSC: no profit before 1 full year', () => {
  const r = calcDscEncashment(100000, 0);
  assert.equal(r.noProfit, true);
  assert.equal(r.profit, 0);
  assert.equal(r.value, 100000);
  assert.equal(calcDscEncashment(100000, 0.9).noProfit, true);
  assert.equal(calcDscEncashment(100000, 0.9).profit, 0);
});
check('nss SSC half-yearly profit on Rs 100,000: Rs 6,000 x5 + Rs 6,400 = Rs 36,400', () => {
  assert.deepEqual(calcSscProfit(100000, 6).perPeriodProfit, [6000, 6000, 6000, 6000, 6000, 6400]);
  assert.equal(calcSscProfit(100000, 6).profit, 36400);
  assert.equal(calcSscProfit(100000, 6).value, 136400);
  assert.equal(calcSscProfit(100000, 1).profit, 6000);
  assert.equal(calcSscProfit(100000, 1).value, 106000);
  assert.equal(calcSscProfit(100000, 3).profit, 18000);
  assert.equal(calcSscProfit(200000, 6).profit, 72800);
});
check('nss SSC: no profit before 6 months', () => {
  const r = calcSscProfit(100000, 0);
  assert.equal(r.noProfit, true);
  assert.equal(r.profit, 0);
  assert.equal(r.value, 100000);
});
check('nss SA annual profit: 10.00% = Rs 10,000/year per Rs 100,000', () => {
  assert.equal(calcSaProfit(100000, 1).annualProfit, 10000);
  assert.equal(calcSaProfit(100000, 1).totalProfit, 10000);
  assert.equal(calcSaProfit(100000, 3).totalProfit, 30000);
  assert.equal(calcSaProfit(100000, 3).value, 130000);
  assert.equal(calcSaProfit(250000, 2).annualProfit, 25000);
});
check('nss WHT: 15% filer / 30% non-filer where it applies; 0% at source for BSC/PBA/SFWA', () => {
  const filer = applyNssWht(1010, true, 'filer');
  assert.equal(filer.whtRate, 0.15);
  assert.equal(filer.whtAmount, 151.5);
  assert.equal(filer.netProfit, 858.5);
  const nonFiler = applyNssWht(1010, true, 'non-filer');
  assert.equal(nonFiler.whtRate, 0.3);
  assert.equal(nonFiler.whtAmount, 303);
  assert.equal(nonFiler.netProfit, 707);
  const exempt = applyNssWht(1080, false, 'filer');
  assert.equal(exempt.whtRate, 0);
  assert.equal(exempt.whtAmount, 0);
  assert.equal(exempt.netProfit, 1080);
  assert.equal(exempt.noWhtAtSource, true);
});
check('nss dispatcher: RIC Rs 100,000 filer — Rs 1,010 gross, Rs 858.50 net/month', () => {
  const r = calcNationalSavings('ric', 100000, { filerStatus: 'filer' });
  assert.equal(r.monthlyProfit, 858.5);
  assert.equal(r.annualProfit, 10302);
  assert.equal(r.grossProfit, 1010);
  assert.equal(r.whtRate, 0.15);
  // 5-year tenure: total profit to maturity after tax.
  assert.equal(r.totalReceived, 100000 + 10302 * 5);
});
check('nss dispatcher: BSC Rs 100,000 — Rs 1,080/month, no WHT at source', () => {
  const r = calcNationalSavings('bsc', 100000);
  assert.equal(r.monthlyProfit, 1080);
  assert.equal(r.annualProfit, 12960);
  assert.equal(r.whtRate, 0);
  assert.equal(r.totalReceived, 100000 + 12960 * 10);
});
check('nss dispatcher: PBA Rs 100,000 non-filer still pays no WHT at source', () => {
  const r = calcNationalSavings('pba', 100000, { filerStatus: 'non-filer' });
  assert.equal(r.monthlyProfit, 1080);
  assert.equal(r.whtRate, 0);
});
check('nss dispatcher: SFWA Rs 100,000 — Rs 1,080/month, no fixed tenure', () => {
  const r = calcNationalSavings('sfwa', 100000);
  assert.equal(r.monthlyProfit, 1080);
  assert.equal(r.totalReceived, null);
});
check('nss dispatcher: DSC Rs 100,000 at maturity, filer — Rs 315,000 gross, Rs 282,750 after tax', () => {
  const r = calcNationalSavings('dsc', 100000, { filerStatus: 'filer' });
  assert.equal(r.grossProfit, 215000);
  assert.equal(r.whtAmount, 32250);
  assert.equal(r.netProfit, 182750);
  assert.equal(r.headlineValue, 282750);
  const nf = calcNationalSavings('dsc', 100000, { filerStatus: 'non-filer' });
  assert.equal(nf.whtAmount, 64500);
  assert.equal(nf.headlineValue, 250500);
});
check('nss dispatcher: DSC encashed at 5 years — Rs 167,000 gross value', () => {
  const r = calcNationalSavings('dsc', 100000, { yearsHeld: 5, filerStatus: 'filer' });
  assert.equal(r.grossProfit, 67000);
  assert.equal(r.headlineValue, 100000 + 67000 - 10050);
});
check('nss dispatcher: SSC Rs 100,000 full term, filer — Rs 36,400 gross, Rs 30,940 net', () => {
  const r = calcNationalSavings('ssc', 100000, { filerStatus: 'filer' });
  assert.equal(r.grossProfit, 36400);
  assert.equal(r.whtAmount, 5460);
  assert.equal(r.headlineValue, 130940);
});
check('nss dispatcher: SA Rs 100,000 — Rs 10,000 gross/year, Rs 8,500 net (filer)', () => {
  const r = calcNationalSavings('sa', 100000, { filerStatus: 'filer' });
  assert.equal(r.annualProfit, 8500);
  assert.equal(r.headlineValue, 8500);
  const r3 = calcNationalSavings('sa', 100000, { years: 3, filerStatus: 'filer' });
  assert.equal(r3.netProfit, 8500);
  assert.equal(r3.totalReceived, 125500);
});
check('nss: scheme minimums enforced; SFWA has no enforced maximum', () => {
  assert.throws(() => calcNationalSavings('ric', 49999), /minimum investment is Rs 50,000/);
  assert.throws(() => calcNationalSavings('bsc', 4999), /minimum investment is Rs 5,000/);
  assert.throws(() => calcNationalSavings('pba', 9999), /minimum investment is Rs 10,000/);
  assert.throws(() => calcNationalSavings('pba', 7500001), /maximum investment is Rs 7,500,000/);
  assert.throws(() => calcNationalSavings('dsc', 499), /minimum investment is Rs 500/);
  assert.throws(() => calcNationalSavings('sa', 99), /minimum investment is Rs 100/);
  // SFWA: no minimum or maximum is enforced (official page conflicts on the max).
  assert.equal(calcNationalSavings('sfwa', 5000000).monthlyProfit, 54000);
  assert.equal(calcNationalSavings('sfwa', 7500000).monthlyProfit, 81000);
});
check('nss: validation throws', () => {
  assert.throws(() => calcNationalSavings('xxx', 100000), /Choose a National Savings scheme/);
  assert.throws(() => nssSchemeById('xxx'), /Choose a National Savings scheme/);
  assert.throws(() => calcNationalSavings('dsc', 0), /positive number/);
  assert.throws(() => calcNationalSavings('dsc', -100), /positive number/);
  assert.throws(() => calcDscEncashment(100000, 11), /between 0 and 10/);
  assert.throws(() => calcDscEncashment(100000, -1), /between 0 and 10/);
  assert.throws(() => calcSscProfit(100000, 7), /between 0 and 6/);
  assert.throws(() => calcSaProfit(100000, 0), /between 1 and 30/);
  assert.throws(() => calcSaProfit(100000, 31), /between 1 and 30/);
  assert.throws(() => calcNssMonthlyProfit(100000, 0), /between 0% and 100%/);
  assert.throws(() => applyNssWht(-5, true, 'filer'), /between Rs 0/);
});


// --- GST (Sales Tax Act 1990; standard rate 18%, s.3(1); verified 13 Nov 2026) ---
check('gst: add 18% — worked example A (Rs 100,000 -> Rs 18,000 GST, total Rs 118,000)', () => {
  const r = calcGst({ amount: 100000, ratePct: 18, mode: 'add' });
  assert.equal(r.baseAmount, 100000);
  assert.equal(r.gstAmount, 18000);
  assert.equal(r.furtherTaxAmount, 0);
  assert.equal(r.total, 118000);
  assert.equal(r.ratePct, 18);
  assert.equal(r.exempt, false);
});
check('gst: remove 18% — worked example B (Rs 118,000 -> base Rs 100,000, GST Rs 18,000)', () => {
  const r = calcGst({ amount: 118000, ratePct: 18, mode: 'remove' });
  assert.equal(r.baseAmount, 100000);
  assert.equal(r.gstAmount, 18000);
  assert.equal(r.total, 118000);
});
check('gst: remove — the wrong method is wrong (18% of the inclusive price is Rs 21,240, not the GST)', () => {
  const r = calcGstRemove(118000, 18);
  assert.equal(r.gstAmount, 18000);
  assert.notEqual(118000 * 0.18, r.gstAmount);
  assert.equal(118000 * 0.18, 21240);
});
check('gst: 1% registered drugs — worked example C (Rs 10,000 -> Rs 100 GST, total Rs 10,100)', () => {
  const r = calcGstAdd(10000, 1);
  assert.equal(r.gstAmount, 100);
  assert.equal(r.total, 10100);
});
check('gst: 10% imported laptop — worked example D (Rs 100,000 -> Rs 10,000 GST, total Rs 110,000)', () => {
  const r = calcGstAdd(100000, 10);
  assert.equal(r.gstAmount, 10000);
  assert.equal(r.total, 110000);
});
check('gst: further tax — worked example E (Rs 100,000 to an unregistered buyer: 18% + 4% = Rs 22,000, total Rs 122,000)', () => {
  const r = calcGst({ amount: 100000, ratePct: 18, mode: 'add', furtherTax: true });
  assert.equal(r.gstAmount, 18000);
  assert.equal(r.furtherTaxAmount, 4000);
  assert.equal(r.total, 122000);
  assert.equal(r.furtherTax, true);
});
check('gst: further tax in remove mode divides by 1.22 (Rs 122,000 -> base Rs 100,000, GST Rs 18,000, further tax Rs 4,000)', () => {
  const r = calcGst({ amount: 122000, ratePct: 18, mode: 'remove', furtherTax: true });
  assert.equal(r.baseAmount, 100000);
  assert.equal(r.gstAmount, 18000);
  assert.equal(r.furtherTaxAmount, 4000);
  assert.equal(r.total, 122000);
});
check('gst: zero-rated export / exempt — worked example F (Rs 100,000 -> Rs 0 GST)', () => {
  const z = calcGstAdd(100000, 0);
  assert.equal(z.gstAmount, 0);
  assert.equal(z.total, 100000);
  assert.equal(z.exempt, false);
  const e = calcGstAdd(100000, null);
  assert.equal(e.gstAmount, 0);
  assert.equal(e.total, 100000);
  assert.equal(e.exempt, true);
  assert.equal(e.ratePct, 0);
});
check('gst: every reduced preset rate adds correctly on Rs 100,000', () => {
  assert.equal(calcGstAdd(100000, 3).total, 103000); // gold jewellery (as listed)
  assert.equal(calcGstAdd(100000, 5).total, 105000); // DAP / second-hand clothing
  assert.equal(calcGstAdd(100000, 12).total, 112000); // former FATA/PATA transitional
  assert.equal(calcGstAdd(100000, 25).total, 125000); // imported phone over US$500 / large local vehicle
});
check('gst: add and remove round-trip at 18% and at a custom rate', () => {
  const added = calcGstAdd(54321, 18);
  const removed = calcGstRemove(added.total, 18);
  assert.equal(removed.baseAmount, 54321);
  assert.equal(removed.gstAmount, added.gstAmount);
  const custom = calcGst({ amount: 7777, ratePct: 7.5, mode: 'add' });
  assert.equal(custom.gstAmount, 583.28);
  assert.equal(custom.total, 8360.28);
});
check('gst: validation throws', () => {
  assert.throws(() => calcGst({ amount: 0, ratePct: 18, mode: 'add' }), /positive number/);
  assert.throws(() => calcGst({ amount: -100, ratePct: 18, mode: 'add' }), /positive number/);
  assert.throws(() => calcGst({ amount: 100, ratePct: -1, mode: 'add' }), /between 0% and 100%/);
  assert.throws(() => calcGst({ amount: 100, ratePct: 101, mode: 'add' }), /between 0% and 100%/);
  assert.throws(() => calcGst({ amount: 100, ratePct: 18, mode: 'sideways' as 'add' }), /'add' or 'remove'/);
  assert.throws(() => calcGstAdd(0, 18), /positive number/);
  assert.throws(() => calcGstRemove(-500, 18), /positive number/);
});

console.log(`\n${passed} checks passed.`);
