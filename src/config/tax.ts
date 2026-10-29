// FBR 2026-27 salaried slabs — CONFIG, not hard-coded in page markup.
// Citation verified 2026-10-29 from the Gazette PDF itself and approved
// by Muhammad. Slabs were checked row-by-row against the Gazette table.
export const TAX_YEAR = '2026-27';
export const SOURCE_CITATION = 'Finance Act, 2026 (Act No. XLIII of 2026), Gazette of Pakistan, Extraordinary, Part I, 26 June 2026, No. F.22(46)/2026-Legis., s.5(44)(a)(i) substituting the Table in clause (2), Division I, Part I, First Schedule to the Income Tax Ordinance, 2001 — Tax Year 2027 (1 July 2026 to 30 June 2027)';
export const GAZETTE_URL = 'http://na.gov.pk/uploads/documents/6a422720f05a0_626.pdf';
export const SOURCE_STATUS = 'Verified against the Finance Act 2026 gazette';

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
