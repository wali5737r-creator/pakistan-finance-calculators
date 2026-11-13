// Freelancer / non-salaried tax — CONFIG, not hard-coded in page markup.
// Verified 2026-11-13 from the task spec (Finance Act 2026 Gazette,
// FBR Circular No. 02 of 2026-27, FBR withholding-tax rate card 2027).
//
// NON-SALARIED SLABS — clause (1), Division I, Part I, First Schedule,
// Income Tax Ordinance 2001, as substituted by Finance Act 2024.
// Finance Act 2026 s.5(44)(a)(i) substituted ONLY the salaried
// clause (2) table — the non-salaried clause (1) table is UNCHANGED
// by Finance Act 2026. Applies to individuals and AOPs except
// salaried individuals (the 75% salary test decides). This calculator
// covers individual freelancers / sole proprietors ONLY — the AOP
// professional-firm 40% top-rate cap is OUT of scope and is not
// applied here (the page says so).
//
// SURCHARGE s.4AB: 10% of the tax where taxable income EXCEEDS
// Rs 10,000,000 (non-salaried/AOP only). At exactly Rs 10m there is
// NO surcharge. The 9% salaried surcharge was withdrawn by Finance
// Act 2026 s.5(2)(b) — it does not apply here either.
//
// EXPORT TAX s.154A, Division IVA Part III First Schedule, TY2024–
// TY2029 (extended to TY2029 by Finance Act 2026, FBR Circular 02
// para 30): PSEB-registered IT/ITeS exporters pay 0.25% of GROSS
// export proceeds; all other s.154A cases pay 1%. Final tax on gross
// proceeds when conditions are met (return filed, withholding
// statements filed if required) — export income is then EXCLUDED
// from the slab calculation entirely (s.169): not added to local
// income, no expenses deductible against it. If the return is NOT
// filed, finality is lost: export income is taxed under the normal
// non-salaried slabs, with the bank deduction (0.25%/1%) credited
// against it. s.154A rates are NOT doubled for non-filers (Rule
// 10(ca), Tenth Schedule expressly excludes s.154A). No "80% through
// banking channels" rule applies (s.65F repealed). s.153 local-client
// withholding, super tax s.4C, minimum tax s.113 and s.154B
// social-media tax are NOT included (s.154B is a different regime).
// PSEB registration: portal.techdestination.com — new freelancer
// Rs 1,000, renewal Rs 2,000/year; annual; gateway to 0.25%, not
// legally mandatory to export.
import type { TaxSlab } from './tax';

export const FREELANCER_TAX_YEAR = '2026-27';
export const FREELANCER_SOURCE_CITATION =
  'Finance Act, 2026 (Act No. XLIII of 2026), Gazette of Pakistan, Extraordinary, Part I, 26 June 2026, No. F.22(46)/2026-Legis.; non-salaried table per clause (1), Division I, Part I, First Schedule to the Income Tax Ordinance, 2001 as substituted by Finance Act 2024; FBR Circular No. 02 of 2026-27 (8 September 2026) para 8 (10% surcharge continues) and para 30 (s.154A extended to TY2029)';
export const FREELANCER_GAZETTE_URL = 'http://na.gov.pk/uploads/documents/6a422720f05a0_626.pdf';
export const FBR_RATE_CARD_URL = 'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf';
export const FBR_CIRCULAR_02_URL = 'https://www.fbr.gov.pk/Downloads/?id=90590&Type=Docs';
export const PSEB_PORTAL_URL = 'https://portal.techdestination.com';
export const FREELANCER_SOURCE_STATUS =
  'Verified 13 November 2026 against the Finance Act 2026 Gazette, FBR Circular No. 02 of 2026-27 and the FBR withholding-tax rate card 2027';
export const FREELANCER_LAST_CHECKED = '13 November 2026';

// REVIEW TRIPWIRE — same Finance Act cycle as the salaried tax: the
// tax year 2026-27 ends 30 June 2027 and the next Finance Act is
// normally passed in June. Re-verify by 1 May 2027: read the new
// Finance Act, re-check the non-salaried slabs and the s.154A rates
// row-by-row against the Gazette, and update BEFORE the old figures
// expire on 30 June 2027.
export const FREELANCER_NEXT_REVIEW = '2027-05-01';

/** Non-salaried slabs, clause (1). Same TaxSlab shape as tax.ts. */
export const NON_SALARIED_SLABS: TaxSlab[] = [
  { upTo: 600000, rate: 0, baseTax: 0 },
  { upTo: 1200000, rate: 0.15, baseTax: 0 },
  { upTo: 1600000, rate: 0.2, baseTax: 90000 },
  { upTo: 3200000, rate: 0.3, baseTax: 170000 },
  { upTo: 5600000, rate: 0.4, baseTax: 650000 },
  { upTo: null, rate: 0.45, baseTax: 1610000 },
];

export const NON_SALARIED_SLAB_LOWER_BOUNDS = [0, 600000, 1200000, 1600000, 3200000, 5600000];

/** s.4AB surcharge: 10% of the tax, only where taxable income
 *  EXCEEDS Rs 10,000,000. At exactly Rs 10m, no surcharge. */
export const SURCHARGE_THRESHOLD = 10000000;
export const SURCHARGE_RATE = 0.1;

/** s.154A export tax on gross export proceeds. */
export const PSEB_EXPORT_RATE = 0.0025;
export const NON_PSEB_EXPORT_RATE = 0.01;
/** PSEB registration fees, Rs. */
export const PSEB_NEW_REGISTRATION_FEE = 1000;
export const PSEB_RENEWAL_FEE = 2000;
