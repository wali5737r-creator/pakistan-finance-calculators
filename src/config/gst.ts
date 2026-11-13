// GST Calculator — CONFIG, not hard-coded in page markup.
// Verified 13 November 2026 from the sources below. Every figure
// that is a proposal, a conflict, or second-hand is labelled as such
// on the page; nothing here is presented as settled unless FBR (or
// the Act itself) says so.
//
// STANDARD RATE — 18% on taxable supplies of goods and imports,
// Sales Tax Act 1990 s.3(1). History: 17% -> 18% in February 2023
// (Finance (Supplementary) Act 2023). Finance Act 2026 (Act No.
// XLIII of 2026, in force 1 July 2026) did NOT change it —
// corroborated by FBR Sales Tax General Order No. 8 of 2026
// (2 July 2026, worked example "Retail Price Rs 36.37 + Sales Tax
// Rs 6.55 (18%) = Total Rs 42.92") and FBR Circular No. 01 of 2026
// (11 September 2026). FBR Act PDF (as amended up to 23 February
// 2023 — no post-30 June 2026 consolidated text was retrievable;
// see the GAP note below):
// https://download1.fbr.gov.pk/Docs/2023371732748541SalesTaxAct,1990withIndexupdatedupto23.02.2023.pdf
//
// FORMULAS (standard treatment): Add — total = price x 1.18;
// GST = price x 0.18. Remove — price excl. tax = inclusive / 1.18;
// GST = inclusive - (inclusive / 1.18). Taking 18% of the inclusive
// price gives the WRONG answer (Rs 118,000 x 18% = Rs 21,240 is
// wrong; correct GST is Rs 18,000) — the page warns about this.
// Third Schedule goods: 18% is charged on the PRINTED RETAIL
// PRICE, not the transaction value (s.3(2)(a)); Finance Act 2026
// expanded the Third Schedule (~20 new groups, serials 56-75).
//
// ZERO-RATED (0%) — s.4 + Fifth Schedule: exports, stores and
// provisions for conveyances going abroad, supplies to diplomats
// and missions, EPZ manufacture inputs, Duty and Tax Remission
// Rules supplies to exporters, Gwadar SEZ / Free Zone, qualified
// investments (FIPA 2022), petroleum crude oil. Zero-rated =
// taxable at 0% AND input tax is refundable (s.10). WARNING:
// several older Fifth Schedule entries were omitted by Finance
// Acts 2021/2022 — older zero-rated lists are unreliable.
//
// EXEMPT (no tax) — s.13(1) + Sixth Schedule: rice, wheat,
// wheat/meslin flour, pulses and cereals; fresh vegetables and
// fruits; live animals and poultry; uncooked meat; eggs; milk
// (excluding specified packaged/branded forms); unbranded
// yogurt, butter, desi ghee and cheese; bread, naan, chapatti;
// Holy Quran and holy books; newsprint, books, magazines
// (magazines added by Finance Act 2026); seeds for sowing;
// fertilisers EXCLUDING DAP; pesticides; sugar cane; wheelchairs,
// dialysis equipment, artificial body parts; dextrose and saline
// infusion sets; wheat/rice bran (new serial 27A, Finance Act
// 2026); contraceptives (restored); tampons (serial 183 — see GAP
// note). CONDITION WARNING: many foods lose the exemption once
// sold under a brand name or in retail packing — the page must NOT
// present "food = exempt" unconditionally. Exempt = no tax charged
// AND input tax cannot be claimed (s.8) — the opposite of
// zero-rated on the input-tax point. MEDICINES ARE NOT EXEMPT
// (registered drugs are 1% — see below).
//
// REDUCED RATES — Eighth Schedule, s.3(2)(aa); conditions usually
// "no input-tax adjustment":
// 1% — drugs/substances registered as drugs under the Drugs Act
// 1976 (serial 81); locally made/assembled electric vehicles
// including CBU electric buses with 25+ seats and electric trucks
// (serials 71, 80; extended to 30 June 2027 by Finance Act 2026).
// 3% — locally made jewellery of gold/precious metal (CONFLICT:
// an FBR POS page gives a different formula — 1.5% of gold value
// + 0.5% diamond + 3% making charges — so 3% is presented here
// as "as listed", not settled).
// 5% — DAP fertiliser (serial 83); second-hand/worn clothing and
// footwear. A generic "5% on certain items" preset is NOT verified
// — only DAP, second-hand clothing, and the s.3(9) retailer levy
// below are verified 5%.
// 5%/7.5% — small (non-Tier-1) retailers via the monthly
// electricity bill, s.3(9): 5% on a bill up to Rs 20,000, 7.5%
// above it.
// 10% — imported laptops/notebooks/PCs, tractors, solar panels
// (PV cells/modules), poultry/cattle feed, pens, pencils,
// erasers, sharpeners, geometry boxes, colour sets, bun and rusk
// (except Tier-1 bakeries). Individual serial numbers for
// tractors/laptops/solar panels were not individually confirmed
// (solar = entry 90 per LookupTax).
// 12% — transitional rate for qualifying industrial activity in
// former FATA/PATA: 10% in FY2025-26, 12% from 1 July 2026,
// rising 2pp a year to 16% by June 2029.
// 25% — imported mobile phones above US$500 (Ninth Schedule;
// 18% up to US$500); locally manufactured motor vehicles above
// 1,400cc or Rs 40 lakh (SRO 297(I)/2023) — BUT locally made
// hybrids up to 2,000cc were removed from 25% by SRO
// 1525(I)/2026 (13 September 2026) and are back at 18%.
//
// FURTHER TAX — s.3(1A): +4% on supplies to unregistered /
// non-active-taxpayer buyers, in addition to the rate. Effective
// standard-rate supply to an unregistered buyer = 22%.
// VALUE-ADDITION TAX — Twelfth Schedule: +3% on commercial
// imports, effective 21% at import; manufacturers importing for
// their own use are excluded. WITHHOLDING — 2% on digitally
// ordered goods (s.3(3)(c) + Eleventh Schedule serial 8; Finance
// Act 2026 made it adjustable for sellers with turnover above
// Rs 200m) — mentioned only in FAQ/copy, NOT built into the
// calculator.
//
// SERVICES — NOT goods presets: Punjab 16%, Sindh/KP/Balochistan/
// Islamabad 15%, telecom 19.5% — secondary sources only, and the
// Punjab 2026-27 rate was "not confirmed" as at 29 September
// 2026. Services rates are mentioned in the rates table/FAQ with
// a "check with the provincial authority" note, never offered as
// calculator presets.
//
// GAPS — stated plainly on the page, not filled:
// (1) No post-30 June 2026 consolidated FBR Act text was
// retrievable (FBR PDF only "as amended up to 23 Feb 2023") —
// rates rest on FBR Circular No. 01 of 2026 + secondary
// compilations as amended to 30 June 2026; re-check against
// FBR's updated Act PDF once posted.
// (2) Stationery 10% -> 18% was a June 2026 PROPOSAL;
// post-enactment listings (12 November 2026) still show 10% —
// keep 10%, do NOT present the rise as fact.
// (3) Sanitary pads vs tampons: the Circular grants exemption to
// "tampon" (serial 183) and says pads are taxable at the standard
// rate before that sentence — whether pads are also exempt is
// UNCONFIRMED; listed as "tampons (pads — wording unclear)".
// (4) PHEV 18% vs 25% unresolved — not presented as settled.
// (5) Individual Eighth Schedule serial numbers for tractors,
// laptops and solar panels not individually confirmed.
// (6) No generic "5% on certain items" preset is verified.
export const GST_STANDARD_RATE = 0.18;
/** Standard GST rate, % — Sales Tax Act 1990 s.3(1). */
export const GST_STANDARD_RATE_PCT = 18;
/** Further tax on supplies to unregistered / non-active buyers, s.3(1A). */
export const GST_FURTHER_TAX_RATE = 0.04;
export const GST_FURTHER_TAX_RATE_PCT = 4;
/** Value-addition tax on commercial imports, Twelfth Schedule. */
export const GST_IMPORT_VALUE_ADDITION_RATE_PCT = 3;
export const GST_LAST_CHECKED = '13 November 2026';
export const GST_SOURCE_CITATION =
  'Sales Tax Act 1990, s.3(1) (standard rate 18%), s.3(1A) (further tax 4%), s.3(2)(a) (Third Schedule retail price), s.3(2)(aa) + Eighth Schedule (reduced rates), s.4 + Fifth Schedule (zero-rated), s.13(1) + Sixth Schedule (exempt), Ninth Schedule (mobile phones), Twelfth Schedule (commercial imports 3%); Finance Act 2026 (Act No. XLIII of 2026, in force 1 July 2026) did not change the 18% standard rate — FBR Sales Tax General Order No. 8 of 2026 (2 July 2026) and FBR Circular No. 01 of 2026 (11 September 2026); hybrids up to 2,000cc back to 18% by SRO 1525(I)/2026 (13 September 2026). Verified 13 November 2026.';
export const GST_SOURCE_URL =
  'https://download1.fbr.gov.pk/Docs/2023371732748541SalesTaxAct,1990withIndexupdatedupto23.02.2023.pdf';
export const GST_SOURCE_STATUS =
  'Verified 13 November 2026 against FBR Circular No. 01 of 2026 (11 September 2026), FBR Sales Tax General Order No. 8 of 2026 (2 July 2026) and secondary compilations as amended to 30 June 2026. No post-30 June 2026 consolidated FBR Act text was retrievable — the FBR Act PDF is "as amended up to 23 February 2023"; re-check against FBR\'s updated Act PDF once posted.';

// REVIEW TRIPWIRE — last checked 13 November 2026. Re-verify by
// 1 May 2027, before Finance Act 2027: re-open the FBR Act PDF
// (look for a post-30 June 2026 consolidated text), re-check the
// standard rate, the FATA/PATA transitional rate (12% from
// 1 July 2026, rising 2pp a year), the EV 1% extension (to
// 30 June 2027), the stationery proposal, the pads/tampons wording
// and the PHEV position, and update GST_LAST_CHECKED and this date.
export const GST_NEXT_REVIEW = '2027-05-01';

export interface GstPreset {
  id: string;
  /** Label shown in the rate selector. */
  label: string;
  /** Rate, % — null means exempt (no tax at all). */
  ratePct: number | null;
  /** 'standard' | 'zero-rated' | 'exempt' | 'reduced'. */
  category: 'standard' | 'zero-rated' | 'exempt' | 'reduced';
  /** Short basis note shown under the selector and in the table. */
  basis: string;
}

/**
 * Verified GST rate presets. The 3% jewellery rate is listed "as
 * listed" — an FBR POS page gives a different formula (see the
 * header note). There is no generic "5% on certain items" preset:
 * only DAP, second-hand clothing/footwear and the s.3(9) retailer
 * levy are verified 5%.
 */
export const GST_PRESETS: GstPreset[] = [
  {
    id: 'standard-18',
    label: 'Standard rate — 18%',
    ratePct: 18,
    category: 'standard',
    basis: 'Sales Tax Act 1990 s.3(1). Most taxable goods and imports. Unchanged by Finance Act 2026.',
  },
  {
    id: 'zero-rated',
    label: 'Zero-rated — 0%',
    ratePct: 0,
    category: 'zero-rated',
    basis: 's.4 + Fifth Schedule. Taxable at 0% — input tax is refundable (s.10). Mainly exports.',
  },
  {
    id: 'exempt',
    label: 'Exempt — no tax',
    ratePct: null,
    category: 'exempt',
    basis: 's.13(1) + Sixth Schedule. No tax charged and input tax cannot be claimed (s.8).',
  },
  {
    id: 'drugs-1',
    label: 'Registered drugs — 1%',
    ratePct: 1,
    category: 'reduced',
    basis: 'Eighth Schedule serial 81. Drugs/substances registered as drugs under the Drugs Act 1976. Usually no input-tax adjustment.',
  },
  {
    id: 'ev-1',
    label: 'Electric vehicles (local) — 1%',
    ratePct: 1,
    category: 'reduced',
    basis: 'Eighth Schedule serials 71, 80. Locally made/assembled EVs, incl. CBU electric buses (25+ seats) and electric trucks. Extended to 30 June 2027 by Finance Act 2026.',
  },
  {
    id: 'jewellery-3',
    label: 'Gold jewellery (local) — 3% (as listed)',
    ratePct: 3,
    category: 'reduced',
    basis: 'Eighth Schedule, as listed. An FBR POS page gives a different formula (1.5% of gold value + 0.5% diamond + 3% making charges), so 3% is shown as listed, not settled.',
  },
  {
    id: 'dap-5',
    label: 'DAP fertiliser — 5%',
    ratePct: 5,
    category: 'reduced',
    basis: 'Eighth Schedule serial 83. Note: other fertilisers are exempt (Sixth Schedule) — DAP is the exception.',
  },
  {
    id: 'second-hand-5',
    label: 'Second-hand clothing & footwear — 5%',
    ratePct: 5,
    category: 'reduced',
    basis: 'Eighth Schedule. Second-hand/worn clothing and footwear.',
  },
  {
    id: 'retailer-5-75',
    label: 'Small retailer (electricity bill) — 5% / 7.5%',
    ratePct: 5,
    category: 'reduced',
    basis: 's.3(9). Non-Tier-1 retailers pay through the monthly electricity bill: 5% on a bill up to Rs 20,000, 7.5% above it. The calculator uses 5% for this preset — check the bill amount for the 7.5% band.',
  },
  {
    id: 'reduced-10',
    label: 'Laptops, tractors, solar, stationery — 10%',
    ratePct: 10,
    category: 'reduced',
    basis: 'Eighth Schedule. Imported laptops/notebooks/PCs, tractors, solar panels (PV cells/modules), poultry/cattle feed, pens/pencils/erasers/sharpeners/geometry boxes/colour sets, bun and rusk (except Tier-1 bakeries). Stationery 10% -> 18% was only a June 2026 proposal — listings still show 10%.',
  },
  {
    id: 'fata-pata-12',
    label: 'Former FATA/PATA industry — 12%',
    ratePct: 12,
    category: 'reduced',
    basis: 'Transitional rate for qualifying industrial activity in former FATA/PATA: 10% in FY2025-26, 12% from 1 July 2026, rising 2pp a year to 16% by June 2029.',
  },
  {
    id: 'luxury-25',
    label: 'Imported phones over US$500 / large local vehicles — 25%',
    ratePct: 25,
    category: 'reduced',
    basis: 'Ninth Schedule (imported mobile phones above US$500; 18% up to US$500) and SRO 297(I)/2023 (locally manufactured motor vehicles above 1,400cc or Rs 40 lakh). Locally made hybrids up to 2,000cc are back at 18% (SRO 1525(I)/2026).',
  },
];

/** Zero-rated categories (s.4 + Fifth Schedule) — shown in the page table. */
export const GST_ZERO_RATED_ITEMS: string[] = [
  'Exports of goods',
  'Stores and provisions for conveyances going abroad',
  'Supplies to diplomats and diplomatic missions',
  'Inputs for manufacture in Export Processing Zones',
  'Supplies to exporters under the Duty and Tax Remission Rules',
  'Gwadar Special Economic Zone / Free Zone',
  'Qualified investments (Foreign Investment (Promotion and Protection) Act 2022)',
  'Petroleum crude oil',
];

/** Exempt categories (s.13(1) + Sixth Schedule) — shown in the page table. */
export const GST_EXEMPT_ITEMS: string[] = [
  'Rice, wheat, wheat/meslin flour, pulses and cereals',
  'Fresh vegetables and fruits',
  'Live animals and poultry',
  'Uncooked meat',
  'Eggs',
  'Milk (excluding specified packaged/branded forms)',
  'Unbranded yogurt, butter, desi ghee and cheese',
  'Bread, naan, chapatti',
  'Holy Quran and holy books',
  'Newsprint, books, magazines (magazines added by Finance Act 2026)',
  'Seeds for sowing',
  'Fertilisers excluding DAP',
  'Pesticides',
  'Sugar cane',
  'Wheelchairs, dialysis equipment, artificial body parts',
  'Dextrose and saline infusion sets',
  'Wheat/rice bran (new serial 27A, Finance Act 2026)',
  'Contraceptives (restored)',
  'Tampons (serial 183 — whether sanitary pads are also exempt is unconfirmed; see the note on the page)',
];

/** Services rates — mentioned only, never offered as presets. */
export const GST_SERVICES_NOTE =
  'Services are taxed by the provinces, not under the Sales Tax Act 1990 goods rates: Punjab 16%, Sindh, Khyber Pakhtunkhwa, Balochistan and Islamabad 15%, telecom 19.5% — secondary sources only, and the Punjab 2026-27 rate was not confirmed as at 29 September 2026. Check the rate with the provincial authority before using it.';
