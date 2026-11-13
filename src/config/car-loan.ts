// Car Loan Calculator — CONFIG, not hard-coded in page markup.
// Verified 13 November 2026 from the sources below. Every figure
// that is a proposal, a conflict, or second-hand is labelled as such
// on the page; nothing here is presented as settled unless SBP or
// the bank's own Key Fact Statement says so.
//
// BENCHMARK — SBP policy rate 12% (raised 50bp, effective
// 27 Oct 2026); 1-year KIBOR 12.75% on 12 Oct 2026, 12.94% on
// 6 Nov 2026. All floating car-loan rates are KIBOR + a bank
// spread, and they move. Never present a single "current rate"
// as fact.
//
// SBP RULES — SBP BPRD Circular Letters 29/2021 & 19/2022, as
// quoted in the which.pk car-financing guide:
// - Minimum down payment: at least 30% of the vehicle value
//   (financing capped at 70%). Banks in practice all ask 30%
//   minimum; Bank AL Habib asks 35% on used cars; HBL's
//   calculator allows up to 50%, Alfalah 30–85%.
//   CONFLICT: some pages quote the SBP floor as 15% for cars
//   up to 1000cc and 30% above 1000cc. The 30%-for-all reading
//   is the one bank tables follow; the page states the 30%
//   floor and notes the ≤1000cc exemption exists in the SBP text.
// - Aggregate loan cap: Rs 3,000,000 per person across all
//   banks/DFIs. A car above ~Rs 42.9 lakh needs more than 30%
//   down. No SBP rise found as of October 2026.
// - Tenure (SBP cap): 1–5 years for cars up to 1000cc;
//   1–3 years above 1000cc. 7 years is NOT standard — only
//   Roshan Apni Car / RDA holders (Meezan RDA up to 7 years).
//   A May 2026 draft auto policy proposing 7 years was still
//   only a proposal in October 2026.
// - Imported cars are NOT eligible for bank finance (SBP rule
//   since September 2021); only locally made cars, new or used.
// - Debt burden: all consumer instalments within 40% of net
//   disposable income (SBP).
//
// MARKUP BAND, November 2026 — ≈13.5% (HBL repeat, fixed) to
// ≈18% (UBL top spread) all-in; typical floating band
// ≈15.3–17.5%. Bank spreads (from bank pages / Key Fact
// Statements / Schedules of Charges, Oct–Nov 2026, via
// toolsfluent / calcupk bank calculators and the MCB Key Fact
// Statement):
// - Bank AL Habib: 1-yr KIBOR +2.5% (1–2 yrs) / +3.0% (3 yrs)
//   / +3.5% (4–5 yrs) — single secondary source from an
//   archived page (19 May 2026), labelled as such on the page.
// - Bank Alfalah: KIBOR +3.5% (2 yrs) / +4.0% (3 yrs) /
//   +4.5% (4–5 yrs).
// - MCB Car4U: KIBOR +4.0% (account holders) / +4.5% (others).
// - Meezan Car Ijarah: 15% p.a. in its own calculator
//   (residents).
// - UBL Drive floating: KIBOR +3.5% (existing) / +4.0% (new)
//   — CONFLICT: another source reading the same UBL page
//   (6 Sep 2026) reports +4.25%/+4.75% (1–3 yrs) and
//   +4.75%/+5.25% (4–5 yrs). Treat the UBL spread as +3.5%
//   to +5.25% and say so.
// - HBL fixed: 15.50% new / 14.50% existing / 13.50% repeat.
//   HBL's 11.99% fixed campaign ran 19 Aug–30 Sep 2026 and
//   may be withdrawn — DO NOT present 11.99% as current.
//
// PROCESSING FEE — flat Rs amounts, NOT a %: HBL Rs 13,000 +
// FED (Rs 6,500 repeat), Meezan Rs 3,800 + FED, MCB Rs 12,000,
// UBL Rs 14,000 + FED (Key Fact Statement, second-hand);
// Bank Alfalah's amount is not published on its product page.
// Do NOT present a % fee.
//
// INSURANCE / TAKAFUL — comprehensive cover is effectively
// mandatory for the whole tenure, with the bank as loss payee;
// the first year's premium is usually paid upfront. Cost:
// HBL 1.40% of car value p.a. including a free tracker;
// Meezan Takaful 1.5% p.a. (residents) / 1.99% (RDA); guides
// quote 1.5–3% p.a. No single market-wide %. A tracker is
// usually required (HBL's is free with its insurance); the
// tracker cost otherwise is NOT verifiable — excluded from
// the EMI, shown as a note.
//
// USED CARS — financed (locally made only); age limits only
// second-hand (UBL up to 9 years; AL Habib up to 7 years
// above 1000cc / 5 years up to 1000cc) — labelled as such.
// The car is registered in the borrower's name but
// hypothecated to the bank; it cannot be sold or transferred
// without the bank's NOC and full settlement. Minimum income:
// HBL/UBL Rs 35,000; Alfalah Rs 30,000 salaried / Rs 50,000
// self-employed; MCB Rs 40,000 net. Early settlement charges
// exist and are bank-specific (e.g. HBL 5% of outstanding) —
// do not present one figure.
export const CAR_LOAN_LAST_CHECKED = '13 November 2026';
export const CAR_LOAN_SOURCE_CITATION =
  'SBP BPRD Circular Letters 29/2021 & 19/2022 (via the which.pk car-financing guide); bank pages, Key Fact Statements and Schedules of Charges, Oct–Nov 2026 (MCB Key Fact Statement; HBL, UBL, Bank Alfalah, Bank AL Habib and Meezan calculators/pages via toolsfluent / calcupk); calcistan.pk guide. SBP policy rate 12% (effective 27 Oct 2026); 1-year KIBOR 12.75% (12 Oct 2026) and 12.94% (6 Nov 2026). Verified 13 November 2026.';
export const CAR_LOAN_SOURCE_STATUS =
  'Verified 13 November 2026. Rates are floating (KIBOR-linked) and change — the rate on your bank\'s Key Fact Statement / offer letter governs, not this estimate. Bank AL Habib spread is a single secondary source (archived page, 19 May 2026); the UBL spread is conflicted (+3.5% to +5.25%); the UBL processing fee is second-hand from a Key Fact Statement; the tracker cost (other than HBL\'s free tracker) is not verifiable.';

// REVIEW TRIPWIRE — last checked 13 November 2026. Re-verify by
// 13 February 2027 (3 months — rates move with KIBOR): re-check
// the SBP policy rate and 1-year KIBOR, the SBP 30% down-payment
// floor and Rs 3m aggregate cap, the tenure caps, and the bank
// spreads / processing fees / insurance rates above, and update
// CAR_LOAN_LAST_CHECKED and this date.
export const CAR_LOAN_NEXT_REVIEW = '2027-02-13';

/** SBP aggregate car-finance cap per person, Rs (all banks/DFIs). */
export const CAR_LOAN_AGGREGATE_CAP = 3000000;
/** SBP minimum down payment, % of vehicle value. */
export const CAR_LOAN_MIN_DOWN_PCT = 30;
/** SBP tenure caps, years, by engine size. */
export const CAR_LOAN_MAX_TENURE_YEARS_UPTO_1000CC = 5;
export const CAR_LOAN_MAX_TENURE_YEARS_ABOVE_1000CC = 3;
export const CAR_LOAN_MIN_TENURE_YEARS = 1;

/** Calculator defaults and ranges (evidence-backed, Nov 2026). */
export const CAR_LOAN_DEFAULT_PRICE = 3000000;
export const CAR_LOAN_DEFAULT_DOWN_PCT = 30;
export const CAR_LOAN_DOWN_PCT_MIN = 30;
export const CAR_LOAN_DOWN_PCT_MAX = 50;
export const CAR_LOAN_DEFAULT_TENURE_YEARS = 3;
export const CAR_LOAN_DEFAULT_RATE_PCT = 16.5;
export const CAR_LOAN_RATE_BAND_LOW_PCT = 13.5;
export const CAR_LOAN_RATE_BAND_HIGH_PCT = 18;
export const CAR_LOAN_DEFAULT_PROCESSING_FEE = 10000;
export const CAR_LOAN_PROCESSING_FEE_MIN = 3800;
export const CAR_LOAN_PROCESSING_FEE_MAX = 14000;
export const CAR_LOAN_DEFAULT_INSURANCE_PCT = 2.0;
export const CAR_LOAN_INSURANCE_PCT_MIN = 1.4;
export const CAR_LOAN_INSURANCE_PCT_MAX = 3.0;

/** Bank spreads, Nov 2026 — shown in the page table, with labels. */
export interface CarLoanBankRow {
  bank: string;
  spread: string;
  note: string;
}

export const CAR_LOAN_BANK_SPREADS: CarLoanBankRow[] = [
  {
    bank: 'HBL (fixed)',
    spread: '13.50% repeat / 14.50% existing / 15.50% new',
    note: 'Fixed rates, not KIBOR-linked. The 11.99% campaign (19 Aug–30 Sep 2026) may be withdrawn — not shown as current.',
  },
  {
    bank: 'Bank AL Habib',
    spread: '1-yr KIBOR +2.5% (1–2 yrs) / +3.0% (3 yrs) / +3.5% (4–5 yrs)',
    note: 'Single secondary source, archived page 19 May 2026 — confirm with the bank.',
  },
  {
    bank: 'Bank Alfalah',
    spread: 'KIBOR +3.5% (2 yrs) / +4.0% (3 yrs) / +4.5% (4–5 yrs)',
    note: 'Down payment 30–85% on its calculator; minimum income Rs 30,000 salaried / Rs 50,000 self-employed.',
  },
  {
    bank: 'MCB Car4U',
    spread: 'KIBOR +4.0% (account holders) / +4.5% (others)',
    note: 'Processing fee Rs 12,000; minimum income Rs 40,000 net.',
  },
  {
    bank: 'Meezan Car Ijarah',
    spread: '15% p.a. in its own calculator (residents)',
    note: 'Takaful 1.5% p.a. (residents) / 1.99% (RDA). Up to 7 years only for Roshan Apni Car / RDA holders.',
  },
  {
    bank: 'UBL Drive (floating)',
    spread: 'KIBOR +3.5% to +5.25%',
    note: 'Conflicted: one reading of the UBL page gives +3.5% (existing) / +4.0% (new); another (6 Sep 2026) gives +4.25%/+4.75% (1–3 yrs) and +4.75%/+5.25% (4–5 yrs). Treat as a range.',
  },
];

/** Flat processing fees, Rs — never a %. */
export const CAR_LOAN_PROCESSING_FEES: { bank: string; fee: string }[] = [
  { bank: 'HBL', fee: 'Rs 13,000 + FED (Rs 6,500 repeat)' },
  { bank: 'Meezan', fee: 'Rs 3,800 + FED' },
  { bank: 'MCB', fee: 'Rs 12,000' },
  { bank: 'UBL', fee: 'Rs 14,000 + FED (Key Fact Statement, second-hand)' },
  { bank: 'Bank Alfalah', fee: 'Amount not published on the product page' },
];
