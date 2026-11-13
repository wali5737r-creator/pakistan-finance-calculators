// Pension / EOBI calculator — CONFIG, not hard-coded in page markup.
// Verified 2026-11-13 from the sources below. Every figure that is an
// estimate, a range, or second-hand is labelled as such on the page;
// nothing here is presented as a notified rate unless it was notified.
//
// SCOPE — EOBI ONLY. This calculator covers the Employees' Old-Age
// Benefits Institution only. Government-servant pension (GP Fund /
// commutation) is NOT verified to this site's standard and is NOT
// included; the page says so plainly.
//
// MINIMUM PENSION — Rs 11,500/month in force. History: Rs 8,500,
// then Rs 10,000 from 1 July 2023, then Rs 11,500 effective
// 1 January 2025 (15% increase; arrears paid from 1 September 2025).
// Sources: EOBI homepage "Pension Rates: Minimum Rs 11,500/=" and
// the National Assembly Standing Committee press release of
// 28 August 2025. Rs 10,000 is the SUPERSEDED old figure and the
// page says so. WARNING: no SRO/notification number for the
// Rs 11,500 increase was found — do NOT invent one; the page cites
// the NA press release + EOBI homepage and notes "notification
// number not traced". The Act's printed floor is Rs 2,000/month
// (Schedule para (2) proviso, Finance Act 2008) — superseded in
// practice by notification; Rs 11,500 is presented as the NOTIFIED
// minimum, not the printed floor.
//
// CONTRIBUTIONS — EOB Act 1976 s.9 (employer 5%) and s.9B
// (insured person 1%), 6% in total. The wage base is the NOTIFIED
// MINIMUM WAGE, not the worker's actual salary. Default base:
// ICT/federal Rs 40,700/month from 1 July 2026 (ICT Notification
// No. ADLW 8(20)-ICT/2024-934, 19 August 2026; EOBI Circular No.
// 01/2026-27, 20 August 2026 — the circular text itself was only
// seen second-hand, and the page says so if it cites it). Monthly
// on Rs 40,700: employer Rs 2,035, employee Rs 407, total Rs 2,442.
// Provincial presets: Sindh Rs 43,000 (from 1 July 2026), Punjab
// Rs 40,000 (from 1 July 2025), KP Rs 40,000 (2025-26), Balochistan
// Rs 37,000 (July 2024) — each labelled with its date, and the user
// can type their own contribution wage. UNRESOLVED tension: whether
// EOBI bills provincially or on the ICT rate nationally — the page
// presents the presets as "the wage your contributions were paid
// on" and claims no single national rule. There is NO maximum-wage
// cap (the minimum-wage base IS the cap). Coverage: establishments
// with 5+ employees (s.1(4)).
//
// FORMULA — Schedule to the EOB Act 1976 (as amended 2002):
// monthly pension = average monthly wage x years of insurable
// employment / 50, i.e. 2% per year. Averaging period: the 12
// calendar months immediately before qualifying (Schedule para
// (2)). Rounding: 6+ months counts as a full year (Schedule para
// (1)). Minimum service 15 years (s.22(1)(b)). Worked examples on
// Rs 40,700: 15 yrs Rs 12,210; 20 yrs Rs 16,280; 25 yrs Rs 20,350;
// 30 yrs Rs 24,420; 40 yrs Rs 32,560. There is NO fixed maximum
// pension ("As Per Formula" per EOBI) — the reported Rs 32,000
// Senate-briefing figure is NOT printed as a cap. The 15% uplift
// of 2025 was for pensions already in payment; new awards are NOT
// multiplied by 1.15 — the page says so plainly. (The Schedule's
// own 15% item, para (3), is a 2008 historical increase for
// pensions being paid on or before 1 July 2008, not the 2025 one.)
//
// RETIREMENT AGES — 60 men / 55 women (s.22(1)(a)); miners 55 if
// 10+ years in mining immediately before retirement. Reduced /
// early pension s.22(2C)-(2E), RE-CHECKED against the Pakistan Code
// text at build time (13 November 2026) and CONFIRMED: retire
// before 60 (55 women) but after 55 (50 women), where the employer
// has a definite established retirement age below 60/55 and
// certifies superannuation, and contributions were paid for the
// required period; pension reduced 0.5% per completed month short
// of 60/55 (s.22(2D)), the minimum pension cut the same way, and
// the reduction is FOR LIFE, not restored at normal pension age
// (s.22(2E)).
//
// OLD-AGE GRANT (s.22A, confirmed against Pakistan Code): 2 to
// under 15 years of service at pension age (60/55) and not
// otherwise entitled to a pension — lump sum of one month's average
// wage per completed year (6+ months counts). E.g. 8 yrs at
// Rs 40,700 = Rs 325,600 once.
//
// SURVIVOR'S PENSION (s.22B, RE-CHECKED against the Pakistan Code
// text at build time, 13 November 2026): s.22B(1) — death while in
// insurable employment after not less than 36 months' contributions:
// surviving spouse gets a life pension "at the rate specified in
// the Schedule". s.22B(1A) — death out of insurable employment
// after 5+ years: same. s.22B(2) — death of a person already
// entitled to an old-age or invalidity pension: spouse gets a life
// pension EQUAL TO the pensioner's pension. s.22B(3)/(3A)/(4) —
// after the spouse's death, minor children share equally (sons to
// 18; daughters to 18 or marriage); if no spouse or minor children,
// parents get it for 5 years.
//   *** DISCREPANCY FOUND BY THE RE-CHECK, stated on the page: ***
//   The Schedule para (1) calculates the survivor's pension by the
//   SAME formula as the old-age pension (wage x years / 50), with
//   the notified minimum as the floor — it does NOT say "the
//   minimum pension only". EOBI's own published pension-rates
//   summary describes the survivor's pension as the minimum
//   pension. This calculator follows the Act: formula amount,
//   never below the Rs 11,500 notified minimum — and the page tells
//   the user to confirm the actual amount with EOBI, because the
//   two sources point different ways. Do NOT present "spouse gets
//   exactly Rs 11,500" as the Act's rule.
//
// INVALIDITY PENSION (s.23, confirmed against Pakistan Code):
// same Schedule formula; qualifies if under 60/55 and (a) 15+
// years' contributions, or (b) 5+ years since entry into insurable
// employment and 3+ years in the 5 years before invalidity.
// Payable while invalidity continues; for life after 5 continuous
// years or on reaching pension age (s.23(3)).
//
// FCC RULING: 14.5 years counts as 15 (rounding-off proviso; FCC
// dismissed EOBI's appeals, Dec 2025/Jan 2026 — do not print a
// single judgment date). In practice this is the same as the
// Schedule's 6-months-counts-as-a-year rule applied at 14.5.
//
// NOT INCLUDED: any funeral / death grant — no verified figure
// exists. Government-servant pension — not verified, out of scope.
export const PENSION_YEAR = '2026';
export const PENSION_SOURCE_CITATION =
  "Employees' Old-Age Benefits Act, 1976 (Act XIV of 1976), ss. 9, 22, 22A, 22B, 23 and the Schedule (formula: average monthly wages × years ÷ 50; averaging over last 12 months; 6+ months counts as a year); minimum pension Rs 11,500/month from 1 January 2025 (was Rs 10,000; 15% increase, arrears from 1 September 2025 — NA Standing Committee press release 28 Aug 2025; EOBI homepage); contributions 5% employer + 1% employee of the notified minimum wage; ICT minimum wage Rs 40,700/month from 1 July 2026 (Notification No. ADLW 8(20)-ICT/2024-934, 19 Aug 2026; EOBI Circular No. 01/2026-27, 20 Aug 2026); FCC rounding-off ruling (14½ years counts as 15), Dec 2025/Jan 2026. Notification number for the Rs 11,500 minimum not traced. Verified 13 November 2026.";
export const EOBI_HOMEPAGE_URL = 'http://www.eobi.gov.pk/';
export const NA_PRESS_RELEASE_URL = 'https://na.gov.pk/en/pressrelease_detail.php?id=7183';
export const PAKISTAN_CODE_EOB_ACT_URL =
  'https://pakistancode.gov.pk/pdffiles/administratorf3be1ec8d21dfebb9c5d1733f43cffe6.pdf';
export const PENSION_SOURCE_STATUS =
  'Verified 13 November 2026 against the Employees\' Old-Age Benefits Act, 1976 (Pakistan Code text), the EOBI homepage pension rates, and the National Assembly Standing Committee press release of 28 August 2025';
export const PENSION_LAST_CHECKED = '13 November 2026';

// REVIEW TRIPWIRE — last checked 13 November 2026. The minimum
// pension is set by notification and can change at any budget; the
// ICT minimum wage is normally revised each July; the FCC rounding
// ruling is recent (Dec 2025/Jan 2026). Re-verify by 1 February
// 2027: check the EOBI homepage pension rates, look for a new
// minimum-pension notification (and its number, still untraced),
// re-check the ICT/provincial minimum wages, and update
// PENSION_LAST_CHECKED and this date.
export const PENSION_NEXT_REVIEW = '2027-02-01';

/** Notified minimum pension, Rs/month, from 1 January 2025. */
export const EOBI_MINIMUM_PENSION = 11500;
/** Superseded minimum pension, Rs/month (was in force to 31 Dec 2024). */
export const EOBI_PREVIOUS_MINIMUM_PENSION = 10000;
/** Printed floor in the Schedule para (2) proviso (Finance Act
 *  2008) — superseded in practice by notification; shown on the
 *  page for honesty, never used as the floor. */
export const EOBI_PRINTED_MINIMUM_PENSION = 2000;

/** Contribution rates, fractions of the contribution wage. */
export const EOBI_EMPLOYER_RATE = 0.05;
export const EOBI_EMPLOYEE_RATE = 0.01;
export const EOBI_TOTAL_RATE = 0.06;

/** Schedule formula divisor: pension = wage x years / 50 (2% a year). */
export const EOBI_FORMULA_DIVISOR = 50;
/** Minimum service for an old-age pension, years (s.22(1)(b)). */
export const EOBI_MIN_SERVICE_YEARS = 15;
/** Old-age grant: service from 2 years up to (not including) 15. */
export const EOBI_GRANT_MIN_YEARS = 2;
/** Survivor's pension: 36 months (3 years) in insurable employment. */
export const EOBI_SURVIVOR_MIN_YEARS_IN_SERVICE = 3;
/** Survivor's pension: 5 years if death out of insurable employment. */
export const EOBI_SURVIVOR_MIN_YEARS_OUT_OF_SERVICE = 5;
/** Invalidity: 5 years since entry, 3 of them in the last 5 years. */
export const EOBI_INVALIDITY_MIN_YEARS_SINCE_ENTRY = 5;
export const EOBI_INVALIDITY_MIN_YEARS_IN_LAST_FIVE = 3;

/** Normal pension ages (s.22(1)(a)). */
export const EOBI_PENSION_AGE_MEN = 60;
export const EOBI_PENSION_AGE_WOMEN = 55;
/** Miners: pension age reduced by 5 years after 10+ years mining. */
export const EOBI_MINER_AGE_REDUCTION = 5;
export const EOBI_MINER_MIN_MINING_YEARS = 10;
/** Reduced pension (s.22(2D)): 0.5% cut per completed month short. */
export const EOBI_REDUCTION_PER_MONTH = 0.005;
/** Earliest reduced-pension age: 55 men / 50 women (s.22(2C)). */
export const EOBI_EARLY_PENSION_AGE_MEN = 55;
export const EOBI_EARLY_PENSION_AGE_WOMEN = 50;

/** Contribution-wage presets: the notified minimum wage the
 *  contributions were paid on. Each is labelled with its date on
 *  the page; the user can type any wage instead. Whether EOBI
 *  bills provincially or on the ICT rate nationally is UNRESOLVED
 *  — the page does not claim one national rule. */
export interface PensionWagePreset {
  label: string;
  wage: number;
  /** When this wage took effect, as shown on the page. */
  since: string;
}

export const PENSION_WAGE_PRESETS: PensionWagePreset[] = [
  { label: 'ICT / federal', wage: 40700, since: 'from 1 July 2026' },
  { label: 'Sindh', wage: 43000, since: 'from 1 July 2026' },
  { label: 'Punjab', wage: 40000, since: 'from 1 July 2025' },
  { label: 'Khyber Pakhtunkhwa', wage: 40000, since: '2025-26' },
  { label: 'Balochistan', wage: 37000, since: 'from July 2024' },
];

/** Default contribution wage, Rs/month (ICT/federal). */
export const PENSION_DEFAULT_WAGE = 40700;
