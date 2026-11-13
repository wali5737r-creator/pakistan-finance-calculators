// National Savings Calculator — CONFIG, not hard-coded in page markup.
// Verified 13 November 2026 from the sources below. Every figure that
// is an estimate, a range, or second-hand is labelled as such on the
// page; nothing here is presented as a notified rate unless it was
// notified by CDNS.
//
// RATES — Central Directorate of National Savings (CDNS), "Summary of
// NSS Profit Rates (in %age and amount), w.e.f. 21-Oct-2026"
// (https://savings.gov.pk/latest-profit-rates/). Most recent revision
// 21 October 2026 for every scheme except the Savings Account, which
// is unchanged at 10.00% since 26 May 2026. No November 2026 revision
// was found as of 13 November 2026. STALE RATES IN CIRCULATION: some
// sites still show pre-2026-cut figures (e.g. BSC 13.68%, RIC 13.56%,
// DSC 13.24%) — do NOT use those; the page says the rates below are
// the 21 October 2026 revision.
//
// DSC — Defence Savings Certificates: 11.94% p.a. CDNS-stated; 10-year
// maturity; profit ONLY on maturity/encashment, nothing monthly or
// half-yearly; no profit if encashed before 1 full year; min Rs 500,
// no max. The profit is paid from a per-year cumulative encashment
// table, NOT from flat compounding — so this calculator uses the
// table. On Rs 100,000: Yr1 10%, Yr2 21%, Yr3 34%, Yr4 49%, Yr5 67%,
// Yr6 88%, Yr7 113%, Yr8 142%, Yr9 176%, Yr10 215% (Rs 315,000 at
// maturity). The table was confirmed by two press reports of the CDNS
// schedule (21 October 2026). The 11.94% is labelled "CDNS-stated"
// beside the Rs 315,000 maturity figure, because the table is the
// operative schedule. WHT 15% filer / 30% non-filer; Zakat deducted
// at source as per rules.
//
// RIC — Regular Income Certificates: 12.12% p.a. (Rs 1,010/month per
// Rs 100,000); monthly profit from the issue date; 5-year maturity;
// min Rs 50,000, no max. WHT 15%/30%. ZAKAT EXEMPT (official RIC page).
//
// BSC — Behbood Savings Certificates: 12.96% p.a. (Rs 1,080/month per
// Rs 100,000); monthly; 10-year tenure; min Rs 5,000, max Rs 7.5m
// single / Rs 15m joint (product page + rate card). NOTE: the CDNS
// FAQ still says Rs 5m/10m — that is STALE; the page uses the
// product-page figures and says the FAQ is stale. Eligibility:
// senior citizen 60+, single widow (while unmarried), disabled person
// with the disability logo on the CNIC, special minor via guardian.
// NO WHT collected at source; Zakat-exempt.
//
// PBA — Pensioners' Benefit Account: 12.96% p.a. (Rs 1,080/month per
// Rs 100,000); monthly; 10-year maturity; min Rs 10,000, max
// Rs 7.5m, max 8 deposits, one account at a time. Eligibility:
// pensioners of federal/provincial/AJK governments, armed forces,
// semi-government and autonomous bodies; eligible family member after
// the pensioner's death. Private-sector / EOBI-only retirees do NOT
// qualify. NO WHT collected at source; Zakat-exempt.
//
// SSC / SSA — Special Savings Certificates / Special Savings Account:
// 12.00% for each of the first five 6-month periods, 12.80% for the
// 6th (final) period — Rs 6,000 then Rs 6,400 per Rs 100,000 per
// half-year; half-yearly; 3-year tenure; min Rs 500, no max; no profit
// if encashed before 6 months. WHT 15%/30%. Zakat collected at source
// as per rules.
//
// SA — Savings Account: 10.00% p.a., unchanged since 26 May 2026;
// credited annually on 30 June on minimum balances (6th day to
// month-end); min Rs 100, no max; withdrawals max 3 per week.
// WHT 15%/30%. Zakat applicable as per rules.
//
// SFWA — Shuhada Family Welfare Account: 12.96% p.a. (Rs 1,080/month
// per Rs 100,000); monthly, on daily balances, paid on/after the 1st
// of the next month (a Savings Account is mandatory for the credit).
// Eligibility: eligible family member of a martyr (armed forces, law
// enforcement, civilians killed in a terrorist attack), citizen of
// Pakistan; one account per family member. WHT-exempt. No Zakat
// deductible (BSC rules apply). *** LIMIT CONFLICT on the official
// page itself: the highlights say max Rs 5,000,000, the body says
// Rs 7,500,000 — the page states BOTH and does not pick one; the
// calculator does NOT enforce an SFWA maximum. ***
//
// WHT — general rule (Income Tax Ordinance 2001 s.151): 15% filer /
// 30% non-filer on DSC, RIC, SSC, SA. BSC/PBA/SFWA: no WHT collected
// at source. "Exempt from WHT" does NOT mean "tax-free": BSC/PBA
// profit must still be declared in the return — the page says so.
// Do NOT hard-code any 5% or 10% tax cap for BSC/PBA (secondary
// sources disagree) — no cap figure is published anywhere here.
//
// ZAKAT where it applies: 2.5% of the balance/value, deducted on
// 1 Ramadan if at or above the notified nisab (Rs 503,529 for Zakat
// year 1446-47 AH / 2026, Administrator General Zakat via SBP,
// 27 September 2026). Applies to DSC, SSC, SA; exempt for BSC, PBA,
// SFWA, RIC. For DSC/SSC the page says "as per rules" — no deduction
// date is invented.
export const NATIONAL_SAVINGS_RATES_EFFECTIVE = '21 October 2026';
export const NATIONAL_SAVINGS_SOURCE_CITATION =
  'Central Directorate of National Savings (CDNS), "Summary of NSS Profit Rates (in %age and amount), w.e.f. 21-Oct-2026" (savings.gov.pk/latest-profit-rates/); Savings Account unchanged at 10.00% since 26 May 2026; DSC per-year encashment table confirmed by two press reports of the CDNS schedule, 21 October 2026; withholding tax 15% filer / 30% non-filer (Income Tax Ordinance 2001, s.151); Zakat nisab Rs 503,529 for Zakat year 1446-47 AH / 2026 (Administrator General Zakat via SBP, 27 September 2026). Verified 13 November 2026.';
export const NATIONAL_SAVINGS_RATES_URL = 'https://savings.gov.pk/latest-profit-rates/';
export const NATIONAL_SAVINGS_SOURCE_STATUS =
  'Verified 13 November 2026 against the CDNS profit-rates summary w.e.f. 21 October 2026 (savings.gov.pk/latest-profit-rates/) and the official scheme pages. No November 2026 revision found as of 13 November 2026.';
export const NATIONAL_SAVINGS_LAST_CHECKED = '13 November 2026';

// REVIEW TRIPWIRE — last checked 13 November 2026. CDNS revises
// profit rates frequently (the last revision was 21 October 2026,
// only weeks before this check). Re-verify by 13 January 2027:
// re-open the CDNS rates page, check for any new revision, re-check
// the DSC table, the BSC maximum (product page vs stale FAQ) and the
// SFWA maximum conflict, and update NATIONAL_SAVINGS_LAST_CHECKED
// and this date.
export const NATIONAL_SAVINGS_NEXT_REVIEW = '2027-01-13';

/** Withholding tax on National Savings profit (s.151), fractions. */
export const NSS_WHT_FILER_RATE = 0.15;
export const NSS_WHT_NON_FILER_RATE = 0.3;
/** Zakat rate where it applies, fraction. */
export const NSS_ZAKAT_RATE = 0.025;
/** Notified Zakat nisab for Zakat year 1446-47 AH / 2026, Rs. */
export const NSS_ZAKAT_NISAB = 503529;

export type NationalSavingsSchemeId = 'dsc' | 'ric' | 'bsc' | 'pba' | 'ssc' | 'sa' | 'sfwa';

export interface NationalSavingsScheme {
  id: NationalSavingsSchemeId;
  /** Full scheme name, as CDNS names it. */
  name: string;
  /** Short label used in the selector and tables. */
  shortName: string;
  /** Headline rate, % p.a. For DSC this is the CDNS-stated rate; the
   *  operative schedule is DSC_ENCASHMENT_TABLE below. For SSC this
   *  is the first-five-periods rate; the 6th period differs. */
  ratePct: number;
  /** How the profit is paid. */
  frequency: 'monthly' | 'half-yearly' | 'annual' | 'on maturity only';
  /** Tenure / maturity. */
  tenure: string;
  /** Minimum investment, Rs. */
  minInvestment: number;
  /** Maximum investment, Rs, or null where there is none or where
   *  the official sources conflict (SFWA — see the header note). */
  maxInvestment: number | null;
  /** True when WHT is deducted at source (15% filer / 30%
   *  non-filer). False = no WHT collected at source. */
  whtApplies: boolean;
  /** Zakat position: 'deducted as per rules' | 'exempt' | 'applicable as per rules'. */
  zakat: string;
  /** Who can invest. */
  eligibility: string;
  /** Monthly profit per Rs 100,000, where the scheme pays monthly. */
  monthlyProfitPer100k: number | null;
}

/**
 * All seven National Savings schemes, at the CDNS rates w.e.f.
 * 21 October 2026 (Savings Account 10.00% since 26 May 2026).
 * Monthly figures per Rs 100,000 are the CDNS-stated amounts:
 * 12.12% = Rs 1,010/month; 12.96% = Rs 1,080/month.
 */
export const NATIONAL_SAVINGS_SCHEMES: NationalSavingsScheme[] = [
  {
    id: 'dsc',
    name: 'Defence Savings Certificates',
    shortName: 'DSC',
    ratePct: 11.94,
    frequency: 'on maturity only',
    tenure: '10 years',
    minInvestment: 500,
    maxInvestment: null,
    whtApplies: true,
    zakat: 'Deducted at source as per rules',
    eligibility: 'Any Pakistani citizen; no age or status restriction.',
    monthlyProfitPer100k: null,
  },
  {
    id: 'ric',
    name: 'Regular Income Certificates',
    shortName: 'RIC',
    ratePct: 12.12,
    frequency: 'monthly',
    tenure: '5 years',
    minInvestment: 50000,
    maxInvestment: null,
    whtApplies: true,
    zakat: 'Exempt',
    eligibility: 'Any Pakistani citizen; no age or status restriction.',
    monthlyProfitPer100k: 1010,
  },
  {
    id: 'bsc',
    name: 'Behbood Savings Certificates',
    shortName: 'BSC',
    ratePct: 12.96,
    frequency: 'monthly',
    tenure: '10 years',
    minInvestment: 5000,
    // Joint maximum; single-investor maximum is Rs 7,500,000.
    maxInvestment: 15000000,
    whtApplies: false,
    zakat: 'Exempt',
    eligibility:
      'Senior citizens 60+, single widows (while unmarried), disabled persons with the disability logo on the CNIC, and special minors via a guardian.',
    monthlyProfitPer100k: 1080,
  },
  {
    id: 'pba',
    name: "Pensioners' Benefit Account",
    shortName: 'PBA',
    ratePct: 12.96,
    frequency: 'monthly',
    tenure: '10 years',
    minInvestment: 10000,
    maxInvestment: 7500000,
    whtApplies: false,
    zakat: 'Exempt',
    eligibility:
      'Pensioners of federal, provincial and AJK governments, the armed forces, semi-government and autonomous bodies; an eligible family member after the pensioner\u2019s death. Private-sector / EOBI-only retirees do not qualify. Max 8 deposits, one account at a time.',
    monthlyProfitPer100k: 1080,
  },
  {
    id: 'ssc',
    name: 'Special Savings Certificates / Account',
    shortName: 'SSC / SSA',
    ratePct: 12.0,
    frequency: 'half-yearly',
    tenure: '3 years',
    minInvestment: 500,
    maxInvestment: null,
    whtApplies: true,
    zakat: 'Collected at source as per rules',
    eligibility: 'Any Pakistani citizen; no age or status restriction.',
    monthlyProfitPer100k: null,
  },
  {
    id: 'sa',
    name: 'Savings Account',
    shortName: 'SA',
    ratePct: 10.0,
    frequency: 'annual',
    tenure: 'No fixed tenure',
    minInvestment: 100,
    maxInvestment: null,
    whtApplies: true,
    zakat: 'Applicable as per rules',
    eligibility: 'Any Pakistani citizen; no age or status restriction. Withdrawals max 3 per week.',
    monthlyProfitPer100k: null,
  },
  {
    id: 'sfwa',
    name: 'Shuhada Family Welfare Account',
    shortName: 'SFWA',
    ratePct: 12.96,
    frequency: 'monthly',
    tenure: 'No fixed tenure stated',
    // No minimum investment is stated on the official SFWA page.
    minInvestment: 0,
    // No maximum is enforced: the official page itself conflicts —
    // highlights say Rs 5,000,000, the body says Rs 7,500,000.
    maxInvestment: null,
    whtApplies: false,
    zakat: 'No Zakat deductible (Behbood rules apply)',
    eligibility:
      'Eligible family member of a martyr — armed forces, law enforcement, or a civilian killed in a terrorist attack — who is a citizen of Pakistan; one account per family member. A Savings Account is mandatory for the monthly credit.',
    monthlyProfitPer100k: 1080,
  },
];

/**
 * DSC encashment table: cumulative profit as % of the amount
 * invested, by completed year held (CDNS schedule, w.e.f.
 * 21 October 2026). Year 10 = 215% profit, so Rs 100,000 becomes
 * Rs 315,000 at maturity. No profit at all if encashed before
 * 1 full year. Use this table — NOT a flat 11.94% compounding rate.
 */
export const DSC_ENCASHMENT_TABLE_PCT: number[] = [10, 21, 34, 49, 67, 88, 113, 142, 176, 215];
/** DSC tenure in years (the table's length). */
export const DSC_TENURE_YEARS = 10;
/** DSC CDNS-stated rate, % p.a. — labelled as such on the page. */
export const DSC_STATED_RATE_PCT = 11.94;

/** SSC half-yearly profit rates, % of the amount actually paid per
 *  period: the CDNS rates are 12.00% p.a. for the first five
 *  periods and 12.80% p.a. for the 6th, so each half-year pays half
 *  of that — 6.00% (Rs 6,000 per Rs 100,000) for the first five,
 *  6.40% (Rs 6,400) for the last. Total over the full 3 years:
 *  Rs 36,400 per Rs 100,000. */
export const SSC_HALF_YEAR_RATES_PCT: number[] = [6.0, 6.0, 6.0, 6.0, 6.0, 6.4];
/** SSC tenure in half-year periods (3 years). */
export const SSC_TENURE_HALF_YEARS = 6;

/** Monthly profit per Rs 100,000 at 12.96% p.a. (BSC, PBA, SFWA). */
export const NSS_MONTHLY_PER_100K_AT_12_96 = 1080;
/** Monthly profit per Rs 100,000 at 12.12% p.a. (RIC). */
export const NSS_MONTHLY_PER_100K_AT_12_12 = 1010;
