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
