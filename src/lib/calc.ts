// Pure calculation functions for all 8 tools. No DOM, no network, no
// storage, no randomness. Every value that can change year to year is
// read from src/config/* — never hard-coded here (SRS G17-G19).
// Rounding is display-only, except where a function documents that a
// rounded value feeds a later total (EMI schedule, SRS §4.3).

import { TAX_SLABS, TAX_SLAB_LOWER_BOUNDS } from '../config/tax';
import { NISAB_GOLD_GRAMS, NISAB_SILVER_GRAMS, TOLA_GRAMS, ZAKAT_RATE } from '../config/zakat';
import { AREA_UNITS, type AreaUnit } from '../config/units';

export const MAX_AMOUNT = 999999999999;

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Parse a user-typed number: digits, one decimal point, optional sign.
 *  Well-formed comma grouping (1,000) is accepted; malformed grouping
 *  (1,,000 / 1,2) is rejected. Returns null for blank/non-numeric. */
export function parseDecimal(raw: string): number | null {
  const text = raw.trim();
  if (text === '') return null;
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text) || /^-?(\d+(\.\d*)?|\.\d+)$/.test(text)) {
    const value = Number(text.replace(/,/g, ''));
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

export function formatPKR(value: number, decimals = 0): string {
  return `Rs ${value.toLocaleString('en-PK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-PK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPct(value: number): string {
  return `${formatNumber(value, 2)}%`;
}

// ---------------------------------------------------------------- Tax --
export interface TaxResult {
  annualIncome: number;
  annualTax: number;
  monthlyTax: number;
  annualTakeHome: number;
  effectiveRate: number;
  marginalRate: number;
  bracketIndex: number;
}

export function calcTax(annualTaxableIncome: number): TaxResult {
  if (!isFiniteNumber(annualTaxableIncome) || annualTaxableIncome <= 0 || annualTaxableIncome > MAX_AMOUNT) {
    throw new Error('Annual taxable income must be a positive number.');
  }
  let bracketIndex = 0;
  for (let i = 0; i < TAX_SLABS.length; i++) {
    const slab = TAX_SLABS[i];
    if (slab.upTo === null || annualTaxableIncome <= slab.upTo) {
      bracketIndex = i;
      break;
    }
  }
  const slab = TAX_SLABS[bracketIndex];
  const lower = TAX_SLAB_LOWER_BOUNDS[bracketIndex];
  const annualTax = slab.baseTax + slab.rate * (annualTaxableIncome - lower);
  const monthlyTax = annualTax / 12;
  return {
    annualIncome: annualTaxableIncome,
    annualTax,
    monthlyTax,
    annualTakeHome: annualTaxableIncome - annualTax,
    effectiveRate: Number(((annualTax / annualTaxableIncome) * 100).toFixed(6)),
    marginalRate: Number((slab.rate * 100).toFixed(6)),
    bracketIndex,
  };
}

// ---------------------------------------------------------------- EMI --
export interface ScheduleRow {
  month: number;
  emi: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface EmiResult {
  emi: number;
  totalPayment: number;
  totalInterest: number;
  principal: number;
  schedule: ScheduleRow[];
  /** True when the schedule was built from per-row rounding; the final
   *  instalment is adjusted so the schedule sums to the headline total. */
  finalAdjusted: boolean;
}

export const EMI_MAX_RATE = 100;
export const EMI_MAX_MONTHS = 600;

/**
 * EMI algorithm decision (QA Q-B1/Q-B2, recorded here and in the README):
 * EMI is computed at full precision and displayed rounded to 2 decimals.
 * The schedule is built with per-row rounding (interest rounded each
 * month, principal = EMI - interest), and the FINAL instalment is
 * adjusted so the schedule sums exactly to the headline total and the
 * closing balance is zero. Long schedules therefore carry a visible
 * rounding note on the page, and totals are schedule sums — not
 * unrounded-EMI x N — so the page never contradicts itself.
 * Stall guard: if rounded interest consumes the whole EMI on a
 * non-final row, the calculation throws instead of producing a schedule
 * in which the balance never falls. The page shows a clear error.
 */
export function calcEMI(principal: number, annualRatePct: number, months: number): EmiResult {
  if (!isFiniteNumber(principal) || principal <= 0 || principal > MAX_AMOUNT) {
    throw new Error('Loan amount must be a positive number.');
  }
  if (!isFiniteNumber(annualRatePct) || annualRatePct < 0 || annualRatePct > EMI_MAX_RATE) {
    throw new Error(`Annual interest rate must be between 0 and ${EMI_MAX_RATE}%.`);
  }
  if (!Number.isInteger(months) || months < 1 || months > EMI_MAX_MONTHS) {
    throw new Error(`Tenure must be a whole number of months between 1 and ${EMI_MAX_MONTHS}.`);
  }
  const monthlyRate = annualRatePct / 100 / 12;
  const emiUnrounded = monthlyRate > 0
    ? (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    : principal / months;
  const emi = round2(emiUnrounded);
  const schedule: ScheduleRow[] = [];
  let balance = principal;
  for (let month = 1; month <= months; month++) {
    const interest = round2(balance * monthlyRate);
    let principalPart = round2(emi - interest);
    let instalment = emi;
    if (month < months && monthlyRate > 0 && principalPart <= 0) {
      throw new Error('This rate and tenure combination cannot be scheduled: the interest uses up the whole instalment. Try a lower rate or a shorter tenure.');
    }
    if (month === months) {
      // Final instalment absorbs the remaining balance so the schedule
      // sums exactly and the closing balance is zero.
      principalPart = round2(balance);
      instalment = round2(interest + principalPart);
    }
    balance = round2(balance - principalPart);
    schedule.push({ month, emi: instalment, interest, principal: principalPart, balance: month === months ? 0 : balance });
  }
  const totalPayment = round2(schedule.reduce((sum, row) => sum + row.emi, 0));
  return {
    emi,
    totalPayment,
    totalInterest: round2(totalPayment - principal),
    principal,
    schedule,
    finalAdjusted: months > 1,
  };
}

// -------------------------------------------------------------- Zakat --
export interface ZakatInput {
  cash: number;
  goldValue: number;
  silverValue: number;
  tradeGoods: number;
  otherAssets: number;
  debts: number;
  goldPricePerTola: number | null;
  silverPricePerTola: number | null;
  nisabBasis?: 'gold' | 'silver' | 'both';
}

export interface ZakatResult {
  gross: number;
  debts: number;
  net: number;
  goldNisabPKR: number | null;
  silverNisabPKR: number | null;
  nisabBasis: 'gold' | 'silver';
  nisabThreshold: number | null;
  nisabMet: boolean;
  zakat: number;
}

export function goldValueFromWeight(weight: number, unit: 'tola' | 'grams', pricePerTola: number): number {
  const grams = unit === 'tola' ? weight * TOLA_GRAMS : weight;
  return grams * (pricePerTola / TOLA_GRAMS);
}

export function calcZakat(input: ZakatInput): ZakatResult {
  const values = [input.cash, input.goldValue, input.silverValue, input.tradeGoods, input.otherAssets, input.debts];
  if (values.some((v) => !isFiniteNumber(v) || v < 0)) {
    throw new Error('All Zakat amounts must be zero or more.');
  }
  const gross = input.cash + input.goldValue + input.silverValue + input.tradeGoods + input.otherAssets;
  const net = Math.max(0, gross - input.debts);
  const goldNisabPKR = input.goldPricePerTola !== null && input.goldPricePerTola > 0
    ? NISAB_GOLD_GRAMS * (input.goldPricePerTola / TOLA_GRAMS)
    : null;
  const silverNisabPKR = input.silverPricePerTola !== null && input.silverPricePerTola > 0
    ? NISAB_SILVER_GRAMS * (input.silverPricePerTola / TOLA_GRAMS)
    : null;
  // Default rule (owner decision OQ-07): only gold owned -> gold basis,
  // otherwise silver basis for mixed assets. An explicit toggle overrides.
  const defaultBasis: 'gold' | 'silver' =
    input.goldValue > 0 && input.silverValue === 0 && input.cash === 0 && input.tradeGoods === 0 && input.otherAssets === 0
      ? 'gold'
      : 'silver';
  const basis = input.nisabBasis === 'both' ? defaultBasis : (input.nisabBasis ?? defaultBasis);
  const threshold = basis === 'gold' ? goldNisabPKR : silverNisabPKR;
  const nisabMet = threshold !== null ? net >= threshold : false;
  return {
    gross,
    debts: input.debts,
    net,
    goldNisabPKR,
    silverNisabPKR,
    nisabBasis: basis,
    nisabThreshold: threshold,
    nisabMet,
    zakat: nisabMet && threshold !== null ? round2(ZAKAT_RATE * net) : 0,
  };
}

// ----------------------------------------------------------- Currency --
export interface ConversionResult {
  converted: number;
  rate: number;
  inverseRate: number;
}

/** Rates are PKR per 1 unit of each currency, from the live snapshot.
 *  Cross rates are derived through PKR for every pair (documented route;
 *  direct and cross rates are never mixed for the same pair). */
export function convertCurrency(amount: number, from: string, to: string, pkrPerUnit: Record<string, number>): ConversionResult {
  if (!isFiniteNumber(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    throw new Error('Amount must be a positive number.');
  }
  const fromRate = pkrPerUnit[from];
  const toRate = pkrPerUnit[to];
  if (!isFiniteNumber(fromRate) || !isFiniteNumber(toRate) || fromRate <= 0 || toRate <= 0) {
    throw new Error('No rate is available for this currency pair.');
  }
  if (from === to) return { converted: round2(amount), rate: 1, inverseRate: 1 };
  const rate = fromRate / toRate;
  return { converted: round2(amount * rate), rate, inverseRate: 1 / rate };
}

// --------------------------------------------------------------- Gold --
export interface GoldResult {
  grams: number;
  tola: number;
  pricePerGram: number;
  pricePerTola: number;
  pureValue: number;
  adjustedValue: number;
  purityFraction: number;
}

export function calcGold(weight: number, unit: 'tola' | 'grams', karat: number, pricePerTola: number): GoldResult {
  if (!isFiniteNumber(weight) || weight <= 0) throw new Error('Weight must be a positive number.');
  if (!Number.isInteger(karat) || karat < 1 || karat > 24) throw new Error('Karat must be a whole number between 1 and 24.');
  if (!isFiniteNumber(pricePerTola) || pricePerTola <= 0) throw new Error('Price per tola must be a positive number.');
  const grams = unit === 'tola' ? weight * TOLA_GRAMS : weight;
  const pricePerGram = pricePerTola / TOLA_GRAMS;
  const purityFraction = karat / 24;
  const pureValue = grams * pricePerGram;
  return {
    grams,
    tola: grams / TOLA_GRAMS,
    pricePerGram,
    pricePerTola,
    pureValue: round2(pureValue),
    adjustedValue: round2(pureValue * purityFraction),
    purityFraction,
  };
}

// --------------------------------------------------------- Percentage --
export interface PercentageResult {
  result: number;
  /** Human-readable formula with the entered numbers substituted. */
  formula: string;
  difference?: number;
  direction?: 'increase' | 'decrease' | 'no change';
}

export function calcPercentage(mode: '6a' | '6b' | '6c', a: number, b: number): PercentageResult {
  if (!isFiniteNumber(a) || !isFiniteNumber(b)) throw new Error('Both values must be numbers.');
  if (mode === '6a') {
    const result = (a / 100) * b;
    return { result, formula: `${formatNumber(a)}% of ${formatNumber(b)} = ${formatNumber(result)}` };
  }
  if (mode === '6b') {
    if (b === 0) throw new Error('Cannot divide by zero: the second value must not be zero.');
    const result = (a / b) * 100;
    return { result, formula: `${formatNumber(a)} is ${formatNumber(result, 2)}% of ${formatNumber(b)}` };
  }
  if (a === 0) throw new Error('Percentage change from zero is undefined: the starting value must not be zero.');
  const result = ((b - a) / a) * 100;
  const direction = result > 0 ? 'increase' : result < 0 ? 'decrease' : 'no change';
  return {
    result,
    formula: `${formatNumber(a)} to ${formatNumber(b)} = ${formatNumber(result, 2)}% (${direction})`,
    difference: b - a,
    direction,
  };
}

// ---------------------------------------------------------------- Age --
export interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  remainingDays: number;
  totalMonths: number;
  nextBirthday: string;
  daysUntilNextBirthday: number;
  dayOfWeekBorn: string;
  /** True when the age is over 150 years: the page must show a warning
   *  and ask the user to check the date (spec: warn 150-200, reject >200). */
  implausibleAgeWarning: boolean;
}

function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[3])) {
    return null;
  }
  return date;
}

export function todayInKarachi(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts;
}

export function calcAge(dobISO: string, asOfISO: string): AgeResult {
  const dob = parseISODate(dobISO);
  const asOf = parseISODate(asOfISO);
  if (!dob || !asOf) throw new Error('Enter real calendar dates.');
  if (asOf.getTime() < dob.getTime()) throw new Error('The “age at” date must not be before the date of birth.');
  const ageMs = asOf.getTime() - dob.getTime();
  if (ageMs > 200 * 366 * 86400000) {
    throw new Error('That date of birth is more than 200 years before the selected date. Please check it.');
  }
  const implausibleAgeWarning = ageMs > 150 * 366 * 86400000;
  let years = asOf.getUTCFullYear() - dob.getUTCFullYear();
  let months = asOf.getUTCMonth() - dob.getUTCMonth();
  let days = asOf.getUTCDate() - dob.getUTCDate();
  // Looped borrowing: a single borrow is not enough for month-end
  // dates (e.g. 31 Jan -> 1 Mar: borrowing February's 28 days still
  // leaves a negative day count). Borrow repeatedly, moving one
  // month back each time, until days >= 0 (SRS §9.3, QA AT7.3).
  let borrowYear = asOf.getUTCFullYear();
  let borrowMonth = asOf.getUTCMonth();
  while (days < 0) {
    const daysInPrevMonth = new Date(Date.UTC(borrowYear, borrowMonth, 0)).getUTCDate();
    days += daysInPrevMonth;
    months -= 1;
    borrowMonth -= 1;
    if (borrowMonth < 0) {
      borrowMonth = 11;
      borrowYear -= 1;
    }
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }
  const totalDays = Math.floor(ageMs / 86400000);
  // Next birthday: 29 Feb birthdays use 1 March in non-leap years (OQ-12).
  const isLeapBirthday = dob.getUTCMonth() === 1 && dob.getUTCDate() === 29;
  let candidateYear = asOf.getUTCFullYear();
  const birthdayInYear = (year: number): Date => {
    if (isLeapBirthday) {
      const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
      return leap ? new Date(Date.UTC(year, 1, 29)) : new Date(Date.UTC(year, 2, 1));
    }
    return new Date(Date.UTC(year, dob.getUTCMonth(), dob.getUTCDate()));
  };
  let next = birthdayInYear(candidateYear);
  if (next.getTime() <= asOf.getTime()) {
    candidateYear += 1;
    next = birthdayInYear(candidateYear);
  }
  const nextISO = next.toISOString().slice(0, 10);
  return {
    years,
    months,
    days,
    totalDays,
    totalWeeks: Math.floor(totalDays / 7),
    remainingDays: totalDays % 7,
    totalMonths: years * 12 + months,
    nextBirthday: nextISO,
    daysUntilNextBirthday: Math.floor((next.getTime() - asOf.getTime()) / 86400000),
    dayOfWeekBorn: new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' }).format(dob),
    implausibleAgeWarning,
  };
}

// ------------------------------------------------------------ Area ----
export function convertArea(value: number, fromId: string, toId: string): number {
  return convertAreaWithUnits(value, fromId, toId, AREA_UNITS);
}

/** Same conversion, against an explicit unit list (marla-standard aware). */
export function convertAreaWithUnits(
  value: number,
  fromId: string,
  toId: string,
  units: AreaUnit[],
): number {
  if (!isFiniteNumber(value) || value < 0 || value > MAX_AMOUNT) {
    throw new Error('Area must be zero or more.');
  }
  const from = units.find((u) => u.id === fromId);
  const to = units.find((u) => u.id === toId);
  if (!from || !to) throw new Error('Choose units from the list.');
  return (value * from.sqft) / to.sqft;
}

export function convertAreaToAll(value: number, fromId: string): Record<string, number> {
  return convertAreaToAllWithUnits(value, fromId, AREA_UNITS);
}

/** Same table, against an explicit unit list (marla-standard aware). */
export function convertAreaToAllWithUnits(
  value: number,
  fromId: string,
  units: AreaUnit[],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const unit of units) {
    result[unit.id] = convertAreaWithUnits(value, fromId, unit.id, units);
  }
  return result;
}

// ------------------------------------------------------------ Fuel -----
export interface FuelResult {
  distance: number;
  totalDistance: number;
  litres: number;
  totalCost: number;
  costPerKm: number;
}

export function calcFuel(distanceKm: number, mileageKmPerLitre: number, pricePerLitre: number, returnTrip: boolean): FuelResult {
  if (!isFiniteNumber(distanceKm) || distanceKm <= 0 || distanceKm > MAX_AMOUNT) {
    throw new Error('Distance must be a positive number.');
  }
  if (!isFiniteNumber(mileageKmPerLitre) || mileageKmPerLitre <= 0) {
    throw new Error('Mileage must be a positive number of kilometres per litre.');
  }
  if (!isFiniteNumber(pricePerLitre) || pricePerLitre <= 0 || pricePerLitre > MAX_AMOUNT) {
    throw new Error('Fuel price per litre must be a positive number.');
  }
  const totalDistance = returnTrip ? distanceKm * 2 : distanceKm;
  const litres = totalDistance / mileageKmPerLitre;
  const totalCost = litres * pricePerLitre;
  return {
    distance: distanceKm,
    totalDistance,
    litres: round2(litres),
    totalCost: round2(totalCost),
    costPerKm: round2(totalCost / totalDistance),
  };
}

// ------------------------------------------------- Compound interest --
export interface CompoundYearRow {
  year: number;
  balance: number;
  totalContributions: number;
  interestEarned: number;
}

export interface CompoundResult {
  finalAmount: number;
  totalContributions: number;
  interestEarned: number;
  rows: CompoundYearRow[];
}

export const COMPOUND_FREQUENCIES = [1, 2, 4, 12] as const;

export function calcCompound(
  principal: number,
  monthlyContribution: number,
  annualRatePct: number,
  years: number,
  periodsPerYear: number,
): CompoundResult {
  if (!isFiniteNumber(principal) || principal < 0 || principal > MAX_AMOUNT) {
    throw new Error('Starting amount must be zero or more.');
  }
  if (!isFiniteNumber(monthlyContribution) || monthlyContribution < 0 || monthlyContribution > MAX_AMOUNT) {
    throw new Error('Monthly contribution must be zero or more.');
  }
  if (!isFiniteNumber(annualRatePct) || annualRatePct < 0 || annualRatePct > 100) {
    throw new Error('Annual return must be between 0 and 100%.');
  }
  if (!Number.isInteger(years) || years < 1 || years > 50) {
    throw new Error('Years must be a whole number between 1 and 50.');
  }
  if (!COMPOUND_FREQUENCIES.includes(periodsPerYear as (typeof COMPOUND_FREQUENCIES)[number])) {
    throw new Error('Compounding frequency must be annual, half-yearly, quarterly, or monthly.');
  }
  const ratePerPeriod = annualRatePct / 100 / periodsPerYear;
  const contributionPerPeriod = (monthlyContribution * 12) / periodsPerYear;
  const totalPeriods = years * periodsPerYear;
  let balance = principal;
  const rows: CompoundYearRow[] = [];
  for (let period = 1; period <= totalPeriods; period++) {
    // Contributions are added at the end of each period, then interest
    // applies from the next period — the same end-of-period convention
    // as the EMI schedule (interest on the balance outstanding).
    balance = round2(balance * (1 + ratePerPeriod) + contributionPerPeriod);
    if (period % periodsPerYear === 0) {
      const year = period / periodsPerYear;
      const totalContributions = round2(principal + monthlyContribution * 12 * year);
      rows.push({
        year,
        balance,
        totalContributions,
        interestEarned: round2(balance - totalContributions),
      });
    }
  }
  const totalContributions = round2(principal + monthlyContribution * 12 * years);
  return {
    finalAmount: balance,
    totalContributions,
    interestEarned: round2(balance - totalContributions),
    rows,
  };
}

// ------------------------------------------------- Loan eligibility ---
export interface LoanEligibilityResult {
  maxEmi: number;
  maxLoan: number;
  /** EMI the borrower can afford after existing obligations. */
  affordableEmi: number;
}

export function calcLoanEligibility(
  monthlyIncome: number,
  monthlyObligations: number,
  maxEmiSharePct: number,
  annualRatePct: number,
  months: number,
): LoanEligibilityResult {
  if (!isFiniteNumber(monthlyIncome) || monthlyIncome <= 0 || monthlyIncome > MAX_AMOUNT) {
    throw new Error('Monthly income must be a positive number.');
  }
  if (!isFiniteNumber(monthlyObligations) || monthlyObligations < 0 || monthlyObligations > MAX_AMOUNT) {
    throw new Error('Existing monthly obligations must be zero or more.');
  }
  if (!isFiniteNumber(maxEmiSharePct) || maxEmiSharePct <= 0 || maxEmiSharePct > 100) {
    throw new Error('Maximum EMI share must be between 0 and 100%.');
  }
  if (!isFiniteNumber(annualRatePct) || annualRatePct < 0 || annualRatePct > EMI_MAX_RATE) {
    throw new Error(`Annual interest rate must be between 0 and ${EMI_MAX_RATE}%.`);
  }
  if (!Number.isInteger(months) || months < 1 || months > EMI_MAX_MONTHS) {
    throw new Error(`Tenure must be a whole number of months between 1 and ${EMI_MAX_MONTHS}.`);
  }
  const maxEmi = monthlyIncome * (maxEmiSharePct / 100);
  const affordableEmi = maxEmi - monthlyObligations;
  if (affordableEmi <= 0) {
    throw new Error('Existing obligations leave no room for an EMI at this share of income. Lower the obligations or raise the EMI share.');
  }
  const monthlyRate = annualRatePct / 100 / 12;
  // Inverse of the EMI formula: P = EMI x ((1+r)^n - 1) / (r x (1+r)^n).
  const maxLoan = monthlyRate > 0
    ? affordableEmi * ((Math.pow(1 + monthlyRate, months) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, months)))
    : affordableEmi * months;
  return { maxEmi: round2(maxEmi), maxLoan: round2(maxLoan), affordableEmi: round2(affordableEmi) };
}

// -------------------------------------------------------- Inflation ---
export interface InflationResult {
  futureCost: number;
  purchasingPower: number;
}

export function calcInflation(amount: number, annualRatePct: number, years: number): InflationResult {
  if (!isFiniteNumber(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    throw new Error('Amount must be a positive number.');
  }
  if (!isFiniteNumber(annualRatePct) || annualRatePct < 0 || annualRatePct > 100) {
    throw new Error('Inflation rate must be between 0 and 100%.');
  }
  if (!isFiniteNumber(years) || years < 0 || years > 100) {
    throw new Error('Years must be between 0 and 100.');
  }
  const factor = Math.pow(1 + annualRatePct / 100, years);
  return {
    futureCost: round2(amount * factor),
    purchasingPower: round2(amount / factor),
  };
}

// ----------------------------------------------------------- Budget ----
export interface BudgetResult {
  needs: number;
  wants: number;
  savings: number;
  total: number;
}

export function calcBudget(income: number, needsPct: number, wantsPct: number, savingsPct: number): BudgetResult {
  if (!isFiniteNumber(income) || income <= 0 || income > MAX_AMOUNT) {
    throw new Error('Monthly take-home pay must be a positive number.');
  }
  for (const pct of [needsPct, wantsPct, savingsPct]) {
    if (!isFiniteNumber(pct) || pct < 0 || pct > 100) {
      throw new Error('Each percentage must be between 0 and 100.');
    }
  }
  const sum = needsPct + wantsPct + savingsPct;
  if (Math.abs(sum - 100) > 0.01) {
    throw new Error('The three percentages must add up to 100%.');
  }
  return {
    needs: round2((income * needsPct) / 100),
    wants: round2((income * wantsPct) / 100),
    savings: round2((income * savingsPct) / 100),
    total: income,
  };
}

// ------------------------------------------------------- Debt payoff --
export interface DebtPayoffResult {
  monthsWithExtra: number;
  totalInterestWithExtra: number;
  monthsWithoutExtra: number | null;
  totalInterestWithoutExtra: number | null;
  interestSaved: number | null;
  monthlyPayment: number;
}

const DEBT_MAX_MONTHS = 1200;

function simulatePayoff(balance: number, monthlyRate: number, payment: number): { months: number; totalInterest: number } | null {
  let remaining = balance;
  let totalInterest = 0;
  for (let month = 1; month <= DEBT_MAX_MONTHS; month++) {
    const interest = round2(remaining * monthlyRate);
    if (monthlyRate > 0 && payment <= interest) return null; // never amortises
    const principalPart = Math.min(remaining, round2(payment - interest));
    totalInterest = round2(totalInterest + interest);
    remaining = round2(remaining - principalPart);
    if (remaining <= 0) return { months: month, totalInterest };
  }
  return null; // exceeds the 100-year cap: effectively never pays off
}

export function calcDebtPayoff(
  balance: number,
  annualRatePct: number,
  monthlyPayment: number,
  extraPayment: number,
): DebtPayoffResult {
  if (!isFiniteNumber(balance) || balance <= 0 || balance > MAX_AMOUNT) {
    throw new Error('Loan balance must be a positive number.');
  }
  if (!isFiniteNumber(annualRatePct) || annualRatePct < 0 || annualRatePct > EMI_MAX_RATE) {
    throw new Error(`Annual interest rate must be between 0 and ${EMI_MAX_RATE}%.`);
  }
  if (!isFiniteNumber(monthlyPayment) || monthlyPayment <= 0 || monthlyPayment > MAX_AMOUNT) {
    throw new Error('Monthly payment must be a positive number.');
  }
  if (!isFiniteNumber(extraPayment) || extraPayment < 0 || extraPayment > MAX_AMOUNT) {
    throw new Error('Extra monthly payment must be zero or more.');
  }
  const monthlyRate = annualRatePct / 100 / 12;
  const combined = monthlyPayment + extraPayment;
  const withExtra = simulatePayoff(balance, monthlyRate, combined);
  if (withExtra === null) {
    throw new Error('The monthly payment does not cover the monthly interest, so the balance would never fall. Increase the payment or the extra payment.');
  }
  const withoutExtra = simulatePayoff(balance, monthlyRate, monthlyPayment);
  const interestSaved = withoutExtra !== null ? round2(withoutExtra.totalInterest - withExtra.totalInterest) : null;
  return {
    monthsWithExtra: withExtra.months,
    totalInterestWithExtra: withExtra.totalInterest,
    monthsWithoutExtra: withoutExtra?.months ?? null,
    totalInterestWithoutExtra: withoutExtra?.totalInterest ?? null,
    interestSaved,
    monthlyPayment: combined,
  };
}

// ---------------------------------------------------- Fixed deposit ---
export type DepositCompounding = 'monthly' | 'quarterly' | 'annual' | 'maturity';

export interface FixedDepositResult {
  maturityAmount: number;
  profitBeforeTax: number;
  taxAmount: number;
  profitAfterTax: number;
}

export function calcFixedDeposit(
  principal: number,
  annualRatePct: number,
  years: number,
  compounding: DepositCompounding,
  withholdingTaxPct: number,
): FixedDepositResult {
  if (!isFiniteNumber(principal) || principal <= 0 || principal > MAX_AMOUNT) {
    throw new Error('Deposit amount must be a positive number.');
  }
  if (!isFiniteNumber(annualRatePct) || annualRatePct < 0 || annualRatePct > 100) {
    throw new Error('Annual profit rate must be between 0 and 100%.');
  }
  if (!isFiniteNumber(years) || years <= 0 || years > 30) {
    throw new Error('Tenure must be between 0 and 30 years.');
  }
  if (!['monthly', 'quarterly', 'annual', 'maturity'].includes(compounding)) {
    throw new Error('Choose a compounding option.');
  }
  if (!isFiniteNumber(withholdingTaxPct) || withholdingTaxPct < 0 || withholdingTaxPct > 100) {
    throw new Error('Withholding tax must be between 0 and 100%.');
  }
  const rate = annualRatePct / 100;
  let maturity: number;
  if (compounding === 'maturity') {
    maturity = principal * (1 + rate * years);
  } else {
    const n = compounding === 'monthly' ? 12 : compounding === 'quarterly' ? 4 : 1;
    maturity = principal * Math.pow(1 + rate / n, n * years);
  }
  const maturityAmount = round2(maturity);
  const profitBeforeTax = round2(maturityAmount - principal);
  const taxAmount = round2((profitBeforeTax * withholdingTaxPct) / 100);
  return {
    maturityAmount,
    profitBeforeTax,
    taxAmount,
    profitAfterTax: round2(profitBeforeTax - taxAmount),
  };
}

// --------------------------------------------------- Loan comparison --
export interface LoanComparisonResult {
  loanA: EmiResult;
  loanB: EmiResult;
  cheaper: 'A' | 'B' | 'equal';
  saving: number;
}

export function calcLoanComparison(
  principalA: number, rateA: number, monthsA: number,
  principalB: number, rateB: number, monthsB: number,
): LoanComparisonResult {
  const loanA = calcEMI(principalA, rateA, monthsA);
  const loanB = calcEMI(principalB, rateB, monthsB);
  const diff = round2(loanA.totalPayment - loanB.totalPayment);
  return {
    loanA,
    loanB,
    cheaper: diff < 0 ? 'A' : diff > 0 ? 'B' : 'equal',
    saving: Math.abs(diff),
  };
}

// ------------------------------------------------------ Goal savings --
export interface GoalSavingsResult {
  /** Required monthly contribution (mode: monthly) — 0 when already funded. */
  monthlyContribution: number | null;
  /** Months needed (mode: duration). */
  months: number | null;
  futureValueOfCurrent: number;
  shortfall: number;
}

export function calcGoalMonthly(
  target: number,
  currentSavings: number,
  annualReturnPct: number,
  months: number,
): GoalSavingsResult {
  if (!isFiniteNumber(target) || target <= 0 || target > MAX_AMOUNT) {
    throw new Error('Target amount must be a positive number.');
  }
  if (!isFiniteNumber(currentSavings) || currentSavings < 0 || currentSavings > MAX_AMOUNT) {
    throw new Error('Current savings must be zero or more.');
  }
  if (!isFiniteNumber(annualReturnPct) || annualReturnPct < 0 || annualReturnPct > 100) {
    throw new Error('Expected annual return must be between 0 and 100%.');
  }
  if (!Number.isInteger(months) || months < 1 || months > 1200) {
    throw new Error('Time must be a whole number of months between 1 and 1200.');
  }
  const monthlyRate = annualReturnPct / 100 / 12;
  const growth = Math.pow(1 + monthlyRate, months);
  const futureValueOfCurrent = round2(currentSavings * growth);
  const shortfall = round2(Math.max(0, target - futureValueOfCurrent));
  if (shortfall <= 0) return { monthlyContribution: 0, months: null, futureValueOfCurrent, shortfall: 0 };
  const monthlyContribution = monthlyRate > 0
    ? (shortfall * monthlyRate) / (growth - 1)
    : shortfall / months;
  return { monthlyContribution: round2(monthlyContribution), months: null, futureValueOfCurrent, shortfall };
}

export function calcGoalDuration(
  target: number,
  currentSavings: number,
  annualReturnPct: number,
  monthlyContribution: number,
): GoalSavingsResult {
  if (!isFiniteNumber(target) || target <= 0 || target > MAX_AMOUNT) {
    throw new Error('Target amount must be a positive number.');
  }
  if (!isFiniteNumber(currentSavings) || currentSavings < 0 || currentSavings > MAX_AMOUNT) {
    throw new Error('Current savings must be zero or more.');
  }
  if (!isFiniteNumber(annualReturnPct) || annualReturnPct < 0 || annualReturnPct > 100) {
    throw new Error('Expected annual return must be between 0 and 100%.');
  }
  if (!isFiniteNumber(monthlyContribution) || monthlyContribution <= 0 || monthlyContribution > MAX_AMOUNT) {
    throw new Error('Monthly contribution must be a positive number.');
  }
  if (currentSavings >= target) {
    return { monthlyContribution: null, months: 0, futureValueOfCurrent: currentSavings, shortfall: 0 };
  }
  const monthlyRate = annualReturnPct / 100 / 12;
  let months: number;
  if (monthlyRate > 0) {
    const ratio = (target + monthlyContribution / monthlyRate) / (currentSavings + monthlyContribution / monthlyRate);
    months = Math.ceil(Math.log(ratio) / Math.log(1 + monthlyRate));
  } else {
    months = Math.ceil((target - currentSavings) / monthlyContribution);
  }
  if (!Number.isFinite(months) || months < 1 || months > 1200) {
    throw new Error('This goal cannot be reached within 100 years at this contribution and return. Increase the monthly contribution or the time horizon.');
  }
  return { monthlyContribution: null, months, futureValueOfCurrent: round2(currentSavings), shortfall: round2(target - currentSavings) };
}
