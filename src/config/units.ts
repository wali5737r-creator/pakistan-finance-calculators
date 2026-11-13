// Area conversion factors — SOURCED (see citations below).
// Two marla standards exist in Pakistan and both are offered on the
// Unit / Marla page (default: revenue). Revenue: 1 marla = 272.25 sq ft
// (9 sarsahi x 30.25 sq ft), 1 kanal = 20 marla = 5,445 sq ft — the
// traditional Punjab revenue / land-record figures. No PLRA or Board
// of Revenue Punjab document stating 272.25 sq ft was found published
// online (checked 2026-11-13); the citable official source for the
// figures is the Capital Development Authority's 2023 Regulation
// (S.R.O. 886(I)/2023, Gazette of Pakistan, 7 July 2023), cl. 2(xlx),
// which defines the identical units for ICT — 1 marla = 272.25 sq ft,
// 1 kanal = 5,445 sq ft. Note Punjab's own housing-scheme rules define
// the marla as 272 sq ft (rounded) outside Lahore district, so 272.25
// is the traditional revenue figure, not a Punjab housing-scheme one.
// Housing-society: 1 marla = 225 sq ft (25 sq yd), 1 kanal = 4,500 sq ft
// (50 x 90 ft plot) — defined in DHA Lahore's Construction &
// Development Regulations 2014, reg. 2, defs. (51) and (57). A third,
// 250 sq ft municipal variant is reported in some CDA/Islamabad
// areas; NO official source for it was found — CDA's 2023 Regulation
// in fact defines 272.25 sq ft — so it is NOT offered. Never silently
// mix the standards: marla and kanal always change together,
// 20 marla = 1 kanal under both.
export const UNIT_REGION = 'Punjab';
export const UNIT_SOURCE_CITATION =
  'Capital Development Authority, Regulation for Planning and Development of Private Housing/Farm Housing, Apartments/Commercial Schemes/Projects in Zones-2, 4 & 5 of Islamabad Capital Territory, 2023 (S.R.O. 886(I)/2023, Gazette of Pakistan, Extraordinary, 7 July 2023), cl. 2(xlx): 1 marla = 272.25 sq ft, 1 kanal = 5,445 sq ft (copy of the Gazette text: https://www.scribd.com/document/732486978/Design-Criteria-CDA)';
export const UNIT_SOURCE_STATUS = 'Verified — see source below';

export interface AreaUnit {
  id: string;
  label: string;
  /** Square feet in one unit. */
  sqft: number;
}

export const AREA_UNITS: AreaUnit[] = [
  { id: 'sqft', label: 'Square feet', sqft: 1 },
  { id: 'sqyd', label: 'Square yards', sqft: 9 },
  { id: 'sqm', label: 'Square metres', sqft: 10.7639 },
  { id: 'marla', label: 'Marla', sqft: 272.25 },
  { id: 'kanal', label: 'Kanal', sqft: 5445 },
  { id: 'acre', label: 'Acre', sqft: 43560 },
  { id: 'hectare', label: 'Hectare', sqft: 107639.1 },
];

/** The two marla standards offered on the Unit / Marla page. */
export interface MarlaStandard {
  id: string;
  /** Short label used in dynamic result text. */
  shortLabel: string;
  /** Full label used in the standard selector. */
  label: string;
  /** Square feet in one marla under this standard. */
  marlaSqft: number;
  /** Square feet in one kanal (20 marla) under this standard. */
  kanalSqft: number;
  /** Citable official source for this standard's figures. */
  citation: string;
}

export const MARLA_STANDARDS: MarlaStandard[] = [
  {
    id: 'revenue',
    shortLabel: 'Revenue standard (Punjab)',
    label: 'Revenue standard — Punjab: 1 marla = 272.25 sq ft',
    marlaSqft: 272.25,
    kanalSqft: 5445,
    citation: UNIT_SOURCE_CITATION,
  },
  {
    id: 'society',
    shortLabel: 'Housing-society standard (DHA / Bahria / LDA)',
    label: 'Housing-society standard — DHA / Bahria / LDA: 1 marla = 225 sq ft',
    marlaSqft: 225,
    kanalSqft: 4500,
    citation:
      'Defence Housing Authority Lahore, Construction & Development Regulations 2014, reg. 2, defs. (51) and (57): “Marla” = 25 sq yd / 225 sq ft; “Kanal” = 20 marlas = 500 sq yd / 4,500 sq ft. https://dhalahore.org/wp-content/uploads/2026/04/DHA-Construction-Regulaiton-2014-Updated-1-1.pdf',
  },
];

export const DEFAULT_MARLA_STANDARD_ID = 'revenue';

export function marlaStandardById(id: string): MarlaStandard {
  return MARLA_STANDARDS.find((s) => s.id === id) ?? MARLA_STANDARDS[0];
}

/** AREA_UNITS with marla/kanal replaced by the chosen standard's factors. */
export function areaUnitsForStandard(id: string): AreaUnit[] {
  const standard = marlaStandardById(id);
  return AREA_UNITS.map((unit) =>
    unit.id === 'marla'
      ? { ...unit, sqft: standard.marlaSqft }
      : unit.id === 'kanal'
        ? { ...unit, sqft: standard.kanalSqft }
        : unit,
  );
}
