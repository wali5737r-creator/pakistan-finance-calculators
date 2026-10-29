// Area conversion factors — PROVISIONAL Punjab definition (OQ-13).
// Factors must be confirmed against a named source before launch; the
// source field is deliberately empty and the page shows a Provisional
// badge until it is filled. Changing a factor = editing this file only.
//
// TWO marla standards exist in Pakistan and both are offered on the
// Unit / Marla page (default: revenue). Revenue: 1 marla = 272.25 sq ft
// (9 sarsahi x 30.25 sq ft), 1 kanal = 20 marla = 5,445 sq ft — the
// Punjab revenue / land-record standard. Housing-society: 1 marla =
// 225 sq ft (25 sq yd), 1 kanal = 4,500 sq ft (50 x 90 ft plot) — the
// standard used by DHA, Bahria Town and LDA schemes. A third,
// 250 sq ft municipal variant is reported in some CDA/Islamabad
// areas; it is NOT offered — users there must check their own
// layout plan / registry. Never silently mix the standards: marla
// and kanal always change together, 20 marla = 1 kanal under both.
export const UNIT_REGION = 'Punjab';
export const UNIT_SOURCE_CITATION = '';
export const UNIT_SOURCE_STATUS = 'Provisional — source to be confirmed';

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
}

export const MARLA_STANDARDS: MarlaStandard[] = [
  {
    id: 'revenue',
    shortLabel: 'Revenue standard (Punjab)',
    label: 'Revenue standard — Punjab: 1 marla = 272.25 sq ft',
    marlaSqft: 272.25,
    kanalSqft: 5445,
  },
  {
    id: 'society',
    shortLabel: 'Housing-society standard (DHA / Bahria / LDA)',
    label: 'Housing-society standard — DHA / Bahria / LDA: 1 marla = 225 sq ft',
    marlaSqft: 225,
    kanalSqft: 4500,
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
