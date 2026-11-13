// Solar size & payback — CONFIG, not hard-coded in page markup.
// Verified 2026-11-13 from the sources below. Every figure that is an
// estimate, a range, or second-hand is labelled as such on the page;
// nothing here is presented as a notified rate unless NEPRA notified it.
//
// NET BILLING — NEPRA (Prosumer) Regulations 2026, SRO 251(I)/2026,
// 9 February 2026, in force at once, repealing the 2015 Net Metering
// Regulations. Reg. 14(1): imports billed at the applicable tariff;
// exports billed at the National Average Energy Purchase Price
// (NAEPP). Reg. 14(2): surplus credit carries to the next billing
// cycle or is paid quarterly — NO annual banking, NO indefinite
// carry-forward. Reg. 14(3): NEPRA may revise the export rate by
// notification mid-agreement. Reg. 3(2): DG capacity must not exceed
// sanctioned load (the old 150% allowance is gone). Reg. 2(1)(ix):
// up to 1 MW. Reg. 3(5): transformer 80% limit. Reg. 7: agreement
// 5 years, renewable for 5 more. Reg. 3(3): load-flow study at
// 250 kW and above.
//
// CRITICAL GAP — the SRO prints NO rupee export figure. The default
// export rate below (Rs 10/unit) is a planning figure, NOT a NEPRA
// notification: Rs 8.13 is NEPRA's 2026 power-purchase forecast /
// IESCO circular of 25 February 2026, and Rs 10–11 is press rounding
// (Dawn / The News, 10 February 2026). The page labels it "NAEPP —
// editable, NEPRA may revise; confirm with your DISCO" and never
// presents Rs 10 as "notified by NEPRA". Outlier figures of
// Rs 19.32–24.50 and Rs 21.50 found in other sources are disregarded.
//
// AMENDMENTS (second-hand — the SRO 547 PDF could not be fetched, so
// the page labels these as reported, not read): SRO 547(I)/2026,
// 2 April 2026, amends Reg. 21(2) — agreements signed before
// 9 February 2026 keep the old rate/mechanism until expiry; SRO
// 709(I)/2026, 28 April 2026 — concurrence fee nil up to 25 kW,
// Rs 1,000/kW above; SRO 1330(I)/2026, 6 August 2026 — up to 25 kW
// needs DISCO approval only. The legacy toggle on the page uses the
// old 1:1 treatment (export credited at the import rate) and is
// labelled legacy. No official LESCO / IESCO / K-Electric net-billing
// page was found — the page cites NEPRA and tells users to confirm
// NAEPP with their DISCO.
//
// YIELD — SolarGuide (NASA POWER climatology, 78% system efficiency),
// corroborated by PVGIS Lahore 4.3 kWh/kW/day and a peer-reviewed
// Lahore case study 3.85 kWh/kW/day. City defaults are kWh generated
// per kW of installed capacity per day, AFTER losses. The "4–5
// units/kW/day" figure seen in marketing is a pre-loss / summer
// figure and is NOT used. Seasonal note: Lahore May ~167 vs
// December ~70 kWh/kW/month.
//
// SYSTEM COST 2026 — on-grid residential, installed, excluding
// batteries; convergent range Rs 105,000–160,000/kW from five sources
// Aug–Nov 2026 (Oraan Oct 2026 Rs 120–160k; SolarPanelPriceInPakistan
// 26 Sep 2026 Rs 95–140k; Green Solar 24 Aug 2026 Rs 100–160k;
// TechnoKraft 10 Nov 2026 Rs 105–130k; Arslan Malik 6 Nov 2026
// Rs 125–160k). Default Rs 130,000/kW. Net-metering fee
// Rs 60,000–80,000 is installer-reported only and is stated
// separately, not folded into the per-kW cost. Prices move weekly
// with the dollar — the page tells users to get three itemised
// quotes. Hybrid / battery systems are excluded from the default:
// no verified hybrid cost was found.
//
// ASSUMPTIONS (labelled as such on the page): degradation 0.5% a
// year (standard industry simplification; N-type TOPCon is ~1% in
// year 1 then ~0.4% a year); system life 25 years; string inverter
// 10–15 years, so one replacement is expected — NO verified Pakistan
// replacement price was found, so it is an optional editable cost,
// default excluded/blank. Self-consumption has NO verified default:
// the user enters it, 50–70% is suggested as a typical household
// planning range, and the page shows payback at 50% and 70% side by
// side.
export const SOLAR_YEAR = '2026';
export const SOLAR_SOURCE_CITATION =
  'NEPRA (Prosumer) Regulations, 2026, SRO 251(I)/2026 dated 9 February 2026 (in force at once; repeals the Net Metering Regulations 2015); yield per SolarGuide (NASA POWER climatology, 78% system efficiency), corroborated by PVGIS and a peer-reviewed Lahore case study; system cost convergent range from five installer/market sources, Aug–Nov 2026';
export const NEPRA_PROSUMER_REGS_URL =
  'https://nepra.org.pk/Legislation/3-Reg/3.35%20NEPRA%20%20Prosumer%20Regulations%202026/NEPRA%20Prosumer%20Regulations%20(SRO%20251(I)2026)%2009-02-26.PDF';
export const SOLARGUIDE_GENERATION_URL = 'https://solarguide.pk/calculators/solar-generation/';
export const SOLAR_SOURCE_STATUS =
  'Verified 13 November 2026 against SRO 251(I)/2026, SolarGuide/NASA POWER yield figures, and five 2026 system-cost sources';
export const SOLAR_LAST_CHECKED = '13 November 2026';

// REVIEW TRIPWIRE — last checked 13 November 2026. NEPRA may revise
// the NAEPP export rate by notification at any time (Reg. 14(3)),
// system prices move weekly with the dollar, and the SRO 547
// amendment text has still not been read directly — so re-verify in
// ~3 months, hence 13 February 2027. On this date check the NEPRA
// site for a new NAEPP notification or amendment, re-check installer
// prices, and update SOLAR_LAST_CHECKED and this date.
export const SOLAR_NEXT_REVIEW = '2027-02-13';

/** Average days in a month (365/12) — used to turn a daily yield
 *  into a monthly figure. */
export const DAYS_PER_MONTH = 365 / 12;

/** City yield defaults: kWh generated per kW of installed capacity
 *  per day, after system losses (78% system efficiency). */
export interface SolarCityYield {
  city: string;
  /** kWh per kW per day. */
  yieldPerKwPerDay: number;
}

export const SOLAR_CITY_YIELDS: SolarCityYield[] = [
  { city: 'Lahore', yieldPerKwPerDay: 3.85 },
  { city: 'Karachi', yieldPerKwPerDay: 4.38 },
  { city: 'Islamabad', yieldPerKwPerDay: 3.82 },
];

/** Fallback yield (kWh/kW/day) for cities not listed above. */
export const SOLAR_DEFAULT_YIELD = 4.0;
/** Published yield range across Pakistani cities, kWh/kW/day. */
export const SOLAR_YIELD_RANGE_LOW = 3.8;
export const SOLAR_YIELD_RANGE_HIGH = 4.4;

/** Default installed system cost, Rs per kW (on-grid residential,
 *  excluding batteries and excluding the net-metering fee). */
export const SOLAR_DEFAULT_COST_PER_KW = 130000;
/** Convergent 2026 market range, Rs per kW. */
export const SOLAR_COST_PER_KW_LOW = 105000;
export const SOLAR_COST_PER_KW_HIGH = 160000;
/** Net-metering fee, installer-reported only, Rs — stated
 *  separately, NOT folded into the per-kW cost. */
export const SOLAR_NET_METER_FEE_LOW = 60000;
export const SOLAR_NET_METER_FEE_HIGH = 80000;

/** Default export rate, Rs per unit. PLANNING FIGURE ONLY — the SRO
 *  prints no rupee figure; NEPRA may revise NAEPP by notification.
 *  Confirm with your DISCO. */
export const SOLAR_DEFAULT_EXPORT_RATE = 10;
/** Reported range for the NAEPP export rate, Rs per unit
 *  (Rs 8.13 = NEPRA 2026 forecast / IESCO circular 25 Feb 2026;
 *  Rs 10–11 = press rounding, Dawn / The News 10 Feb 2026). */
export const SOLAR_EXPORT_RATE_LOW = 8.13;
export const SOLAR_EXPORT_RATE_HIGH = 11;

/** Default import rate, Rs per unit — flat fallback, editable.
 *  Basis: SRO 279(I)/2026 unprotected base rates run Rs 36.46–47.20
 *  by slab; with FCA, quarterly adjustment and 18% GST the effective
 *  rate on a bill is higher, so Rs 48 is used as the planning
 *  default. The calculator shows the base slab rate for the user's
 *  usage alongside it. */
export const SOLAR_DEFAULT_IMPORT_RATE = 48;

/** Suggested self-consumption planning range, percent — an
 *  assumption, not a verified figure. No verified default exists. */
export const SOLAR_SELF_USE_SUGGESTED_LOW = 50;
export const SOLAR_SELF_USE_SUGGESTED_HIGH = 70;
/** Default self-use share, percent. */
export const SOLAR_DEFAULT_SELF_USE_PCT = 60;

/** Degradation, fraction of output lost per year (0.5% — standard
 *  industry simplification). */
export const SOLAR_DEGRADATION_PER_YEAR = 0.005;
/** System life, years. */
export const SOLAR_SYSTEM_LIFE_YEARS = 25;
/** String-inverter life, years (one replacement expected in 25
 *  years). No verified Pakistan replacement price — optional cost,
 *  default excluded. */
export const SOLAR_INVERTER_LIFE_LOW_YEARS = 10;
export const SOLAR_INVERTER_LIFE_HIGH_YEARS = 15;

/** Rough roof-area planning figure, sq ft per kW — varies by panel
 *  size and layout; labelled as a rule of thumb on the page. */
export const SOLAR_ROOF_SQFT_PER_KW = 100;

/** Legacy (pre-9-Feb-2026 agreement) treatment: export credited at
 *  the import rate (old 1:1 net metering). Rs 25.32 was the
 *  pre-2026 export/reference figure reported in press coverage. */
export const SOLAR_LEGACY_EXPORT_REFERENCE_RATE = 25.32;
