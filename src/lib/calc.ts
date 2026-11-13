// Pure calculation functions for all 24 tools. No DOM, no network, no
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
import {
  EOBI_EMPLOYEE_RATE,
  EOBI_EMPLOYER_RATE,
  EOBI_FORMULA_DIVISOR,
  EOBI_GRANT_MIN_YEARS,
  EOBI_INVALIDITY_MIN_YEARS_IN_LAST_FIVE,
  EOBI_INVALIDITY_MIN_YEARS_SINCE_ENTRY,
  EOBI_MIN_SERVICE_YEARS,
  EOBI_MINIMUM_PENSION,
  EOBI_REDUCTION_PER_MONTH,
  EOBI_SURVIVOR_MIN_YEARS_IN_SERVICE,
  EOBI_SURVIVOR_MIN_YEARS_OUT_OF_SERVICE,
  PENSION_WAGE_PRESETS,
} from '../config/pension';
import {
  DSC_ENCASHMENT_TABLE_PCT,
  DSC_TENURE_YEARS,
  NATIONAL_SAVINGS_SCHEMES,
  NSS_WHT_FILER_RATE,
  NSS_WHT_NON_FILER_RATE,
  SSC_HALF_YEAR_RATES_PCT,
  SSC_TENURE_HALF_YEARS,
  type NationalSavingsScheme,
  type NationalSavingsSchemeId,
} from '../config/national-savings';
import { GST_FURTHER_TAX_RATE } from '../config/gst';
import {
  APNA_GHAR_MAX_FINANCING,
  APNA_GHAR_MAX_TENURE_YEARS,
  APNA_GHAR_MIN_EQUITY_PCT,
  APNA_GHAR_SUBSIDY_RATE_PCT,
  APNA_GHAR_SUBSIDY_YEARS,
  HOME_LOAN_EQUITY_PCT_MAX_COMMERCIAL,
  HOME_LOAN_EQUITY_PCT_MIN_COMMERCIAL,
  HOME_LOAN_TENURE_MAX_YEARS_COMMERCIAL,
  HOME_LOAN_TENURE_MIN_YEARS,
} from '../config/home-loan';
import {
  CAR_LOAN_AGGREGATE_CAP,
  CAR_LOAN_DOWN_PCT_MAX,
  CAR_LOAN_DOWN_PCT_MIN,
  CAR_LOAN_MAX_TENURE_YEARS_ABOVE_1000CC,
  CAR_LOAN_MAX_TENURE_YEARS_UPTO_1000CC,
  CAR_LOAN_MIN_TENURE_YEARS,
} from '../config/car-loan';

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

// -------------------------------------------------------- Silver ------
// Silver uses the same tola as gold: 1 tola = TOLA_GRAMS grams. The live
// silver rate comes from the same metals source as gold
// (functions/api/metals.ts, goldprice.dev) — per gram in PKR, converted
// here to per tola. No karat system applies to silver: it is quoted as
// fine silver, so there is no purity adjustment like gold's karat ÷ 24.
export function calcSilverPerTola(silverPerGram: number): number {
  if (!isFiniteNumber(silverPerGram) || silverPerGram <= 0)
    throw new Error('Silver price per gram must be a positive number.');
  return silverPerGram * TOLA_GRAMS;
}

export function calcSilverPerGram(silverPerTola: number): number {
  if (!isFiniteNumber(silverPerTola) || silverPerTola <= 0)
    throw new Error('Silver price per tola must be a positive number.');
  return silverPerTola / TOLA_GRAMS;
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

export interface ElectricityTariffTableRow {
  /** Row label as shown on the page, e.g. "1–100 (protected)". */
  label: string;
  /** Variable (energy) charge, Rs per unit, from the config slab. */
  ratePerUnit: number;
  /** Fixed charge, Rs per kW of sanctioned load per month (0 = none). */
  fixedPerKw: number;
}

/**
 * The NEPRA domestic tariff table exactly as it appears on the
 * Electricity Bill page — built from LIFELINE_SLABS, PROTECTED_SLABS
 * and UNPROTECTED_SLABS in src/config/electricity.ts, never from
 * hard-coded page markup. Labels follow the page's long-standing
 * wording: the first lifeline band is "Up to 50 (lifeline)", bands up
 * to 200 units carry their category in brackets, higher unprotected
 * bands are bare ranges ("201–300"), and the open-ended band is
 * "Above 700". Changing a tariff = editing the config only; the page
 * table and this helper follow automatically (SRS G17-G19).
 */
export function electricityTariffTableRows(): ElectricityTariffTableRow[] {
  const rows: ElectricityTariffTableRow[] = [];
  const addGroup = (
    slabs: { upTo: number | null; ratePerUnit: number; fixedPerKw: number }[],
    category: 'lifeline' | 'protected' | 'unprotected',
  ): void => {
    let prevUpTo = 0;
    slabs.forEach((slab, index) => {
      let label: string;
      if (slab.upTo === null) {
        label = `Above ${prevUpTo}`;
      } else if (category === 'lifeline' && index === 0) {
        label = `Up to ${slab.upTo} (lifeline)`;
      } else {
        const start = prevUpTo === 0 ? 1 : prevUpTo + 1;
        const suffix =
          category === 'lifeline' || category === 'protected' || slab.upTo <= 200
            ? ` (${category})`
            : '';
        label = `${start}–${slab.upTo}${suffix}`;
      }
      rows.push({ label, ratePerUnit: slab.ratePerUnit, fixedPerKw: slab.fixedPerKw });
      if (slab.upTo !== null) prevUpTo = slab.upTo;
    });
  };
  addGroup(LIFELINE_SLABS, 'lifeline');
  addGroup(PROTECTED_SLABS, 'protected');
  addGroup(UNPROTECTED_SLABS, 'unprotected');
  return rows;
}

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

// ---------------------------------------------------------------------------
// Pension / EOBI (Employees' Old-Age Benefits Act, 1976)
// ---------------------------------------------------------------------------

export const PENSION_MAX_WAGE = 1000000;
export const PENSION_MAX_SERVICE_YEARS = 60;
export const PENSION_MAX_MONTHS_SHORT = 60;
export const PENSION_MAX_PENSIONER_PENSION = 1000000;

function validatePensionWage(wage: number): void {
  if (!isFiniteNumber(wage) || wage <= 0 || wage > PENSION_MAX_WAGE) {
    throw new Error(`Contribution wage must be between Rs 1 and Rs ${PENSION_MAX_WAGE.toLocaleString('en-PK')} a month.`);
  }
}

function validateServiceYears(serviceYears: number): void {
  if (!isFiniteNumber(serviceYears) || serviceYears < 0 || serviceYears > PENSION_MAX_SERVICE_YEARS) {
    throw new Error(`Years of service must be between 0 and ${PENSION_MAX_SERVICE_YEARS}.`);
  }
}

/**
 * Credited years of insurable employment. Schedule para (1): a period
 * of six months or more counts as one full year — so 14.5 years counts
 * as 15 (the same point the FCC rounding-off ruling made, Dec 2025 /
 * Jan 2026). 14.4 counts as 14; 14.6 counts as 15.
 */
export function pensionCreditedYears(serviceYears: number): number {
  validateServiceYears(serviceYears);
  const whole = Math.floor(serviceYears);
  return whole + (serviceYears - whole >= 0.5 ? 1 : 0);
}

/** Contribution wage for a preset label, or the ICT default for
 *  anything unrecognised (the page always passes a known label). */
export function pensionWageForPreset(label: string): number {
  const found = PENSION_WAGE_PRESETS.find((p) => p.label.toLowerCase() === label.trim().toLowerCase());
  return found ? found.wage : PENSION_WAGE_PRESETS[0].wage;
}

export interface EobiContributionResult {
  wage: number;
  employerMonthly: number;
  employeeMonthly: number;
  totalMonthly: number;
  employerAnnual: number;
  employeeAnnual: number;
  totalAnnual: number;
}

/** Monthly EOBI contributions on the contribution wage: employer 5%
 *  (s.9) + employee 1% (s.9B) = 6%. On Rs 40,700: Rs 2,035 + Rs 407
 *  = Rs 2,442 a month. */
export function calcEobiContributions(wage: number): EobiContributionResult {
  validatePensionWage(wage);
  const employerMonthly = round2(wage * EOBI_EMPLOYER_RATE);
  const employeeMonthly = round2(wage * EOBI_EMPLOYEE_RATE);
  return {
    wage,
    employerMonthly,
    employeeMonthly,
    totalMonthly: round2(employerMonthly + employeeMonthly),
    employerAnnual: round2(employerMonthly * 12),
    employeeAnnual: round2(employeeMonthly * 12),
    totalAnnual: round2((employerMonthly + employeeMonthly) * 12),
  };
}

export interface EobiPensionResult {
  wage: number;
  serviceYears: number;
  creditedYears: number;
  /** True when the 15-year minimum (s.22(1)(b)) is met. */
  entitled: boolean;
  /** Formula pension before the minimum floor, Rs/month. */
  formulaPension: number;
  /** Monthly pension payable, Rs/month (formula floored at Rs 11,500). */
  monthlyPension: number;
  /** True when the formula was below Rs 11,500 and the floor applied. */
  floorApplied: boolean;
  annualPension: number;
}

/**
 * Monthly old-age pension (Schedule: wage x credited years / 50,
 * i.e. 2% a year), floored at the notified minimum pension of
 * Rs 11,500/month. Entitlement needs 15 credited years (s.22(1)(b)).
 * There is NO fixed maximum ("As Per Formula" per EOBI) and no 1.15
 * multiplier on new awards — the 15% uplift of 2025 was for pensions
 * already in payment.
 */
export function calcEobiPension(wage: number, serviceYears: number): EobiPensionResult {
  validatePensionWage(wage);
  validateServiceYears(serviceYears);
  const creditedYears = pensionCreditedYears(serviceYears);
  const formulaPension = round2((wage * creditedYears) / EOBI_FORMULA_DIVISOR);
  const entitled = creditedYears >= EOBI_MIN_SERVICE_YEARS;
  const monthlyPension = entitled ? Math.max(formulaPension, EOBI_MINIMUM_PENSION) : 0;
  return {
    wage,
    serviceYears,
    creditedYears,
    entitled,
    formulaPension,
    monthlyPension,
    floorApplied: entitled && formulaPension < EOBI_MINIMUM_PENSION,
    annualPension: round2(monthlyPension * 12),
  };
}

export interface ReducedPensionResult extends EobiPensionResult {
  monthsShort: number;
  /** Reduction fraction applied (0.5% per completed month short). */
  reductionFraction: number;
  /** Monthly pension after the reduction, Rs/month. */
  reducedMonthlyPension: number;
  reducedAnnualPension: number;
}

/**
 * Reduced / early pension, s.22(2C)-(2E): retire at 55-60 (50-55
 * women) where the employer has a definite retirement age below
 * 60/55. The pension — and the minimum pension — is cut by 0.5%
 * for each completed month short of 60/55 (s.22(2D)), and the cut
 * is FOR LIFE, not restored at normal pension age (s.22(2E)).
 * Months short runs 1-60 (five years at most).
 */
export function calcReducedPension(wage: number, serviceYears: number, monthsShort: number): ReducedPensionResult {
  if (!isFiniteNumber(monthsShort) || monthsShort < 1 || monthsShort > PENSION_MAX_MONTHS_SHORT) {
    throw new Error(`Months short of pension age must be between 1 and ${PENSION_MAX_MONTHS_SHORT}.`);
  }
  const base = calcEobiPension(wage, serviceYears);
  const reductionFraction = round2(monthsShort * EOBI_REDUCTION_PER_MONTH);
  const reducedMonthlyPension = round2(base.monthlyPension * (1 - reductionFraction));
  return {
    ...base,
    monthsShort,
    reductionFraction,
    reducedMonthlyPension,
    reducedAnnualPension: round2(reducedMonthlyPension * 12),
  };
}

export interface OldAgeGrantResult {
  wage: number;
  serviceYears: number;
  creditedYears: number;
  /** True when service is 2 to under 15 credited years (s.22A). */
  entitled: boolean;
  /** One-off lump sum, Rs (one month's wage per credited year). */
  grant: number;
}

/**
 * Old-age grant (s.22A): at pension age with 2 to under 15 years'
 * service and no pension entitlement — a lump sum of one month's
 * average wage for every completed year (6+ months counts). E.g.
 * 8 years at Rs 40,700 = Rs 325,600 once.
 */
export function calcOldAgeGrant(wage: number, serviceYears: number): OldAgeGrantResult {
  validatePensionWage(wage);
  validateServiceYears(serviceYears);
  const creditedYears = pensionCreditedYears(serviceYears);
  const entitled = creditedYears >= EOBI_GRANT_MIN_YEARS && creditedYears < EOBI_MIN_SERVICE_YEARS;
  return {
    wage,
    serviceYears,
    creditedYears,
    entitled,
    grant: entitled ? round2(wage * creditedYears) : 0,
  };
}

export interface SurvivorPensionResult {
  wage: number;
  serviceYears: number;
  creditedYears: number;
  deceasedWasPensioner: boolean;
  /** True when the qualifying service is met (36 months in service,
   *  or 5 years out of service, or already a pensioner). */
  entitled: boolean;
  /** Formula pension before the minimum floor, Rs/month. */
  formulaPension: number;
  /** Monthly survivor's pension payable, Rs/month. */
  monthlyPension: number;
  /** True when the formula was below Rs 11,500 and the floor applied. */
  floorApplied: boolean;
  annualPension: number;
}

/**
 * Survivor's pension (s.22B), as the Act reads it — see the config
 * header for the discrepancy this follows. s.22B(1): death in
 * insurable employment after 36+ months — spouse gets a life pension
 * "at the rate specified in the Schedule". s.22B(1A): death out of
 * insurable employment after 5+ years — same. The Schedule para (1)
 * calculates the survivor's pension by the SAME formula as the
 * old-age pension (wage x years / 50), floored at the notified
 * minimum of Rs 11,500. s.22B(2): if the deceased was already a
 * pensioner, the spouse gets a life pension EQUAL TO the pensioner's
 * pension. EOBI's own published pension-rates summary describes the
 * survivor's pension as the minimum pension — the page says so and
 * tells the user to confirm the amount with EOBI.
 */
export function calcSurvivorPension(
  wage: number,
  serviceYears: number,
  deceasedWasPensioner: boolean,
  pensionerPension?: number,
  diedInService = true,
): SurvivorPensionResult {
  validatePensionWage(wage);
  validateServiceYears(serviceYears);
  const creditedYears = pensionCreditedYears(serviceYears);
  if (deceasedWasPensioner) {
    if (!isFiniteNumber(pensionerPension) || (pensionerPension as number) <= 0 || (pensionerPension as number) > PENSION_MAX_PENSIONER_PENSION) {
      throw new Error(`The pensioner's monthly pension must be between Rs 1 and Rs ${PENSION_MAX_PENSIONER_PENSION.toLocaleString('en-PK')}.`);
    }
    const monthly = round2(pensionerPension as number);
    return {
      wage,
      serviceYears,
      creditedYears,
      deceasedWasPensioner: true,
      entitled: true,
      formulaPension: monthly,
      monthlyPension: monthly,
      floorApplied: false,
      annualPension: round2(monthly * 12),
    };
  }
  const minYears = diedInService ? EOBI_SURVIVOR_MIN_YEARS_IN_SERVICE : EOBI_SURVIVOR_MIN_YEARS_OUT_OF_SERVICE;
  const entitled = serviceYears >= minYears;
  const formulaPension = round2((wage * creditedYears) / EOBI_FORMULA_DIVISOR);
  const monthlyPension = entitled ? Math.max(formulaPension, EOBI_MINIMUM_PENSION) : 0;
  return {
    wage,
    serviceYears,
    creditedYears,
    deceasedWasPensioner: false,
    entitled,
    formulaPension,
    monthlyPension,
    floorApplied: entitled && formulaPension < EOBI_MINIMUM_PENSION,
    annualPension: round2(monthlyPension * 12),
  };
}

export interface InvalidityPensionResult extends EobiPensionResult {
  yearsInLastFive: number;
}

/**
 * Invalidity pension (s.23): the same Schedule formula, floored at
 * Rs 11,500. Qualifies if under 60/55 and (a) 15+ years'
 * contributions, or (b) 5+ years since entry into insurable
 * employment and 3+ years in the 5 years before invalidity.
 * Payable while invalidity continues; for life after 5 continuous
 * years or on reaching pension age (s.23(3)).
 */
export function calcInvalidityPension(wage: number, serviceYears: number, yearsInLastFive: number): InvalidityPensionResult {
  validateServiceYears(serviceYears);
  if (!isFiniteNumber(yearsInLastFive) || yearsInLastFive < 0 || yearsInLastFive > 5) {
    throw new Error('Years in the last 5 years must be between 0 and 5.');
  }
  const base = calcEobiPension(wage, serviceYears);
  const routeB = serviceYears >= EOBI_INVALIDITY_MIN_YEARS_SINCE_ENTRY && yearsInLastFive >= EOBI_INVALIDITY_MIN_YEARS_IN_LAST_FIVE;
  const entitled = base.entitled || routeB;
  const monthlyPension = entitled ? Math.max(base.formulaPension, EOBI_MINIMUM_PENSION) : 0;
  return {
    ...base,
    yearsInLastFive,
    entitled,
    monthlyPension,
    floorApplied: entitled && base.formulaPension < EOBI_MINIMUM_PENSION,
    annualPension: round2(monthlyPension * 12),
  };
}

// ---------------------------------------------------------------------------
// National Savings (CDNS profit rates w.e.f. 21 October 2026;
// Savings Account 10.00% since 26 May 2026)
// ---------------------------------------------------------------------------

export const NSS_MAX_AMOUNT = MAX_AMOUNT;
export const NSS_MAX_YEARS = 30;

/** Look a scheme up by id; throws on an unknown id. */
export function nssSchemeById(schemeId: string): NationalSavingsScheme {
  const found = NATIONAL_SAVINGS_SCHEMES.find((s) => s.id === schemeId);
  if (!found) throw new Error('Choose a National Savings scheme.');
  return found;
}

function validateNssAmount(amount: number, scheme: NationalSavingsScheme): void {
  if (!isFiniteNumber(amount) || amount <= 0 || amount > NSS_MAX_AMOUNT) {
    throw new Error('Investment amount must be a positive number.');
  }
  if (scheme.minInvestment > 0 && amount < scheme.minInvestment) {
    throw new Error(
      `${scheme.name}: minimum investment is Rs ${scheme.minInvestment.toLocaleString('en-PK')}.`,
    );
  }
  if (scheme.maxInvestment !== null && amount > scheme.maxInvestment) {
    throw new Error(
      `${scheme.name}: maximum investment is Rs ${scheme.maxInvestment.toLocaleString('en-PK')}.`,
    );
  }
}

/**
 * Monthly profit on a monthly-paying scheme: amount x rate / 12.
 * RIC 12.12% on Rs 100,000 = Rs 1,010/month; BSC/PBA/SFWA 12.96%
 * on Rs 100,000 = Rs 1,080/month (the CDNS-stated amounts).
 */
export function calcNssMonthlyProfit(amount: number, ratePct: number): number {
  if (!isFiniteNumber(amount) || amount <= 0 || amount > NSS_MAX_AMOUNT) {
    throw new Error('Investment amount must be a positive number.');
  }
  if (!isFiniteNumber(ratePct) || ratePct <= 0 || ratePct > 100) {
    throw new Error('Profit rate must be between 0% and 100% a year.');
  }
  return round2((amount * ratePct) / 100 / 12);
}

export interface DscEncashmentResult {
  amount: number;
  yearsHeld: number;
  /** Completed years (whole years only — the table is per-year). */
  wholeYears: number;
  /** Cumulative profit as % of the amount, from the CDNS table (0
   *  when encashed before 1 full year). */
  profitPct: number;
  /** Profit payable, Rs (0 before 1 full year). */
  profit: number;
  /** Amount + profit on encashment, Rs. */
  value: number;
  /** True when encashed before 1 full year — no profit at all. */
  noProfit: boolean;
}

/**
 * Defence Savings Certificates encashment, from the CDNS per-year
 * cumulative table — NOT a flat compounding rate. On Rs 100,000:
 * year 1 Rs 110,000; year 5 Rs 167,000; year 10 Rs 315,000
 * (215% profit). No profit if encashed before 1 full year.
 * yearsHeld is floored to whole years; beyond the 10-year tenure
 * is rejected (the certificate has matured).
 */
export function calcDscEncashment(amount: number, yearsHeld: number): DscEncashmentResult {
  const scheme = nssSchemeById('dsc');
  validateNssAmount(amount, scheme);
  if (!isFiniteNumber(yearsHeld) || yearsHeld < 0 || yearsHeld > DSC_TENURE_YEARS) {
    throw new Error(`Years held must be between 0 and ${DSC_TENURE_YEARS} (the DSC matures at 10 years).`);
  }
  const wholeYears = Math.floor(yearsHeld);
  const profitPct = wholeYears === 0 ? 0 : DSC_ENCASHMENT_TABLE_PCT[wholeYears - 1];
  const profit = round2((amount * profitPct) / 100);
  return {
    amount,
    yearsHeld,
    wholeYears,
    profitPct,
    profit,
    value: round2(amount + profit),
    noProfit: wholeYears === 0,
  };
}

export interface SscProfitResult {
  amount: number;
  /** Completed half-year periods (whole periods only). */
  halfYears: number;
  /** Profit per completed period, Rs, in period order. */
  perPeriodProfit: number[];
  /** Total profit over the completed periods, Rs. */
  profit: number;
  /** Amount + profit, Rs. */
  value: number;
  /** True when encashed before 6 months — no profit at all. */
  noProfit: boolean;
}

/**
 * Special Savings Certificates / Account half-yearly profit:
 * 12.00% p.a. for each of the first five 6-month periods, 12.80%
 * p.a. for the 6th (final) period — so each half-year pays half of
 * that: Rs 6,000 per Rs 100,000 for the first five periods, Rs 6,400
 * for the last — Rs 36,400 over the full 3 years. No profit if
 * encashed before 6 months.
 */
export function calcSscProfit(amount: number, halfYears: number): SscProfitResult {
  const scheme = nssSchemeById('ssc');
  validateNssAmount(amount, scheme);
  if (!isFiniteNumber(halfYears) || halfYears < 0 || halfYears > SSC_TENURE_HALF_YEARS) {
    throw new Error(`Half-years held must be between 0 and ${SSC_TENURE_HALF_YEARS} (the SSC matures at 3 years).`);
  }
  const periods = Math.floor(halfYears);
  const perPeriodProfit = SSC_HALF_YEAR_RATES_PCT.slice(0, periods).map((rate) => round2((amount * rate) / 100));
  const profit = round2(perPeriodProfit.reduce((sum, p) => sum + p, 0));
  return {
    amount,
    halfYears: periods,
    perPeriodProfit,
    profit,
    value: round2(amount + profit),
    noProfit: periods === 0,
  };
}

export interface SaProfitResult {
  amount: number;
  years: number;
  /** Profit credited each year (10.00% of the amount), Rs. */
  annualProfit: number;
  /** Total profit over the years entered, Rs (simple sum — profit is
   *  credited annually on 30 June on minimum balances; no
   *  compounding is claimed). */
  totalProfit: number;
  /** Amount + total profit, Rs. */
  value: number;
}

/**
 * Savings Account annual profit: 10.00% p.a. of the amount, credited
 * annually on 30 June on minimum balances (6th day to month-end).
 * On Rs 100,000 that is Rs 10,000 a year.
 */
export function calcSaProfit(amount: number, years: number): SaProfitResult {
  const scheme = nssSchemeById('sa');
  validateNssAmount(amount, scheme);
  if (!isFiniteNumber(years) || years < 1 || years > NSS_MAX_YEARS) {
    throw new Error(`Years must be between 1 and ${NSS_MAX_YEARS}.`);
  }
  const annualProfit = round2((amount * scheme.ratePct) / 100);
  return {
    amount,
    years,
    annualProfit,
    totalProfit: round2(annualProfit * years),
    value: round2(amount + annualProfit * years),
  };
}

export interface NssWhtResult {
  grossProfit: number;
  /** WHT rate deducted at source (0 where none is collected). */
  whtRate: number;
  whtAmount: number;
  /** Profit after WHT, Rs. */
  netProfit: number;
  /** True when no WHT is collected at source (BSC/PBA/SFWA) — the
   *  profit must still be declared in the tax return. */
  noWhtAtSource: boolean;
}

/**
 * Withholding tax on National Savings profit (Income Tax Ordinance
 * 2001 s.151): 15% for filers, 30% for non-filers, where WHT
 * applies (DSC, RIC, SSC, SA). BSC, PBA and SFWA: no WHT is
 * collected at source — that is NOT the same as tax-free, and the
 * page says the profit must still be declared.
 */
export function applyNssWht(
  grossProfit: number,
  whtApplies: boolean,
  filerStatus: 'filer' | 'non-filer',
): NssWhtResult {
  if (!isFiniteNumber(grossProfit) || grossProfit < 0 || grossProfit > NSS_MAX_AMOUNT) {
    throw new Error('Profit must be a number between Rs 0 and Rs 999,999,999,999.');
  }
  const whtRate = whtApplies ? (filerStatus === 'filer' ? NSS_WHT_FILER_RATE : NSS_WHT_NON_FILER_RATE) : 0;
  const whtAmount = round2(grossProfit * whtRate);
  return {
    grossProfit,
    whtRate,
    whtAmount,
    netProfit: round2(grossProfit - whtAmount),
    noWhtAtSource: !whtApplies,
  };
}

export interface NationalSavingsResult {
  schemeId: NationalSavingsSchemeId;
  schemeName: string;
  amount: number;
  /** Main figure shown as the headline, Rs. */
  headlineValue: number;
  headlineLabel: string;
  /** Profit before WHT for the period the headline covers. */
  grossProfit: number;
  /** WHT rate deducted at source (0 where none is collected). */
  whtRate: number;
  whtAmount: number;
  /** Profit after WHT for the period the headline covers. */
  netProfit: number;
  /** Principal + net profit where the scheme matures or the period
   *  is closed; null for the open-ended SFWA. */
  totalReceived: number | null;
  /** Net annual profit where the scheme pays monthly or annually. */
  annualProfit: number | null;
  /** Net monthly profit where the scheme pays monthly. */
  monthlyProfit: number | null;
  /** Extra lines for the breakdown table. */
  detail: { label: string; value: number }[];
  note: string;
}

/**
 * One entry point for the page: work out the National Savings
 * result for a scheme and amount. Tenure options: `yearsHeld` for
 * DSC (default 10, the maturity), `halfYears` for SSC (default 6,
 * the full 3 years), `years` for the Savings Account (default 1).
 * Monthly schemes (RIC/BSC/PBA/SFWA) pay from the issue date, so
 * no tenure input is needed — the result shows the monthly profit
 * and, where the scheme has a fixed tenure, the total profit to
 * maturity. WHT is applied at source only where the scheme
 * collects it; filerStatus defaults to 'filer'.
 */
export function calcNationalSavings(
  schemeId: string,
  amount: number,
  opts: { yearsHeld?: number; halfYears?: number; years?: number; filerStatus?: 'filer' | 'non-filer' } = {},
): NationalSavingsResult {
  const scheme = nssSchemeById(schemeId);
  validateNssAmount(amount, scheme);
  const filerStatus = opts.filerStatus ?? 'filer';

  if (scheme.id === 'dsc') {
    const yearsHeld = opts.yearsHeld ?? DSC_TENURE_YEARS;
    const enc = calcDscEncashment(amount, yearsHeld);
    const wht = applyNssWht(enc.profit, scheme.whtApplies, filerStatus);
    const totalReceived = round2(amount + wht.netProfit);
    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      amount,
      headlineValue: totalReceived,
      headlineLabel: enc.noProfit
        ? 'Encashment value — no profit before 1 year'
        : `Encashment value after ${enc.wholeYears} year${enc.wholeYears === 1 ? '' : 's'} (after tax)`,
      grossProfit: enc.profit,
      whtRate: wht.whtRate,
      whtAmount: wht.whtAmount,
      netProfit: wht.netProfit,
      totalReceived,
      annualProfit: null,
      monthlyProfit: null,
      detail: [
        { label: `Profit — ${enc.profitPct}% of Rs ${amount.toLocaleString('en-PK')} after ${enc.wholeYears} year${enc.wholeYears === 1 ? '' : 's'} (CDNS table)`, value: enc.profit },
        { label: `Withholding tax (${wht.whtRate * 100}% — ${filerStatus})`, value: -wht.whtAmount },
        { label: 'Amount invested', value: amount },
      ],
      note: enc.noProfit
        ? 'No profit is paid if a DSC is encashed before 1 full year — you get your amount back only. The 11.94% is the CDNS-stated rate; the amount above comes from the CDNS per-year encashment table, not from flat compounding.'
        : `After ${enc.wholeYears} year${enc.wholeYears === 1 ? '' : 's'} the CDNS table pays ${enc.profitPct}% profit${enc.wholeYears === 10 ? ' — at maturity Rs 100,000 becomes Rs 315,000 before tax' : ''}. The 11.94% is the CDNS-stated rate; the amount above comes from the CDNS per-year encashment table, not from flat compounding. Zakat is deducted at source as per rules.`,
    };
  }

  if (scheme.id === 'ssc') {
    const halfYears = opts.halfYears ?? SSC_TENURE_HALF_YEARS;
    const ssc = calcSscProfit(amount, halfYears);
    const wht = applyNssWht(ssc.profit, scheme.whtApplies, filerStatus);
    const totalReceived = round2(amount + wht.netProfit);
    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      amount,
      headlineValue: totalReceived,
      headlineLabel: ssc.noProfit
        ? 'Value — no profit before 6 months'
        : `Value after ${ssc.halfYears} half-year${ssc.halfYears === 1 ? '' : 's'} (after tax)`,
      grossProfit: ssc.profit,
      whtRate: wht.whtRate,
      whtAmount: wht.whtAmount,
      netProfit: wht.netProfit,
      totalReceived,
      annualProfit: null,
      monthlyProfit: null,
      detail: [
        { label: `Profit — ${ssc.halfYears} half-year${ssc.halfYears === 1 ? '' : 's'} at 12.00% (12.80% in the 6th)`, value: ssc.profit },
        { label: `Withholding tax (${wht.whtRate * 100}% — ${filerStatus})`, value: -wht.whtAmount },
        { label: 'Amount invested', value: amount },
      ],
      note: ssc.noProfit
        ? 'No profit is paid if an SSC is encashed before 6 months — you get your amount back only.'
        : 'The first five half-years pay 12.00% p.a. each (Rs 6,000 per Rs 100,000 per half-year) and the 6th pays 12.80% p.a. (Rs 6,400 per Rs 100,000) — Rs 36,400 profit on Rs 100,000 over the full 3 years, before tax. Zakat is collected at source as per rules.',
    };
  }

  if (scheme.id === 'sa') {
    const years = opts.years ?? 1;
    const sa = calcSaProfit(amount, years);
    const wht = applyNssWht(sa.totalProfit, scheme.whtApplies, filerStatus);
    const totalReceived = round2(amount + wht.netProfit);
    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      amount,
      headlineValue: round2(wht.netProfit / years),
      headlineLabel: 'Annual profit (after tax)',
      grossProfit: sa.annualProfit,
      whtRate: wht.whtRate,
      whtAmount: round2(wht.whtAmount / years),
      netProfit: round2(wht.netProfit / years),
      totalReceived,
      annualProfit: round2(wht.netProfit / years),
      monthlyProfit: null,
      detail: [
        { label: `Annual profit — 10.00% of Rs ${amount.toLocaleString('en-PK')}`, value: sa.annualProfit },
        { label: `Withholding tax per year (${wht.whtRate * 100}% — ${filerStatus})`, value: -round2(wht.whtAmount / years) },
        { label: `Total profit over ${years} year${years === 1 ? '' : 's'} (after tax)`, value: wht.netProfit },
        { label: 'Amount deposited', value: amount },
      ],
      note: 'Profit is credited annually on 30 June on minimum balances (6th day to month-end) at 10.00% p.a. — unchanged since 26 May 2026. Zakat applies as per rules. Withdrawals are limited to 3 per week.',
    };
  }

  // Monthly-paying schemes: RIC, BSC, PBA, SFWA.
  const monthlyGross = calcNssMonthlyProfit(amount, scheme.ratePct);
  const wht = applyNssWht(monthlyGross, scheme.whtApplies, filerStatus);
  const netMonthly = wht.netProfit;
  const tenureYears = scheme.id === 'ric' ? 5 : scheme.id === 'bsc' || scheme.id === 'pba' ? 10 : null;
  const totalProfitToMaturity = tenureYears === null ? null : round2(netMonthly * 12 * tenureYears);
  const totalReceived = totalProfitToMaturity === null ? null : round2(amount + totalProfitToMaturity);
  return {
    schemeId: scheme.id,
    schemeName: scheme.name,
    amount,
    headlineValue: netMonthly,
    headlineLabel: wht.noWhtAtSource ? 'Monthly profit (no tax deducted at source)' : 'Monthly profit (after tax)',
    grossProfit: monthlyGross,
    whtRate: wht.whtRate,
    whtAmount: wht.whtAmount,
    netProfit: netMonthly,
    totalReceived,
    annualProfit: round2(netMonthly * 12),
    monthlyProfit: netMonthly,
    detail: [
      { label: `Monthly profit — ${scheme.ratePct}% p.a. on Rs ${amount.toLocaleString('en-PK')}`, value: monthlyGross },
      ...(wht.noWhtAtSource
        ? [{ label: 'Withholding tax deducted at source', value: 0 }]
        : [{ label: `Withholding tax (${wht.whtRate * 100}% — ${filerStatus})`, value: -wht.whtAmount }]),
      { label: 'Annual profit (after tax)', value: round2(netMonthly * 12) },
      ...(totalProfitToMaturity === null
        ? []
        : [{ label: `Total profit over ${tenureYears} years (after tax)`, value: totalProfitToMaturity }]),
      { label: 'Amount invested', value: amount },
    ],
    note: wht.noWhtAtSource
      ? `No withholding tax is collected at source on ${scheme.shortName} — but that does not mean tax-free: the profit must still be declared in your tax return. ${scheme.shortName} is Zakat-exempt${scheme.id === 'sfwa' ? ' (no Zakat deductible; Behbood rules apply)' : ''}.`
      : `Monthly profit is paid from the issue date. ${scheme.shortName} is Zakat-exempt.`,
  };
}

// --- GST (Sales Tax Act 1990; standard rate 18%, s.3(1)) ---
export interface GstInput {
  /** Amount in Rs: the price before tax in 'add' mode, the price
   *  including tax in 'remove' mode. Must be a positive number. */
  amount: number;
  /** GST rate, % (0 = zero-rated). null = exempt (no tax at all). */
  ratePct: number | null;
  /** 'add': amount is before tax. 'remove': amount includes tax. */
  mode: 'add' | 'remove';
  /** True when the buyer is unregistered / a non-active taxpayer:
   *  +4% further tax (s.3(1A)) on the value excluding tax. */
  furtherTax?: boolean;
}

export interface GstResult {
  /** Price excluding GST, Rs. */
  baseAmount: number;
  /** GST amount, Rs. */
  gstAmount: number;
  /** Further tax (4% of the base), Rs — 0 unless furtherTax is set. */
  furtherTaxAmount: number;
  /** Total payable, Rs. */
  total: number;
  /** GST rate used, % (0 for zero-rated and exempt). */
  ratePct: number;
  /** True when the rate was exempt (ratePct null). */
  exempt: boolean;
  /** True when further tax was applied. */
  furtherTax: boolean;
}

function validateGstInput(input: GstInput): { ratePct: number; exempt: boolean; furtherTax: boolean } {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Enter a positive number for the amount.');
  }
  if (input.ratePct !== null && (!Number.isFinite(input.ratePct) || input.ratePct < 0 || input.ratePct > 100)) {
    throw new Error('GST rate must be between 0% and 100%.');
  }
  if (input.mode !== 'add' && input.mode !== 'remove') {
    throw new Error("Mode must be 'add' or 'remove'.");
  }
  return { ratePct: input.ratePct ?? 0, exempt: input.ratePct === null, furtherTax: input.furtherTax ?? false };
}

/**
 * Add GST to a price, or remove GST from a price that includes it.
 * Add: total = price x (1 + rate); GST = price x rate. Remove:
 * base = inclusive / (1 + rate); GST = inclusive - base. Taking
 * the rate % of the INCLUSIVE price is the common wrong method —
 * e.g. Rs 118,000 x 18% = Rs 21,240 is wrong; the correct GST on
 * Rs 118,000 inclusive is Rs 18,000. Further tax (4%, s.3(1A)) is
 * charged on the base (excluding-tax) value, so in 'remove' mode
 * the divisor is (1 + rate + 4%) when further tax applies.
 */
export function calcGst(input: GstInput): GstResult {
  const { ratePct, exempt, furtherTax } = validateGstInput(input);
  const rate = ratePct / 100;
  const furtherRate = furtherTax ? GST_FURTHER_TAX_RATE : 0;

  let baseAmount: number;
  let gstAmount: number;
  let furtherTaxAmount: number;
  if (input.mode === 'add') {
    baseAmount = round2(input.amount);
    gstAmount = round2(baseAmount * rate);
    furtherTaxAmount = round2(baseAmount * furtherRate);
  } else {
    baseAmount = round2(input.amount / (1 + rate + furtherRate));
    gstAmount = round2(baseAmount * rate);
    furtherTaxAmount = round2(baseAmount * furtherRate);
  }
  const total = round2(baseAmount + gstAmount + furtherTaxAmount);
  return { baseAmount, gstAmount, furtherTaxAmount, total, ratePct, exempt, furtherTax };
}

/** Add GST to a price before tax. Thin wrapper over calcGst. */
export function calcGstAdd(amount: number, ratePct: number | null, furtherTax = false): GstResult {
  return calcGst({ amount, ratePct, mode: 'add', furtherTax });
}

/** Remove GST from a price that includes it. Thin wrapper over calcGst. */
export function calcGstRemove(inclusive: number, ratePct: number | null, furtherTax = false): GstResult {
  return calcGst({ amount: inclusive, ratePct, mode: 'remove', furtherTax });
}

// --- Car loan (SBP BPRD Circulars 29/2021 & 19/2022) ---
export interface CarLoanInput {
  /** Vehicle price, Rs. */
  price: number;
  /** Down payment, % of price (SBP floor 30%). */
  downPct: number;
  /** Tenure, whole years. Capped by engine size (see below). */
  tenureYears: number;
  /** Markup rate, % p.a. (floating: KIBOR + spread). */
  annualRatePct: number;
  /** Engine size band — sets the SBP tenure cap. */
  engineCc: 'upto-1000' | 'above-1000';
  /** Processing fee, Rs (flat amount, not a %). */
  processingFee: number;
  /** Insurance / Takaful, % of car value p.a. */
  insurancePctPa: number;
}

export interface CarLoanResult {
  price: number;
  downPayment: number;
  /** Amount financed (price − down payment). */
  financed: number;
  emi: number;
  totalPayment: number;
  totalInterest: number;
  /** Insurance / Takaful over the whole tenure, Rs. */
  totalInsurance: number;
  processingFee: number;
  /** Down payment + EMI total + processing fee + insurance. */
  totalCost: number;
  /** True when the financed amount exceeds the SBP Rs 3m aggregate cap. */
  capWarning: boolean;
  maxTenureYears: number;
  tenureMonths: number;
}

/**
 * Car loan: EMI on the financed amount (price − down payment),
 * plus the flat processing fee and insurance over the tenure.
 * Insurance is charged at the entered % of the ORIGINAL car
 * value each year — an estimate; the actual premium may fall
 * as the car's value falls, so the page says so. The SBP
 * tenure cap is enforced by engine size (≤1000cc: 5 years;
 * above 1000cc: 3 years) and the Rs 3m aggregate cap is
 * reported as a warning flag, not a throw: a larger down
 * payment can bring the financed amount under the cap.
 */
export function calcCarLoan(input: CarLoanInput): CarLoanResult {
  if (!isFiniteNumber(input.price) || input.price <= 0 || input.price > MAX_AMOUNT) {
    throw new Error('Car price must be a positive number.');
  }
  if (!isFiniteNumber(input.downPct) || input.downPct < CAR_LOAN_DOWN_PCT_MIN || input.downPct > CAR_LOAN_DOWN_PCT_MAX) {
    throw new Error(`Down payment must be between ${CAR_LOAN_DOWN_PCT_MIN}% and ${CAR_LOAN_DOWN_PCT_MAX}% of the car price.`);
  }
  const maxTenureYears =
    input.engineCc === 'upto-1000' ? CAR_LOAN_MAX_TENURE_YEARS_UPTO_1000CC : CAR_LOAN_MAX_TENURE_YEARS_ABOVE_1000CC;
  if (input.engineCc !== 'upto-1000' && input.engineCc !== 'above-1000') {
    throw new Error("Engine size must be 'upto-1000' or 'above-1000'.");
  }
  if (!Number.isInteger(input.tenureYears) || input.tenureYears < CAR_LOAN_MIN_TENURE_YEARS || input.tenureYears > maxTenureYears) {
    throw new Error(
      `Tenure must be ${CAR_LOAN_MIN_TENURE_YEARS}–${maxTenureYears} years for this engine size (SBP cap: ${maxTenureYears} years ${input.engineCc === 'upto-1000' ? 'up to 1000cc' : 'above 1000cc'}).`,
    );
  }
  if (!isFiniteNumber(input.annualRatePct) || input.annualRatePct < 0 || input.annualRatePct > EMI_MAX_RATE) {
    throw new Error(`Markup rate must be between 0 and ${EMI_MAX_RATE}%.`);
  }
  if (!isFiniteNumber(input.processingFee) || input.processingFee < 0 || input.processingFee > 100000) {
    throw new Error('Processing fee must be between Rs 0 and Rs 100,000.');
  }
  if (!isFiniteNumber(input.insurancePctPa) || input.insurancePctPa < 0 || input.insurancePctPa > 10) {
    throw new Error('Insurance / Takaful must be between 0% and 10% of the car value per year.');
  }
  const downPayment = round2((input.price * input.downPct) / 100);
  const financed = round2(input.price - downPayment);
  const tenureMonths = input.tenureYears * 12;
  const emiResult = calcEMI(financed, input.annualRatePct, tenureMonths);
  const totalInsurance = round2(((input.price * input.insurancePctPa) / 100) * input.tenureYears);
  const totalCost = round2(downPayment + emiResult.totalPayment + input.processingFee + totalInsurance);
  return {
    price: input.price,
    downPayment,
    financed,
    emi: emiResult.emi,
    totalPayment: emiResult.totalPayment,
    totalInterest: emiResult.totalInterest,
    totalInsurance,
    processingFee: input.processingFee,
    totalCost,
    capWarning: financed > CAR_LOAN_AGGREGATE_CAP,
    maxTenureYears,
    tenureMonths,
  };
}

// --- Home loan: commercial (floating) and Apna Ghar (two-phase) ---
export interface HomeLoanInput {
  /** 'commercial': one floating KIBOR-linked rate. 'apna-ghar':
   *  5% fixed for the first 10 years, then the post-subsidy rate. */
  mode: 'commercial' | 'apna-ghar';
  /** Property price, Rs. */
  price: number;
  /** Equity / down payment, % of price. */
  equityPct: number;
  /** Tenure, whole years. */
  tenureYears: number;
  /** Commercial markup rate, % p.a. (floating: KIBOR + spread). */
  ratePct: number;
  /** Post-subsidy rate, % p.a. — Apna Ghar mode only (default
   *  KIBOR +3% ≈ 16%, editable on the page). */
  postSubsidyRatePct?: number;
  /** Processing fee, Rs (flat). Ignored in Apna Ghar mode: Rs 0. */
  processingFee?: number;
}

export interface HomeLoanResult {
  mode: 'commercial' | 'apna-ghar';
  price: number;
  downPayment: number;
  /** Amount financed (price − equity). */
  financed: number;
  /** Headline EMI: the commercial EMI, or the Apna Ghar phase-1 EMI. */
  emi: number;
  /** Phase-1 EMI (years 1–10 at 5%) — Apna Ghar only, else null. */
  phase1Emi: number | null;
  /** Phase-2 EMI (remaining years at the post-subsidy rate) — null
   *  in commercial mode, and null when the tenure is ≤10 years. */
  phase2Emi: number | null;
  phase1Months: number;
  phase2Months: number;
  /** Balance still owed when the subsidy ends — Apna Ghar only. */
  balanceAfterPhase1: number | null;
  totalPayment: number;
  totalInterest: number;
  processingFee: number;
  /** Equity + EMI total + processing fee. */
  totalCost: number;
  /** True in Apna Ghar mode when the financed amount exceeds the
   *  Rs 10m scheme cap. */
  apnaCapExceeded: boolean;
  tenureMonths: number;
}

/**
 * Home loan. Commercial mode is a single reducing-balance EMI.
 * Apna Ghar mode is TWO phases and must not be collapsed into
 * one rate: the phase-1 EMI is the EMI that amortises the loan
 * over the FULL tenure at the 5% subsidy rate; after the
 * subsidy years the remaining balance is re-amortised over the
 * remaining months at the post-subsidy rate, giving the
 * phase-2 EMI. (If the post-subsidy rate equalled 5%, the
 * phase-2 EMI would nearly equal the phase-1 EMI — within a
 * few paisa, because the balance carried forward is rounded
 * to 2 decimals; the test checks this identity.) Total payment
 * paid in each phase, not a single-rate total.
 */
export function calcHomeLoan(input: HomeLoanInput): HomeLoanResult {
  if (input.mode !== 'commercial' && input.mode !== 'apna-ghar') {
    throw new Error("Mode must be 'commercial' or 'apna-ghar'.");
  }
  if (!isFiniteNumber(input.price) || input.price <= 0 || input.price > MAX_AMOUNT) {
    throw new Error('Property price must be a positive number.');
  }
  const equityMin = input.mode === 'apna-ghar' ? APNA_GHAR_MIN_EQUITY_PCT : HOME_LOAN_EQUITY_PCT_MIN_COMMERCIAL;
  const equityMax = HOME_LOAN_EQUITY_PCT_MAX_COMMERCIAL;
  if (!isFiniteNumber(input.equityPct) || input.equityPct < equityMin || input.equityPct > equityMax) {
    throw new Error(`Equity must be between ${equityMin}% and ${equityMax}% of the property price in ${input.mode === 'apna-ghar' ? 'Apna Ghar' : 'commercial'} mode.`);
  }
  const tenureMax = input.mode === 'apna-ghar' ? APNA_GHAR_MAX_TENURE_YEARS : HOME_LOAN_TENURE_MAX_YEARS_COMMERCIAL;
  if (!Number.isInteger(input.tenureYears) || input.tenureYears < HOME_LOAN_TENURE_MIN_YEARS || input.tenureYears > tenureMax) {
    throw new Error(
      `Tenure must be ${HOME_LOAN_TENURE_MIN_YEARS}–${tenureMax} years in ${input.mode === 'apna-ghar' ? 'Apna Ghar' : 'commercial'} mode (banks cap at ${tenureMax} years; SBP allows 30).`,
    );
  }
  if (!isFiniteNumber(input.ratePct) || input.ratePct < 0 || input.ratePct > EMI_MAX_RATE) {
    throw new Error(`Markup rate must be between 0 and ${EMI_MAX_RATE}%.`);
  }
  const processingFee = input.mode === 'apna-ghar' ? 0 : (input.processingFee ?? 0);
  if (!isFiniteNumber(processingFee) || processingFee < 0 || processingFee > 100000) {
    throw new Error('Processing fee must be between Rs 0 and Rs 100,000.');
  }

  const downPayment = round2((input.price * input.equityPct) / 100);
  const financed = round2(input.price - downPayment);
  const tenureMonths = input.tenureYears * 12;

  if (input.mode === 'commercial') {
    const emiResult = calcEMI(financed, input.ratePct, tenureMonths);
    return {
      mode: 'commercial',
      price: input.price,
      downPayment,
      financed,
      emi: emiResult.emi,
      phase1Emi: null,
      phase2Emi: null,
      phase1Months: 0,
      phase2Months: 0,
      balanceAfterPhase1: null,
      totalPayment: emiResult.totalPayment,
      totalInterest: emiResult.totalInterest,
      processingFee,
      totalCost: round2(downPayment + emiResult.totalPayment + processingFee),
      apnaCapExceeded: false,
      tenureMonths,
    };
  }

  // Apna Ghar: two phases.
  const postRate = input.postSubsidyRatePct ?? input.ratePct;
  if (!isFiniteNumber(postRate) || postRate < 0 || postRate > EMI_MAX_RATE) {
    throw new Error(`Post-subsidy rate must be between 0 and ${EMI_MAX_RATE}%.`);
  }
  const subsidyMonths = Math.min(APNA_GHAR_SUBSIDY_YEARS, input.tenureYears) * 12;
  const full = calcEMI(financed, APNA_GHAR_SUBSIDY_RATE_PCT, tenureMonths);
  const phase1Emi = full.emi;
  if (subsidyMonths >= tenureMonths) {
    // Tenure within the subsidy period: one phase at 5%.
    return {
      mode: 'apna-ghar',
      price: input.price,
      downPayment,
      financed,
      emi: phase1Emi,
      phase1Emi,
      phase2Emi: null,
      phase1Months: tenureMonths,
      phase2Months: 0,
      balanceAfterPhase1: null,
      totalPayment: full.totalPayment,
      totalInterest: full.totalInterest,
      processingFee: 0,
      totalCost: round2(downPayment + full.totalPayment),
      apnaCapExceeded: financed > APNA_GHAR_MAX_FINANCING,
      tenureMonths,
    };
  }
  const balanceAfterPhase1 = full.schedule[subsidyMonths - 1].balance;
  const phase1Paid = round2(full.schedule.slice(0, subsidyMonths).reduce((sum, row) => sum + row.emi, 0));
  const phase2 = calcEMI(balanceAfterPhase1, postRate, tenureMonths - subsidyMonths);
  const totalPayment = round2(phase1Paid + phase2.totalPayment);
  return {
    mode: 'apna-ghar',
    price: input.price,
    downPayment,
    financed,
    emi: phase1Emi,
    phase1Emi,
    phase2Emi: phase2.emi,
    phase1Months: subsidyMonths,
    phase2Months: tenureMonths - subsidyMonths,
    balanceAfterPhase1,
    totalPayment,
    totalInterest: round2(totalPayment - financed),
    processingFee: 0,
    totalCost: round2(downPayment + totalPayment),
    apnaCapExceeded: financed > APNA_GHAR_MAX_FINANCING,
    tenureMonths,
  };
}
