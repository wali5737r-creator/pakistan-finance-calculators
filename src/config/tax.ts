// FBR 2026-27 salaried slabs — CONFIG, not hard-coded in page markup.
// Values are the supplied figures from the SRS review (verified for
// internal consistency only). SOURCE_CITATION is deliberately empty:
// it must be filled from the Finance Act 2026 gazette / FBR notification
// and re-verified before launch (OQ-01). Never invent a citation.
export const TAX_YEAR = '2026-27';
export const SOURCE_CITATION = '';
export const SOURCE_STATUS = 'To be verified against the Finance Act gazette / FBR notification before launch';

export interface TaxSlab {
  /** Upper bound of the band (inclusive), in PKR. null = open-ended. */
  upTo: number | null;
  /** Marginal rate as a decimal, e.g. 0.11 = 11%. */
  rate: number;
  /** Tax due at the lower bound of the band, in PKR. */
  baseTax: number;
}

export const TAX_SLABS: TaxSlab[] = [
  { upTo: 600000, rate: 0, baseTax: 0 },
  { upTo: 1200000, rate: 0.01, baseTax: 0 },
  { upTo: 2200000, rate: 0.11, baseTax: 6000 },
  { upTo: 3200000, rate: 0.2, baseTax: 116000 },
  { upTo: 4100000, rate: 0.25, baseTax: 316000 },
  { upTo: 5600000, rate: 0.29, baseTax: 541000 },
  { upTo: 7000000, rate: 0.32, baseTax: 976000 },
  { upTo: null, rate: 0.35, baseTax: 1424000 },
];

export const TAX_SLAB_LOWER_BOUNDS = [0, 600000, 1200000, 2200000, 3200000, 4100000, 5600000, 7000000];
