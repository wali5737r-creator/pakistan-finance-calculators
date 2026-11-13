// OGRA domestic gas sale price (system gas) — CONFIG, not hard-coded
// in page markup. Verified 2026-11-13 from the SSGC official Domestic
// Rates page (updated 22 August 2025) and cross-checked against the
// SNGPL Domestic Bill Estimator, which shows identical slabs. The
// SNGPL estimator's fixed-charge footnote is STALE (pre-July-2025) and
// must not be used — the fixed charges below are the post-July-2025
// figures from the SSGC page.
// Authority: OGRA Gas Sale Price Notification dated 29 June 2025,
// effective 1 July 2025. Consumer tariffs are frozen for FY 2026-27,
// so this notification is still in force. No SRO/notification number
// is printed anywhere on this site: the OGRA PDF was unreadable, so
// the number is UNVERIFIED and must not be invented.
// Rates are Rs per MMBTU. 1 hm3 = 100 m3 (the meter reads in m3).
// MMBTU = hm3 x GCV / 281.7385 x PCF (GCV default 990 BTU/SCF, PCF
// default 1.00). At GCV 990, 1 hm3 = 3.5139 MMBTU; the rounded 3.5
// factor is shown on the page only as a labelled estimate.
// Slab rule ("one preceding slab benefit"): consumption up to the
// previous slab's boundary bills at the previous slab's rate; only the
// excess bills at the landed slab's rate. Above 4 hm3 there is NO
// benefit — the entire consumption bills at Rs 4,200/MMBTU. This
// slab-split method is the standard applied interpretation of OGRA's
// "one preceding slab" rule, and the page says so.
// Protected status: average consumption of the last 4 winter months
// (Nov-Feb) of 0.9 hm3/month or less = protected; otherwise
// non-protected. Protected slabs end at 0.90 hm3 — a protected
// consumer using more than that in a month is outside the protected
// table, so the calculator asks for the non-protected category.
// There is NO lifeline slab for gas, and no rupee minimum-bill figure
// is implemented: the official rule ("calculated at the first tariff
// slab of each category") has no verified rupee amount. WHT, TV fee
// (Rs 35) and GIDC are NOT included. Scope is domestic system gas
// only — new domestic connections are RLNG-only (monthly USD tariff)
// and are not priced on these slabs.
export const GAS_TARIFF_YEAR = '2025';
export const GAS_SOURCE_CITATION =
  'OGRA Gas Sale Price Notification dated 29 June 2025, effective 1 July 2025 — domestic (protected and non-protected) gas sale price, still in force (consumer tariffs frozen for FY 2026-27)';
export const SSGC_DOMESTIC_RATES_URL = 'https://www.ssgc.com.pk/web/?page_id=103';
export const OGRA_CONSUMER_PRICES_URL = 'https://www.ogra.org.pk/consumer-gas-prices';
export const SNGPL_BILL_ESTIMATOR_URL = 'https://www.sngpl.com.pk/billcalc.jsp?mdids=92';
export const GAS_SOURCE_STATUS = 'Verified 13 November 2026 against the SSGC official Domestic Rates page (updated 22 August 2025), cross-checked against the SNGPL Domestic Bill Estimator (identical slabs)';
export const GAS_LAST_CHECKED = '13 November 2026';

// REVIEW TRIPWIRE — tariff last checked 13 November 2026. OGRA's
// consumer tariffs are frozen for FY 2026-27, but a new notification
// is likely around July 2027, and protected status turns on the
// November-February winter months — so re-verify BEFORE the next
// winter, hence 1 October 2027. On this date check the OGRA consumer
// gas prices page and the SSGC domestic rates page for a new
// notification, and if anything changed update the slabs, fixed
// charges, GST rate, GAS_LAST_CHECKED and this date.
export const GAS_NEXT_REVIEW = '2027-10-01';

/** General sales tax on gas bills, applied to the subtotal of gas
 *  charge + fixed charge + meter rent. This 18% is the standard rate
 *  corroborated by real bills, not stated on an official page — the
 *  page labels the GST line "18% (standard rate — confirm against
 *  your bill)". */
export const GAS_GST_RATE = 0.18;
/** Meter rent for a normal domestic meter, Rs per month. */
export const GAS_METER_RENT = 40;
/** Fixed charge for protected consumers, Rs per month. */
export const GAS_PROTECTED_FIXED_CHARGE = 600;
/** Fixed charge for non-protected consumers up to 1.5 hm3, Rs/month. */
export const GAS_NON_PROTECTED_FIXED_CHARGE_LOW = 1500;
/** Fixed charge for non-protected consumers above 1.5 hm3, Rs/month. */
export const GAS_NON_PROTECTED_FIXED_CHARGE_HIGH = 3000;
/** The consumption boundary (hm3) above which the higher
 *  non-protected fixed charge applies. */
export const GAS_FIXED_CHARGE_BOUNDARY_HM3 = 1.5;

/** Divisor in the MMBTU conversion: MMBTU = hm3 x GCV / 281.7385 x PCF. */
export const MMBTU_DIVISOR = 281.7385;
/** Default gross calorific value, BTU per standard cubic foot. */
export const GAS_DEFAULT_GCV = 990;
/** Default pressure correction factor. */
export const GAS_DEFAULT_PCF = 1.0;
/** Rounded MMBTU per hm3 (3.5) — shown on the page ONLY as a labelled
 *  estimate. The calculator uses the exact conversion (3.5139 at GCV
 *  990). */
export const ROUNDED_MMBTU_PER_HM3 = 3.5;

export interface GasSlab {
  /** Upper bound of the band (inclusive), in hm3. null = open-ended. */
  upTo: number | null;
  /** Gas sale price, Rs per MMBTU. */
  ratePerMmbtu: number;
}

/** Protected: average winter (Nov-Feb) consumption of 0.9 hm3/month
 *  or less. Slabs end at 0.90 hm3. */
export const PROTECTED_GAS_SLABS: GasSlab[] = [
  { upTo: 0.25, ratePerMmbtu: 200 },
  { upTo: 0.5, ratePerMmbtu: 250 },
  { upTo: 0.6, ratePerMmbtu: 300 },
  { upTo: 0.9, ratePerMmbtu: 350 },
];

/** Non-protected: above 4 hm3 the whole consumption bills at
 *  Rs 4,200/MMBTU with no preceding-slab benefit. */
export const NON_PROTECTED_GAS_SLABS: GasSlab[] = [
  { upTo: 0.25, ratePerMmbtu: 500 },
  { upTo: 0.6, ratePerMmbtu: 850 },
  { upTo: 1.0, ratePerMmbtu: 1250 },
  { upTo: 1.5, ratePerMmbtu: 1450 },
  { upTo: 2.0, ratePerMmbtu: 1900 },
  { upTo: 3.0, ratePerMmbtu: 3300 },
  { upTo: 4.0, ratePerMmbtu: 3800 },
  { upTo: null, ratePerMmbtu: 4200 },
];
