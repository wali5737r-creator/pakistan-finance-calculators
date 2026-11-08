// NEPRA domestic tariff A-1 (residential) — CONFIG, not hard-coded in
// page markup. Verified 2026-11-08 from the NEPRA decision itself
// (No. NEPRA/R/DG(Trf)/TRF-100/2935-57, 11 February 2026) and the
// IESCO tariff guide, which reproduces the same table.
// Discrepancy resolved: January 2026 press reports of Rs 47.69 above
// 700 units (and Rs 42.76 for 601-700) describe the earlier 7 January
// 2026 determination, notified by SROs 41-52(I)/2026. The February
// decision and S.R.O. 279(I)/2026 supersede it: the notified schedule
// charges Rs 47.20 above 700 units and Rs 41.85 for 601-700 units.
// Tariff rules (NEPRA decision / IESCO guide): only protected
// consumers get the one-previous-slab benefit (first 100 units at
// Rs 10.54, only the excess at Rs 13.01); lifeline consumers get no
// slab benefit (51-100 units are charged at Rs 7.74 on every unit);
// unprotected consumers pay the rate of the slab reached on every
// unit. Fixed charges apply per kW of sanctioned load; lifeline
// consumers pay no fixed charge, and the Rs 75 (single-phase) minimum
// monthly charge applies only where no fixed charge applies.
export const ELECTRICITY_TARIFF_YEAR = '2026';
export const ELECTRICITY_SOURCE_CITATION =
  'NEPRA Decision No. NEPRA/R/DG(Trf)/TRF-100/2935-57 dated 11 February 2026, notified by the Federal Government vide S.R.O. 279(I)/2026 dated 12 February 2026 — uniform domestic tariff A-1 for all DISCOs and K-Electric';
export const NEPRA_DECISION_URL =
  'https://www.nepra.org.pk/tariff/Tariff/Ex-WAPDA%20DISCOS/2026/TRF-100%20XWDISCOS%20AND%20KE%20RATIONALIZATION%20OF%20TARIFF%2011-02-2026%202935-57.pdf';
export const IESCO_TARIFF_GUIDE_URL = 'https://iesco.com.pk/tariff-guide';
export const ELECTRICITY_SOURCE_STATUS = 'Verified against the NEPRA decision of 11 February 2026 and the IESCO tariff guide';
export const ELECTRICITY_LAST_CHECKED = '8 November 2026';

/** General sales tax on electricity bills, applied to the subtotal of
 *  energy charge + fixed charge + fuel price adjustment. */
export const ELECTRICITY_GST_RATE = 0.18;
/** Minimum monthly charge for lifeline (no fixed charge) consumers,
 *  single-phase connections. Three-phase minimum is Rs 150. */
export const LIFELINE_MINIMUM_CHARGE = 75;

export interface ElectricitySlab {
  /** Upper bound of the band (inclusive), in units. null = open-ended. */
  upTo: number | null;
  /** Variable (energy) charge, Rs per unit. */
  ratePerUnit: number;
  /** Fixed charge, Rs per kW of sanctioned load per month. 0 = none. */
  fixedPerKw: number;
}

/** Lifeline: up to 100 units a month. No slab benefit — the rate of the
 *  band reached applies to every unit. No fixed charge. */
export const LIFELINE_SLABS: ElectricitySlab[] = [
  { upTo: 50, ratePerUnit: 3.95, fixedPerKw: 0 },
  { upTo: 100, ratePerUnit: 7.74, fixedPerKw: 0 },
];

/** Protected: up to 200 units a month, with the one-previous-slab
 *  benefit — the first 100 units at Rs 10.54, only the excess at
 *  Rs 13.01. The fixed charge per kW follows the band reached. */
export const PROTECTED_SLABS: ElectricitySlab[] = [
  { upTo: 100, ratePerUnit: 10.54, fixedPerKw: 200 },
  { upTo: 200, ratePerUnit: 13.01, fixedPerKw: 300 },
];

/** Unprotected: the rate of the band reached applies to every unit
 *  (no slab benefit). The fixed charge per kW follows the band. */
export const UNPROTECTED_SLABS: ElectricitySlab[] = [
  { upTo: 100, ratePerUnit: 22.44, fixedPerKw: 275 },
  { upTo: 200, ratePerUnit: 28.91, fixedPerKw: 300 },
  { upTo: 300, ratePerUnit: 33.1, fixedPerKw: 350 },
  { upTo: 400, ratePerUnit: 36.46, fixedPerKw: 400 },
  { upTo: 500, ratePerUnit: 38.95, fixedPerKw: 500 },
  { upTo: 600, ratePerUnit: 40.22, fixedPerKw: 675 },
  { upTo: 700, ratePerUnit: 41.85, fixedPerKw: 675 },
  { upTo: null, ratePerUnit: 47.2, fixedPerKw: 675 },
];
