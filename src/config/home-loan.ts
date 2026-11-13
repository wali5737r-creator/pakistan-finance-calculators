// Home Loan Calculator — CONFIG, not hard-coded in page markup.
// Verified 13 November 2026 from the sources below. Every figure
// that is a proposal, a conflict, or second-hand is labelled as such
// on the page; nothing here is presented as settled unless SBP or
// the bank's own page says so.
//
// SBP CEILINGS (Aug 2026, SH&SFD Circular No. 04/2026) — these
// are CEILINGS, not bank terms; banks are stricter:
// - Max tenure 30 years; max LTV 90:10 (minimum 10% equity);
// - total consumer instalments ≤65% of net disposable income.
//
// COMMERCIAL HOME LOANS (bank pages checked 4 Nov 2026, updated
// 10 Nov 2026; patwari.pk comparison; Bank Alfalah home finance
// page, UBL Address FAQ, MCB Apna Ghar page + FAQ PDF — primary):
// - Down payment / equity: typically 15–30% (banks finance
//   70–85%). HBL 30% (finances up to 70%); Meezan 25–30%
//   (70–75%, 65% businessmen); Bank Alfalah min 20% (up to 80%);
//   NBP 15% up to Rs 25m, 25% above; Bank AL Habib 15–25%;
//   MCB tiered by equity band.
// - Tenure: most banks up to 25 years (min 1–3 years by bank:
//   HBL/Meezan/Alfalah 3–25; MCB 2–25; JS 1–25; BankIslami 2–25).
//   UBL Address tenure is not stated on its product page
//   (Ameen FAQ 3–20 years). No major bank product found offering
//   30 years.
// - Markup: KIBOR +2% to +4.25% across banks, repriced yearly.
//   HBL Islamic 1Y KIBOR +3% to +4.2% (floor 8%, cap 30%);
//   Meezan Easy Home 1Y KIBOR +3% salaried / +4% businessmen
//   (first year fixed); Bank Alfalah +3% salaried / +4% others
//   & NRPs; UBL Address +3.5% salaried / +4% self-employed;
//   MCB 6M KIBOR +2% to +3.5% by equity; NBP Saibaan +2%
//   salaried / +3% self-employed; JS GharApna +3% to +4.25%;
//   BankIslami MUSKUN 12.99% fixed 3 years, then 1Y KIBOR +3%.
//   All-in commercial band Nov 2026 ≈14.9–17.2% p.a. Do NOT
//   publish a single "current home loan rate".
// - Processing fee: the only well-evidenced figure is flat
//   ~Rs 10,000 + FED (Meezan Easy Home Rs 10,000 + 16% FED,
//   Jul–Dec 2026 Schedule of Charges; HBL Rs 10,000
//   second-hand). Bank Alfalah's standard home fee is not
//   published. Valuation, legal opinion, stamp duty and
//   transfer/mortgage costs are extra, at actual — no bank
//   publishes typical amounts; EXCLUDED from the EMI, shown as
//   "extra, at actual".
// - Max financing: HBL/Meezan/JS up to Rs 100m; BankIslami
//   Rs 150m; NBP Rs 75m; MCB Rs 50m+; UBL min Rs 1m, max not
//   stated.
// - Other conditions: property valuation + legal opinion
//   required; property mortgaged to the bank; insurance/Takaful
//   included in the monthly instalment (MCB Apna Ghar FAQ).
//   Income proof + 6-month bank statements typically required;
//   debt burden ≤65% (SBP Aug 2026). Purposes: purchase,
//   construction, renovation, plot+construction, balance
//   transfer.
//
// SUBSIDY — Mera Pakistan Mera Ghar (MPMG): ENDED. Launched
// Oct 2020; suspended 30 Jun 2022; listed as "2020–2022,
// concluded". Its old tier rates (2%/5%/7%) are obsolete —
// DO NOT present MPMG as live.
//
// SUBSIDY — CURRENT, LIVE Nov 2026: Wazir-e-Azam Apna Ghar
// Program – Ghar Ho Tu Apna (formerly Mera Ghar Mera Ashiana,
// MGMA). SBP SH&SFD Circular No. 3/2025 (24 Sep 2025);
// renamed by Ministry of Housing & Works notification
// 26 Mar 2026, SBP circular 1 Apr 2026; PM launched
// 30 Apr 2026. Terms (MCB primary page): up to Rs 10m; fixed
// 5% for the first 10 years; then 1-yr KIBOR +3%; max 20
// years; 90% financing (10% equity); NO processing fee; NO
// prepayment penalty; first-time homeowners only; house
// ≤10 marla / flat ≤1,500 sq ft; 50,000 homes in FY2025-26.
// The old MGMA tiers (5% up to Rs 2m / 8% Rs 2–3.5m) were
// replaced Mar 2026 by uniform 5% up to Rs 10m (ECC Feb 2026)
// — pages still showing an 8% tier are out of date. Min age 25
// for the primary applicant (MCB FAQ); one subsidised loan per
// person, once only; must not already own property.
//
// NOT VERIFIABLE (do NOT state): commercial home-loan age
// limits / min-max age from any named bank page; "property
// must be in the borrower's name" as a standalone rule (say
// "clear title / valuation / mortgage required" instead);
// typical valuation/legal fee amounts; Bank Alfalah / UBL /
// MCB commercial processing-fee amounts. Punjab Apni Chhat
// Apna Ghar (interest-free, up to Rs 1.5m, 7 years) is only
// one secondary source, provincial-only — mentioned at most
// as a labelled weak note, or omitted.
export const HOME_LOAN_LAST_CHECKED = '13 November 2026';
export const HOME_LOAN_SOURCE_CITATION =
  'SBP SH&SFD Circular No. 3/2025 (24 Sep 2025) and SH&SFD Circular No. 04/2026 (Aug 2026 ceilings); MCB Apna Ghar page + FAQ PDF, Bank Alfalah home finance page and UBL Address FAQ (primary); patwari.pk home-loan comparison; bank pages checked 4 Nov 2026, updated 10 Nov 2026. Verified 13 November 2026.';
export const HOME_LOAN_SOURCE_URL_SBP =
  'https://www.sbp.org.pk/smefd/circulars/2025/C3.htm';
export const HOME_LOAN_SOURCE_URL_MCB =
  'https://www.mcb.com.pk/personal/consumer-loans/wazir-e-azam-apna-ghar-program-ghar-ho-tu-apna';
export const HOME_LOAN_SOURCE_URL_MCB_FAQ =
  'https://www.mcb.com.pk/assets/documents/Wazir-Azam-FAQs-Subsidized-Home-Loan-N-8-April-2026-4.pdf';
export const HOME_LOAN_SOURCE_STATUS =
  'Verified 13 November 2026. Commercial rates are floating (KIBOR-linked) and change — the rate on your bank\'s Key Fact Statement / offer letter governs, not this estimate. UBL Address tenure is not stated on its product page; the HBL Rs 10,000 processing fee is second-hand; Bank Alfalah / UBL / MCB commercial processing-fee amounts are not published. Mera Pakistan Mera Ghar (2020–2022) is concluded — its 2%/5%/7% tiers are obsolete.';

// REVIEW TRIPWIRE — last checked 13 November 2026. Re-verify by
// 13 February 2027 (3 months — rates move with KIBOR): re-check
// the SBP ceilings, the commercial KIBOR spreads and the all-in
// band, the Apna Ghar 5% / Rs 10m / 20-year terms and the 50,000
// homes FY2025-26 quota, and update HOME_LOAN_LAST_CHECKED and
// this date.
export const HOME_LOAN_NEXT_REVIEW = '2027-02-13';

/** SBP ceilings (Aug 2026, SH&SFD Circular No. 04/2026) — ceilings, not bank terms. */
export const HOME_LOAN_SBP_MAX_TENURE_YEARS = 30;
export const HOME_LOAN_SBP_MAX_LTV_PCT = 90;
export const HOME_LOAN_SBP_MAX_DEBT_BURDEN_PCT = 65;

/** Commercial calculator defaults and ranges (Nov 2026). */
export const HOME_LOAN_DEFAULT_PRICE = 10000000;
export const HOME_LOAN_PRICE_MIN = 1000000;
export const HOME_LOAN_PRICE_MAX = 100000000;
export const HOME_LOAN_DEFAULT_EQUITY_PCT = 25;
export const HOME_LOAN_EQUITY_PCT_MIN_COMMERCIAL = 15;
export const HOME_LOAN_EQUITY_PCT_MAX_COMMERCIAL = 30;
export const HOME_LOAN_DEFAULT_TENURE_YEARS = 20;
export const HOME_LOAN_TENURE_MIN_YEARS = 3;
export const HOME_LOAN_TENURE_MAX_YEARS_COMMERCIAL = 25;
export const HOME_LOAN_DEFAULT_RATE_PCT = 16;
export const HOME_LOAN_RATE_BAND_LOW_PCT = 14.9;
export const HOME_LOAN_RATE_BAND_HIGH_PCT = 17.2;
export const HOME_LOAN_DEFAULT_PROCESSING_FEE = 10000;
export const HOME_LOAN_PROCESSING_FEE_MIN = 4000;
export const HOME_LOAN_PROCESSING_FEE_MAX = 10000;

/** Apna Ghar (subsidised) terms — SBP SH&SFD Circular No. 3/2025, as renamed Mar 2026. */
export const APNA_GHAR_MAX_FINANCING = 10000000;
export const APNA_GHAR_SUBSIDY_RATE_PCT = 5;
export const APNA_GHAR_SUBSIDY_YEARS = 10;
export const APNA_GHAR_MAX_TENURE_YEARS = 20;
export const APNA_GHAR_MIN_EQUITY_PCT = 10;
export const APNA_GHAR_DEFAULT_POST_SUBSIDY_RATE_PCT = 16;
export const APNA_GHAR_MAX_HOUSE_MARLA = 10;
export const APNA_GHAR_MAX_FLAT_SQFT = 1500;
export const APNA_GHAR_MIN_AGE_PRIMARY_APPLICANT = 25;
export const APNA_GHAR_HOMES_FY2025_26 = 50000;

/** Commercial bank spreads, Nov 2026 — shown in the page table. */
export interface HomeLoanBankRow {
  bank: string;
  spread: string;
  note: string;
}

export const HOME_LOAN_BANK_SPREADS: HomeLoanBankRow[] = [
  {
    bank: 'MCB Apna Ghar',
    spread: '6M KIBOR +2% to +3.5% by equity',
    note: 'Max financing Rs 50m+. Valuation + legal opinion required; insurance/Takaful in the instalment.',
  },
  {
    bank: 'NBP Saibaan',
    spread: 'KIBOR +2% salaried / +3% self-employed',
    note: 'Max financing Rs 75m. Equity 15% up to Rs 25m, 25% above.',
  },
  {
    bank: 'HBL Islamic',
    spread: '1Y KIBOR +3% to +4.2% (floor 8%, cap 30%)',
    note: 'Finances up to 70% (30% equity). Max financing Rs 100m.',
  },
  {
    bank: 'Meezan Easy Home',
    spread: '1Y KIBOR +3% salaried / +4% businessmen (first year fixed)',
    note: 'Finances 70–75% (65% for businessmen). Max financing Rs 100m. Processing fee Rs 10,000 + 16% FED (Jul–Dec 2026 Schedule of Charges).',
  },
  {
    bank: 'Bank Alfalah',
    spread: 'KIBOR +3% salaried / +4% others & NRPs',
    note: 'Finances up to 80% (min 20% equity). Standard home processing fee not published.',
  },
  {
    bank: 'UBL Address',
    spread: 'KIBOR +3.5% salaried / +4% self-employed',
    note: 'Minimum financing Rs 1m; maximum not stated. Tenure not stated on the product page (Ameen FAQ: 3–20 years).',
  },
  {
    bank: 'JS GharApna',
    spread: 'KIBOR +3% to +4.25%',
    note: 'Tenure 1–25 years. Max financing Rs 100m.',
  },
  {
    bank: 'BankIslami MUSKUN',
    spread: '12.99% fixed 3 years, then 1Y KIBOR +3%',
    note: 'Tenure 2–25 years. Max financing Rs 150m.',
  },
];
