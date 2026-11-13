// Pure calculation functions for all 8 tools. No DOM, no network, no
// storage, no randomness. Every value that can change year to year is
// read from src/config/* — never hard-coded here (SRS G17-G19).
// Rounding is display-only, except where a function documents that a
// rounded value feeds a later total (EMI schedule, SRS §4.3).

import { TAX_SLABS, TAX_SLAB_LOWER_BOUNDS } from '../config/tax';
import { NISAB_GOLD_GRAMS, NISAB_SILVER_GRAMS, TOLA_GRAMS, ZAKAT_RATE } from '../config/zakat';
import { AREA_UNITS, type AreaUnit } from '../config/units';
import {
  ELECTRICITY_GST_RATE,
  LIFELINE_MINIMUM_CHARGE,
  LIFELINE_SLABS,
  PROTECTED_SLABS,
  UNPROTECTED_SLABS,
} from '../config/electricity';
import {
  GAS_DEFAULT_GCV,
  GAS_DEFAULT_PCF,
  GAS_FIXED_CHARGE_BOUNDARY_HM3,
  GAS_GST_RATE,
  GAS_METER_RENT,
  GAS_NON_PROTECTED_FIXED_CHARGE_HIGH,
  GAS_NON_PROTECTED_FIXED_CHARGE_LOW,
  GAS_PROTECTED_FIXED_CHARGE,
  MMBTU_DIVISOR,
  NON_PROTECTED_GAS_SLABS,
  PROTECTED_GAS_SLABS,
  ROUNDED_MMBTU_PER_HM3,
} from '../config/gas';
import {
  NON_PSEB_EXPORT_RATE,
  NON_SALARIED_SLAB_LOWER_BOUNDS,
  NON_SALARIED_SLABS,
  PSEB_EXPORT_RATE,
  SURCHARGE_RATE,
  SURCHARGE_THRESHOLD,
} from '../config/freelancer-tax';
import {
  DAYS_PER_MONTH,
  SOLAR_CITY_YIELDS,
  SOLAR_DEGRADATION_PER_YEAR,
  SOLAR_DEFAULT_COST_PER_KW,
  SOLAR_DEFAULT_EXPORT_RATE,
  SOLAR_DEFAULT_IMPORT_RATE,
  SOLAR_DEFAULT_SELF_USE_PCT,
  SOLAR_DEFAULT_YIELD,
  SOLAR_ROOF_SQFT_PER_KW,
  SOLAR_SYSTEM_LIFE_YEARS,
} from '../config/solar';

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

// ------------------------------------------- Electricity bill (NEPRA) --
export type ElectricityCategory = 'lifeline' | 'protected' | 'unprotected';

export interface ElectricitySlabRow {
  label: string;
  units: number;
  ratePerUnit: number;
  amount: number;
}

export interface ElectricityBillResult {
  units: number;
  category: ElectricityCategory;
  slabRows: ElectricitySlabRow[];
  energyCharge: number;
  fixedRatePerKw: number;
  fixedCharge: number;
  fpaPerUnit: number;
  fpaAmount: number;
  subtotal: number;
  gst: number;
  total: number;
  /** True when the lifeline minimum monthly charge (Rs 75) was applied
   *  because the energy charge came to less than that. */
  minimumChargeApplied: boolean;
}

export const ELECTRICITY_MAX_UNITS = 100000;
export const ELECTRICITY_MAX_LOAD_KW = 5;
export const ELECTRICITY_MAX_FPA = 10;

/**
 * Monthly domestic electricity bill estimate on NEPRA's uniform tariff
 * A-1 (S.R.O. 279(I)/2026), from src/config/electricity.ts.
 *
 * Slab rules, exactly as notified (see the config comments):
 * - Lifeline (up to 100 units): NO slab benefit — the rate of the band
 *   reached (Rs 3.95 up to 50 units, Rs 7.74 for 51-100) applies to
 *   every unit. No fixed charge; the Rs 75 single-phase minimum
 *   monthly charge applies when the energy charge is lower.
 * - Protected (up to 200 units): one-previous-slab benefit — the first
 *   100 units at Rs 10.54, only the excess at Rs 13.01. Fixed charge
 *   per kW follows the band reached (Rs 200 up to 100 units, Rs 300
 *   for 101-200).
 * - Unprotected: NO slab benefit — the rate of the band reached
 *   applies to every unit. Fixed charge per kW follows the band.
 * Sanctioned load above 5 kW is billed on Time of Use rates, which
 * this calculator does not cover, so it is rejected with an error.
 * GST is 18% of energy + fixed + FPA. Quarterly tariff adjustment,
 * electricity duty, TV fee and other surcharges are NOT included and
 * the page says so — the result is an estimate, not the final bill.
 */
export function calcElectricityBill(
  units: number,
  category: ElectricityCategory,
  sanctionedLoadKw: number,
  fpaPerUnit = 0,
): ElectricityBillResult {
  if (!isFiniteNumber(units) || units <= 0 || units > ELECTRICITY_MAX_UNITS) {
    throw new Error(`Monthly units must be between 1 and ${ELECTRICITY_MAX_UNITS}.`);
  }
  if (category !== 'lifeline' && category !== 'protected' && category !== 'unprotected') {
    throw new Error('Choose a consumer category: lifeline, protected, or unprotected.');
  }
  if (!isFiniteNumber(sanctionedLoadKw) || sanctionedLoadKw <= 0 || sanctionedLoadKw > ELECTRICITY_MAX_LOAD_KW) {
    if (isFiniteNumber(sanctionedLoadKw) && sanctionedLoadKw > ELECTRICITY_MAX_LOAD_KW) {
      throw new Error('Sanctioned load of 5 kW or more is billed on Time of Use rates (peak Rs 46.85, off-peak Rs 34.53 per unit), which this calculator does not cover. This calculator is for sanctioned loads up to 5 kW.');
    }
    throw new Error('Sanctioned load must be a positive number of kilowatts, up to 5 kW.');
  }
  if (!isFiniteNumber(fpaPerUnit) || fpaPerUnit < -ELECTRICITY_MAX_FPA || fpaPerUnit > ELECTRICITY_MAX_FPA) {
    throw new Error(`Fuel price adjustment must be between -Rs ${ELECTRICITY_MAX_FPA} and Rs ${ELECTRICITY_MAX_FPA} per unit.`);
  }

  let slabRows: ElectricitySlabRow[] = [];
  let energyCharge: number;
  let fixedRatePerKw: number;
  let minimumChargeApplied = false;

  if (category === 'lifeline') {
    if (units > 100) {
      throw new Error('Lifeline tariff is only for up to 100 units a month. For more than 100 units, choose protected (up to 200 units) or unprotected.');
    }
    const slab = LIFELINE_SLABS.find((s) => s.upTo !== null && units <= s.upTo) ?? LIFELINE_SLABS[LIFELINE_SLABS.length - 1];
    const rawEnergy = round2(units * slab.ratePerUnit);
    energyCharge = rawEnergy;
    if (rawEnergy < LIFELINE_MINIMUM_CHARGE) {
      energyCharge = LIFELINE_MINIMUM_CHARGE;
      minimumChargeApplied = true;
    }
    slabRows = [{
      label: units <= 50 ? 'Up to 50 units (lifeline)' : '51–100 units (lifeline)',
      units,
      ratePerUnit: slab.ratePerUnit,
      amount: rawEnergy,
    }];
    fixedRatePerKw = 0;
  } else if (category === 'protected') {
    if (units > 200) {
      throw new Error('Protected tariff is only for up to 200 units a month. For more than 200 units, choose unprotected — crossing 200 units loses protected status.');
    }
    const firstUnits = Math.min(units, 100);
    const restUnits = units - firstUnits;
    slabRows = [{
      label: 'First 100 units',
      units: firstUnits,
      ratePerUnit: PROTECTED_SLABS[0].ratePerUnit,
      amount: round2(firstUnits * PROTECTED_SLABS[0].ratePerUnit),
    }];
    if (restUnits > 0) {
      slabRows.push({
        label: 'Units 101–200',
        units: restUnits,
        ratePerUnit: PROTECTED_SLABS[1].ratePerUnit,
        amount: round2(restUnits * PROTECTED_SLABS[1].ratePerUnit),
      });
    }
    energyCharge = round2(slabRows.reduce((sum, row) => sum + row.amount, 0));
    fixedRatePerKw = units <= 100 ? PROTECTED_SLABS[0].fixedPerKw : PROTECTED_SLABS[1].fixedPerKw;
  } else {
    const slabIndex = UNPROTECTED_SLABS.findIndex((s) => s.upTo === null || units <= s.upTo);
    const slab = UNPROTECTED_SLABS[slabIndex];
    const lower = slabIndex === 0 ? 1 : (UNPROTECTED_SLABS[slabIndex - 1].upTo ?? 0) + 1;
    const label = slab.upTo === null ? 'Above 700 units' : `${lower}–${slab.upTo} units`;
    energyCharge = round2(units * slab.ratePerUnit);
    slabRows = [{ label, units, ratePerUnit: slab.ratePerUnit, amount: energyCharge }];
    fixedRatePerKw = slab.fixedPerKw;
  }

  const fixedCharge = round2(fixedRatePerKw * sanctionedLoadKw);
  const fpaAmount = round2(fpaPerUnit * units);
  const subtotal = round2(energyCharge + fixedCharge + fpaAmount);
  const gst = round2(subtotal * ELECTRICITY_GST_RATE);
  return {
    units,
    category,
    slabRows,
    energyCharge,
    fixedRatePerKw,
    fixedCharge,
    fpaPerUnit,
    fpaAmount,
    subtotal,
    gst,
    total: round2(subtotal + gst),
    minimumChargeApplied,
  };
}

// ------------------------------------------------------------ Gas bill --
// (OGRA domestic gas sale price, notification 29 June 2025, effective
// 1 July 2025 — see src/config/gas.ts)
export type GasCategory = 'protected' | 'non-protected';

export interface GasSlabRow {
  label: string;
  /** Consumption in this slab, hm3. */
  hm3: number;
  /** Consumption in this slab, MMBTU. */
  mmbtu: number;
  ratePerMmbtu: number;
  amount: number;
}

export interface GasBillResult {
  hm3: number;
  mmbtu: number;
  category: GasCategory;
  gcv: number;
  pcf: number;
  mmbtuPerHm3: number;
  /** True when the rounded 3.5 factor was used instead of the exact
   *  GCV conversion (worked-example mode only). */
  usedRoundedFactor: boolean;
  slabRows: GasSlabRow[];
  gasCharge: number;
  fixedCharge: number;
  meterRent: number;
  subtotal: number;
  gst: number;
  total: number;
}

export interface ProtectedStatusResult {
  averageHm3: number;
  protected: boolean;
}

export const GAS_MAX_HM3 = 100;
export const GAS_GCV_MIN = 500;
export const GAS_GCV_MAX = 1500;
export const GAS_PCF_MIN = 0.5;
export const GAS_PCF_MAX = 2.0;
/** Protected status: average winter (Nov-Feb) consumption at or below
 *  this many hm3 per month. */
export const GAS_PROTECTED_LIMIT_HM3 = 0.9;

/** MMBTU in one hm3 at the given GCV and PCF. With the rounded factor
 *  the answer is exactly 3.5 (the labelled estimate used by the worked
 *  examples); otherwise it is GCV / 281.7385 x PCF (3.5139 at GCV 990,
 *  PCF 1.00). */
export function mmbtuPerHm3(gcv: number, pcf: number, useRoundedFactor = false): number {
  if (useRoundedFactor) return ROUNDED_MMBTU_PER_HM3;
  return (gcv / MMBTU_DIVISOR) * pcf;
}

/** The meter reads in cubic metres; 1 hm3 = 100 m3. */
export function cubicMetresToHm3(m3: number): number {
  if (!isFiniteNumber(m3) || m3 <= 0 || m3 > GAS_MAX_HM3 * 100) {
    throw new Error(`Consumption must be between 1 and ${GAS_MAX_HM3 * 100} cubic metres.`);
  }
  return m3 / 100;
}

/**
 * Protected or not, from the last four winter months (Nov-Feb).
 * Average of 0.9 hm3/month or less = protected; above that =
 * non-protected (OGRA rule). Each month's usage is in hm3.
 */
export function checkProtectedStatus(nov: number, dec: number, jan: number, feb: number): ProtectedStatusResult {
  const months = [nov, dec, jan, feb];
  if (months.some((v) => !isFiniteNumber(v) || v < 0 || v > GAS_MAX_HM3)) {
    throw new Error(`Each winter month's usage must be between 0 and ${GAS_MAX_HM3} hm3.`);
  }
  const averageHm3 = round2(months.reduce((sum, v) => sum + v, 0) / 4);
  return { averageHm3, protected: averageHm3 <= GAS_PROTECTED_LIMIT_HM3 };
}

/**
 * Monthly domestic gas bill estimate on OGRA's sale price (notification
 * 29 June 2025, effective 1 July 2025), from src/config/gas.ts.
 *
 * Slab rules, exactly as verified (see the config comments):
 * - One preceding slab benefit: consumption up to the previous slab's
 *   boundary bills at the previous slab's rate; only the excess bills
 *   at the landed slab's rate. The first slab has no previous slab, so
 *   it bills entirely at its own rate.
 * - Above 4 hm3 (non-protected): NO benefit — the entire consumption
 *   bills at Rs 4,200/MMBTU.
 * - Protected slabs end at 0.90 hm3. A protected consumer using more
 *   than that in a month is outside the protected table and must use
 *   the non-protected category.
 * - Fixed charge: protected Rs 600/month; non-protected Rs 1,500 up to
 *   1.5 hm3, Rs 3,000 above 1.5 hm3. Meter rent Rs 40/month.
 * - GST is 18% of gas charge + fixed charge + meter rent. WHT, TV fee
 *   and GIDC are NOT included, and no rupee minimum-bill figure is
 *   applied (the official minimum-bill rule has no verified amount).
 * Conversion: MMBTU = hm3 x GCV / 281.7385 x PCF (GCV default 990,
 * PCF default 1.00). Pass useRoundedFactor to use the rounded 3.5
 * MMBTU per hm3 instead — the worked-example mode, labelled as an
 * estimate on the page.
 */
export function calcGasBill(
  consumptionHm3: number,
  category: GasCategory,
  options: { gcv?: number; pcf?: number; useRoundedFactor?: boolean } = {},
): GasBillResult {
  if (!isFiniteNumber(consumptionHm3) || consumptionHm3 <= 0 || consumptionHm3 > GAS_MAX_HM3) {
    throw new Error(`Monthly consumption must be between 0 and ${GAS_MAX_HM3} hm3.`);
  }
  if (category !== 'protected' && category !== 'non-protected') {
    throw new Error('Choose a consumer category: protected or non-protected.');
  }
  const gcv = options.gcv ?? GAS_DEFAULT_GCV;
  const pcf = options.pcf ?? GAS_DEFAULT_PCF;
  if (!isFiniteNumber(gcv) || gcv < GAS_GCV_MIN || gcv > GAS_GCV_MAX) {
    throw new Error(`GCV must be between ${GAS_GCV_MIN} and ${GAS_GCV_MAX} BTU/SCF.`);
  }
  if (!isFiniteNumber(pcf) || pcf < GAS_PCF_MIN || pcf > GAS_PCF_MAX) {
    throw new Error(`PCF must be between ${GAS_PCF_MIN} and ${GAS_PCF_MAX}.`);
  }
  const usedRoundedFactor = options.useRoundedFactor ?? false;
  const factor = mmbtuPerHm3(gcv, pcf, usedRoundedFactor);

  const slabs = category === 'protected' ? PROTECTED_GAS_SLABS : NON_PROTECTED_GAS_SLABS;
  const landedIndex = slabs.findIndex((s) => s.upTo === null || consumptionHm3 <= s.upTo);
  if (landedIndex === -1) {
    // Only reachable for protected above 0.90 hm3 (the table ends there).
    throw new Error('Protected slabs only go up to 0.90 hm3 a month. If you used more than that, choose non-protected — the protected table has no rate above 0.90 hm3.');
  }
  const landed = slabs[landedIndex];

  let slabRows: GasSlabRow[] = [];
  if (landed.upTo === null) {
    // Above 4 hm3: no preceding-slab benefit — everything at Rs 4,200.
    // The MMBTU figure is kept at full precision here: rounding it to
    // 2 decimals first would move the charge by about a rupee (e.g.
    // worked example A would come to Rs 1,000.50 instead of Rs 1,001.46).
    // Rounding is display-only — the page formats MMBTU to 4 decimals.
    const mmbtu = consumptionHm3 * factor;
    slabRows = [{
      label: 'Above 4.00 hm3 (whole consumption)',
      hm3: consumptionHm3,
      mmbtu,
      ratePerMmbtu: landed.ratePerMmbtu,
      amount: round2(mmbtu * landed.ratePerMmbtu),
    }];
  } else if (landedIndex === 0) {
    const mmbtu = consumptionHm3 * factor;
    slabRows = [{
      label: `Up to ${landed.upTo.toFixed(2)} hm3`,
      hm3: consumptionHm3,
      mmbtu,
      ratePerMmbtu: landed.ratePerMmbtu,
      amount: round2(mmbtu * landed.ratePerMmbtu),
    }];
  } else {
    const prevBoundary = slabs[landedIndex - 1].upTo as number;
    const prevRate = slabs[landedIndex - 1].ratePerMmbtu;
    const firstHm3 = prevBoundary;
    const restHm3 = round2(consumptionHm3 - prevBoundary);
    const firstMmbtu = firstHm3 * factor;
    const restMmbtu = restHm3 * factor;
    slabRows = [
      {
        label: `First ${prevBoundary.toFixed(2)} hm3`,
        hm3: firstHm3,
        mmbtu: firstMmbtu,
        ratePerMmbtu: prevRate,
        amount: round2(firstMmbtu * prevRate),
      },
      {
        label: `Next ${restHm3.toFixed(2)} hm3`,
        hm3: restHm3,
        mmbtu: restMmbtu,
        ratePerMmbtu: landed.ratePerMmbtu,
        amount: round2(restMmbtu * landed.ratePerMmbtu),
      },
    ];
  }

  const gasCharge = round2(slabRows.reduce((sum, row) => sum + row.amount, 0));
  const fixedCharge = category === 'protected'
    ? GAS_PROTECTED_FIXED_CHARGE
    : consumptionHm3 <= GAS_FIXED_CHARGE_BOUNDARY_HM3
      ? GAS_NON_PROTECTED_FIXED_CHARGE_LOW
      : GAS_NON_PROTECTED_FIXED_CHARGE_HIGH;
  const meterRent = GAS_METER_RENT;
  const subtotal = round2(gasCharge + fixedCharge + meterRent);
  const gst = round2(subtotal * GAS_GST_RATE);
  return {
    hm3: consumptionHm3,
    mmbtu: round2(consumptionHm3 * factor),
    category,
    gcv,
    pcf,
    mmbtuPerHm3: Math.round(factor * 10000) / 10000,
    usedRoundedFactor,
    slabRows,
    gasCharge,
    fixedCharge,
    meterRent,
    subtotal,
    gst,
    total: round2(subtotal + gst),
  };
}

// --------------------------------------- Freelancer / non-salaried tax --
// Non-salaried slabs, clause (1), Division I, Part I, First Schedule,
// Income Tax Ordinance 2001 (Finance Act 2024 table, unchanged by
// Finance Act 2026), from src/config/freelancer-tax.ts. Scope:
// individual freelancers / sole proprietors ONLY. The AOP
// professional-firm 40% top-rate cap is OUT of scope and is NOT
// applied here.
//
// s.154A export tax is FINAL on gross export proceeds when the return
// is filed (s.169): export income is EXCLUDED from the slab
// calculation entirely — not added to local income, no expenses
// deductible against it. When the return is NOT filed, finality is
// lost: export income is taxed under the normal slabs, with the bank
// deduction credited against it. s.154A rates are NOT doubled for
// non-filers. Surcharge s.4AB: 10% of the tax where taxable income
// EXCEEDS Rs 10,000,000; at exactly Rs 10m, no surcharge.
export interface NonSalariedSlabRow {
  label: string;
  income: number;
  rate: number;
  amount: number;
}

export interface NonSalariedTaxResult {
  taxableIncome: number;
  /** Tax from the slabs, before surcharge. */
  tax: number;
  surcharge: number;
  total: number;
  effectiveRate: number;
  marginalRate: number;
  bracketIndex: number;
  slabRows: NonSalariedSlabRow[];
}

export function calcNonSalariedTax(localTaxableIncome: number): NonSalariedTaxResult {
  if (!isFiniteNumber(localTaxableIncome) || localTaxableIncome < 0 || localTaxableIncome > MAX_AMOUNT) {
    throw new Error('Taxable income must be zero or more.');
  }
  if (localTaxableIncome === 0) {
    return {
      taxableIncome: 0,
      tax: 0,
      surcharge: 0,
      total: 0,
      effectiveRate: 0,
      marginalRate: 0,
      bracketIndex: 0,
      slabRows: [],
    };
  }
  let bracketIndex = 0;
  for (let i = 0; i < NON_SALARIED_SLABS.length; i++) {
    const slab = NON_SALARIED_SLABS[i];
    if (slab.upTo === null || localTaxableIncome <= slab.upTo) {
      bracketIndex = i;
      break;
    }
  }
  const slab = NON_SALARIED_SLABS[bracketIndex];
  const lower = NON_SALARIED_SLAB_LOWER_BOUNDS[bracketIndex];
  const tax = round2(slab.baseTax + slab.rate * (localTaxableIncome - lower));
  const surcharge = localTaxableIncome > SURCHARGE_THRESHOLD ? round2(tax * SURCHARGE_RATE) : 0;
  const slabRows: NonSalariedSlabRow[] = [];
  for (let i = 0; i <= bracketIndex; i++) {
    const s = NON_SALARIED_SLABS[i];
    const bandLower = NON_SALARIED_SLAB_LOWER_BOUNDS[i];
    const bandUpper = s.upTo === null ? localTaxableIncome : Math.min(localTaxableIncome, s.upTo);
    const bandIncome = bandUpper - bandLower;
    if (bandIncome <= 0) continue;
    const label = s.upTo === null
      ? `Above Rs ${formatNumber(5600000, 0)}`
      : bandLower === 0
        ? `Up to Rs ${formatNumber(s.upTo, 0)}`
        : `Rs ${formatNumber(bandLower + 1, 0)} – Rs ${formatNumber(s.upTo, 0)}`;
    slabRows.push({
      label,
      income: bandIncome,
      rate: s.rate,
      amount: round2(s.rate * bandIncome),
    });
  }
  return {
    taxableIncome: localTaxableIncome,
    tax,
    surcharge,
    total: round2(tax + surcharge),
    effectiveRate: Number(((tax / localTaxableIncome) * 100).toFixed(6)),
    marginalRate: Number((slab.rate * 100).toFixed(6)),
    bracketIndex,
    slabRows,
  };
}

export interface ExportTaxResult {
  exportIncome: number;
  psebRegistered: boolean;
  rate: number;
  tax: number;
}

export function calcExportTax(exportIncome: number, psebRegistered: boolean): ExportTaxResult {
  if (!isFiniteNumber(exportIncome) || exportIncome < 0 || exportIncome > MAX_AMOUNT) {
    throw new Error('Export income must be zero or more.');
  }
  const rate = psebRegistered ? PSEB_EXPORT_RATE : NON_PSEB_EXPORT_RATE;
  return {
    exportIncome,
    psebRegistered,
    rate,
    tax: round2(exportIncome * rate),
  };
}

export interface FreelancerTaxInput {
  exportIncome: number;
  psebRegistered: boolean;
  localTaxableIncome: number;
  returnFiled: boolean;
}

export interface FreelancerTaxResult {
  exportIncome: number;
  psebRegistered: boolean;
  exportRate: number;
  /** Bank deduction already taken on export proceeds (0.25%/1%). */
  exportDeduction: number;
  localTaxableIncome: number;
  returnFiled: boolean;
  /** Slab tax on the income the slabs apply to (local only when the
   *  return is filed; export + local combined when it is not). */
  slabTax: number;
  surcharge: number;
  /** Tax still payable after crediting the export deduction (only
   *  reduced when the return was not filed). */
  totalPayable: number;
  /** True when the return was not filed and finality was lost. */
  finalityLost: boolean;
  slabRows: NonSalariedSlabRow[];
  /** Income the slabs were applied to. */
  slabIncome: number;
}

export function calcFreelancerTax(input: FreelancerTaxInput): FreelancerTaxResult {
  const exportTax = calcExportTax(input.exportIncome, input.psebRegistered);
  if (!isFiniteNumber(input.localTaxableIncome) || input.localTaxableIncome < 0 || input.localTaxableIncome > MAX_AMOUNT) {
    throw new Error('Local taxable income must be zero or more.');
  }
  if (input.returnFiled) {
    // Final tax: export income is excluded from the slabs entirely.
    const local = calcNonSalariedTax(input.localTaxableIncome);
    return {
      exportIncome: input.exportIncome,
      psebRegistered: input.psebRegistered,
      exportRate: exportTax.rate,
      exportDeduction: exportTax.tax,
      localTaxableIncome: input.localTaxableIncome,
      returnFiled: true,
      slabTax: local.tax,
      surcharge: local.surcharge,
      totalPayable: round2(exportTax.tax + local.total),
      finalityLost: false,
      slabRows: local.slabRows,
      slabIncome: input.localTaxableIncome,
    };
  }
  // Return not filed: finality lost — slabs on export + local combined,
  // less the bank deduction already taken on the export proceeds.
  const combined = calcNonSalariedTax(input.exportIncome + input.localTaxableIncome);
  return {
    exportIncome: input.exportIncome,
    psebRegistered: input.psebRegistered,
    exportRate: exportTax.rate,
    exportDeduction: exportTax.tax,
    localTaxableIncome: input.localTaxableIncome,
    returnFiled: false,
    slabTax: combined.tax,
    surcharge: combined.surcharge,
    totalPayable: round2(Math.max(0, combined.total - exportTax.tax)),
    finalityLost: true,
    slabRows: combined.slabRows,
    slabIncome: input.exportIncome + input.localTaxableIncome,
  };
}

// --- Solar size & payback (NEPRA Prosumer Regulations 2026, SRO 251(I)/2026) ---

export const SOLAR_MAX_SYSTEM_KW = 100;
export const SOLAR_MIN_SYSTEM_KW = 0.5;
export const SOLAR_MAX_MONTHLY_UNITS = 100000;
export const SOLAR_MAX_COST_PER_KW = 500000;
export const SOLAR_MAX_EXPORT_RATE = 100;
export const SOLAR_MAX_IMPORT_RATE = 200;
export const SOLAR_MAX_INVERTER_COST = 10000000;

/** Yield (kWh/kW/day) for a city, or the fallback 4.0 for other cities. */
export function solarYieldForCity(city: string): number {
  const found = SOLAR_CITY_YIELDS.find((c) => c.city.toLowerCase() === city.trim().toLowerCase());
  return found ? found.yieldPerKwPerDay : SOLAR_DEFAULT_YIELD;
}

/** Monthly generation (units/kWh) of a system: kW x daily yield x 365/12. */
export function calcMonthlyGeneration(systemKw: number, yieldPerKwPerDay: number): number {
  if (!isFiniteNumber(systemKw) || systemKw <= 0 || systemKw > SOLAR_MAX_SYSTEM_KW) {
    throw new Error(`System size must be between ${SOLAR_MIN_SYSTEM_KW} and ${SOLAR_MAX_SYSTEM_KW} kW.`);
  }
  if (!isFiniteNumber(yieldPerKwPerDay) || yieldPerKwPerDay <= 0 || yieldPerKwPerDay > 10) {
    throw new Error('Yield must be between 0 and 10 kWh per kW per day.');
  }
  return round2(systemKw * yieldPerKwPerDay * DAYS_PER_MONTH);
}

/** System size (kW) needed to cover a monthly usage, rounded UP to the
 *  nearest 0.5 kW so the system is not undersized. Minimum 1 kW. */
export function recommendedSystemKw(monthlyUnits: number, yieldPerKwPerDay: number): number {
  if (!isFiniteNumber(monthlyUnits) || monthlyUnits <= 0 || monthlyUnits > SOLAR_MAX_MONTHLY_UNITS) {
    throw new Error(`Monthly units must be between 1 and ${SOLAR_MAX_MONTHLY_UNITS}.`);
  }
  if (!isFiniteNumber(yieldPerKwPerDay) || yieldPerKwPerDay <= 0 || yieldPerKwPerDay > 10) {
    throw new Error('Yield must be between 0 and 10 kWh per kW per day.');
  }
  const raw = monthlyUnits / (yieldPerKwPerDay * DAYS_PER_MONTH);
  return Math.max(1, Math.ceil(raw * 2) / 2);
}

/** Monthly units implied by a monthly bill at a flat per-unit rate. */
export function unitsFromBill(monthlyBill: number, flatRatePerUnit = SOLAR_DEFAULT_IMPORT_RATE): number {
  if (!isFiniteNumber(monthlyBill) || monthlyBill <= 0 || monthlyBill > MAX_AMOUNT) {
    throw new Error('Monthly bill must be a positive amount.');
  }
  if (!isFiniteNumber(flatRatePerUnit) || flatRatePerUnit <= 0 || flatRatePerUnit > SOLAR_MAX_IMPORT_RATE) {
    throw new Error(`Flat rate must be between Rs 1 and Rs ${SOLAR_MAX_IMPORT_RATE} per unit.`);
  }
  return round2(monthlyBill / flatRatePerUnit);
}

/** Base (energy-only) unprotected slab rate, Rs/unit, for a monthly
 *  usage under SRO 279(I)/2026 — shown alongside the effective import
 *  rate so the user can see what the Rs 48 default adds (FCA, quarterly
 *  adjustment, GST). */
export function solarSlabBaseRate(monthlyUnits: number): number {
  if (!isFiniteNumber(monthlyUnits) || monthlyUnits <= 0 || monthlyUnits > SOLAR_MAX_MONTHLY_UNITS) {
    throw new Error(`Monthly units must be between 1 and ${SOLAR_MAX_MONTHLY_UNITS}.`);
  }
  for (const slab of UNPROTECTED_SLABS) {
    if (slab.upTo === null || monthlyUnits <= slab.upTo) return slab.ratePerUnit;
  }
  return UNPROTECTED_SLABS[UNPROTECTED_SLABS.length - 1].ratePerUnit;
}

/** Rough roof area needed, sq ft — planning rule of thumb only
 *  (about 100 sq ft per kW, varies by panel and layout). */
export function solarRoofAreaSqft(systemKw: number): number {
  if (!isFiniteNumber(systemKw) || systemKw <= 0 || systemKw > SOLAR_MAX_SYSTEM_KW) {
    throw new Error(`System size must be between ${SOLAR_MIN_SYSTEM_KW} and ${SOLAR_MAX_SYSTEM_KW} kW.`);
  }
  return round2(systemKw * SOLAR_ROOF_SQFT_PER_KW);
}

export interface SolarPaybackInput {
  systemKw: number;
  /** Monthly generation, units. */
  monthlyGeneration: number;
  /** System cost, Rs (usually systemKw x cost per kW). */
  systemCost: number;
  /** Effective import rate, Rs/unit (default Rs 48 flat fallback). */
  importRatePerUnit?: number;
  /** Export (NAEPP) rate, Rs/unit (default Rs 10 planning figure). */
  exportRatePerUnit?: number;
  /** Share of generation used at home, percent 0-100 (default 60). */
  selfUsePct?: number;
  /** Pre-9-Feb-2026 agreement: export credited at the import rate (1:1). */
  legacyAgreement?: boolean;
  /** Optional inverter-replacement cost, Rs — default 0 (excluded). */
  inverterReplacementCost?: number;
}

export interface SolarPaybackResult {
  systemKw: number;
  monthlyGeneration: number;
  systemCost: number;
  importRatePerUnit: number;
  exportRatePerUnit: number;
  selfUsePct: number;
  legacyAgreement: boolean;
  inverterReplacementCost: number;
  selfUsedUnits: number;
  exportedUnits: number;
  selfUseSaving: number;
  exportCredit: number;
  /** Monthly saving, Rs. */
  monthlySaving: number;
  /** Simple payback, months (system cost / monthly saving). */
  paybackMonths: number;
  /** Simple payback, years. */
  paybackYears: number;
  /** Payback in months at 50% self-use. */
  paybackMonthsAt50Pct: number;
  /** Payback in months at 70% self-use. */
  paybackMonthsAt70Pct: number;
  /** Gross 25-year saving with 0.5%/yr degradation, Rs. */
  lifetimeGrossSaving: number;
  /** Lifetime saving less system cost and inverter replacement, Rs. */
  lifetimeNetSaving: number;
}

/** Monthly saving at a given self-use share: self-used units are
 *  worth the import rate, exported units the export rate. */
export function solarMonthlySaving(
  monthlyGeneration: number,
  selfUsePct: number,
  importRatePerUnit: number,
  exportRatePerUnit: number,
): number {
  const selfUsed = (monthlyGeneration * selfUsePct) / 100;
  const exported = monthlyGeneration - selfUsed;
  return round2(selfUsed * importRatePerUnit + exported * exportRatePerUnit);
}

/**
 * Simple payback for a solar system under NEPRA net billing 2026.
 * Self-used units save the import rate; exported units earn the
 * NAEPP export rate (default Rs 10 — a planning figure, NOT a
 * notified rate; the SRO prints no rupee figure). With a legacy
 * pre-9-Feb-2026 agreement, export is credited at the import rate
 * (old 1:1 treatment). Lifetime saving sums 25 years of monthly
 * saving with 0.5% degradation a year (year 1 at full output).
 * This is a SIMPLE payback: it ignores inflation, tariff rises,
 * financing cost and the time value of money, and the page says so.
 */
export function calcSolarPayback(input: SolarPaybackInput): SolarPaybackResult {
  const { systemKw, monthlyGeneration, systemCost } = input;
  if (!isFiniteNumber(systemKw) || systemKw < SOLAR_MIN_SYSTEM_KW || systemKw > SOLAR_MAX_SYSTEM_KW) {
    throw new Error(`System size must be between ${SOLAR_MIN_SYSTEM_KW} and ${SOLAR_MAX_SYSTEM_KW} kW.`);
  }
  if (!isFiniteNumber(monthlyGeneration) || monthlyGeneration <= 0 || monthlyGeneration > SOLAR_MAX_MONTHLY_UNITS) {
    throw new Error(`Monthly generation must be between 1 and ${SOLAR_MAX_MONTHLY_UNITS} units.`);
  }
  if (!isFiniteNumber(systemCost) || systemCost <= 0 || systemCost > MAX_AMOUNT) {
    throw new Error('System cost must be a positive amount.');
  }
  const importRate = input.importRatePerUnit ?? SOLAR_DEFAULT_IMPORT_RATE;
  if (!isFiniteNumber(importRate) || importRate <= 0 || importRate > SOLAR_MAX_IMPORT_RATE) {
    throw new Error(`Import rate must be between Rs 1 and Rs ${SOLAR_MAX_IMPORT_RATE} per unit.`);
  }
  const exportRateRaw = input.exportRatePerUnit ?? SOLAR_DEFAULT_EXPORT_RATE;
  if (!isFiniteNumber(exportRateRaw) || exportRateRaw < 0 || exportRateRaw > SOLAR_MAX_EXPORT_RATE) {
    throw new Error(`Export rate must be between Rs 0 and Rs ${SOLAR_MAX_EXPORT_RATE} per unit.`);
  }
  const selfUsePct = input.selfUsePct ?? SOLAR_DEFAULT_SELF_USE_PCT;
  if (!isFiniteNumber(selfUsePct) || selfUsePct < 0 || selfUsePct > 100) {
    throw new Error('Self-use must be between 0% and 100%.');
  }
  const inverterCost = input.inverterReplacementCost ?? 0;
  if (!isFiniteNumber(inverterCost) || inverterCost < 0 || inverterCost > SOLAR_MAX_INVERTER_COST) {
    throw new Error('Inverter replacement cost must be zero or more.');
  }
  const legacy = input.legacyAgreement === true;
  const exportRate = legacy ? importRate : exportRateRaw;
  const selfUsedUnits = round2((monthlyGeneration * selfUsePct) / 100);
  const exportedUnits = round2(monthlyGeneration - selfUsedUnits);
  const selfUseSaving = round2(selfUsedUnits * importRate);
  const exportCredit = round2(exportedUnits * exportRate);
  const monthlySaving = round2(selfUseSaving + exportCredit);
  if (monthlySaving <= 0) {
    throw new Error('Monthly saving is zero — check the import and export rates.');
  }
  const paybackMonths = round2(systemCost / monthlySaving);
  const savingAt50 = solarMonthlySaving(monthlyGeneration, 50, importRate, exportRate);
  const savingAt70 = solarMonthlySaving(monthlyGeneration, 70, importRate, exportRate);
  // Lifetime: year t output factor (1 - 0.005)^(t-1), t = 1..25.
  const degradationFactor = (1 - Math.pow(1 - SOLAR_DEGRADATION_PER_YEAR, SOLAR_SYSTEM_LIFE_YEARS)) / SOLAR_DEGRADATION_PER_YEAR;
  const lifetimeGrossSaving = round2(monthlySaving * 12 * degradationFactor);
  const lifetimeNetSaving = round2(lifetimeGrossSaving - systemCost - inverterCost);
  return {
    systemKw,
    monthlyGeneration,
    systemCost,
    importRatePerUnit: importRate,
    exportRatePerUnit: exportRate,
    selfUsePct,
    legacyAgreement: legacy,
    inverterReplacementCost: inverterCost,
    selfUsedUnits,
    exportedUnits,
    selfUseSaving,
    exportCredit,
    monthlySaving,
    paybackMonths,
    paybackYears: round2(paybackMonths / 12),
    paybackMonthsAt50Pct: round2(systemCost / savingAt50),
    paybackMonthsAt70Pct: round2(systemCost / savingAt70),
    lifetimeGrossSaving,
    lifetimeNetSaving,
  };
}
