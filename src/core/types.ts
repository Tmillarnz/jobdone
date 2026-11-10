/** Data model and the Trade contract. Nothing here knows about a specific trade. */

export type Cents = number;
export type Unit = 'm2' | 'lm' | 'each' | 'hr';
export type FieldValue = number | string | boolean;

export interface RateSet {
  id: string;
  tradeId: string;
  name: string;
  /** Charge-out rates in cents, ex GST, keyed by the trade's rate keys. */
  rates: Record<string, Cents>;
}

export interface Settings {
  businessName: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  chargeGst: boolean;
  defaultTerms: string;
  bankLine?: string;
  rateSets: RateSet[];
  defaultRateSetId: Record<string, string>;
}

/** Metres. A plan is a list of axis-aligned rectangles; the shape is their union. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Area {
  id: string;
  kind: string;
  name: string;
  rateSetId?: string;
  fields: Record<string, FieldValue>;
  plan?: Rect[];
}

export interface Line {
  id: string;
  source: 'takeoff' | 'manual';
  key: string;
  label: string;
  qty: number;
  unit: Unit;
  rateCents: Cents;
  edited: boolean;
  /** Set on an edited takeoff line whose key is no longer produced by the takeoff. */
  orphaned?: boolean;
}

export interface Extra {
  id: string;
  item: string;
  qty: number;
  costCents: Cents;
}

/** The image itself lives in the photo store under the same id. */
export interface PhotoRef {
  id: string;
  name: string;
  addedAt: string;
}

export interface Job {
  id: string;
  tradeId: string;
  siteName: string;
  createdAt: string;
  updatedAt: string;
  rateSetId: string;
  areas: Area[];
  lines: Line[];
  extras: Extra[];
  photos: PhotoRef[];
  schemaVersion: number;
}

export interface Quote {
  id: string;
  jobId: string;
  number: string;
  date: string;
  /** Site name at the time of confirming, so a quote reads on its own. */
  siteName: string;
  lines: Line[];
  extras: Extra[];
  chargeGst: boolean;
  gstNumber: string;
  terms: string;
  sentAt?: string;
}

/* ---- Trade contract ---- */

export type FieldType = 'number' | 'integer' | 'text' | 'boolean' | 'select' | 'numberList';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  /** Shown after the input, e.g. "m". */
  unit?: string;
  options?: { value: string; label: string }[];
  default?: FieldValue;
  help?: string;
  /** Section heading the field sits under on the form. */
  group?: string;
  /** Field is shown only when another field has one of these values. */
  showIf?: { key: string; in: FieldValue[] };
}

export interface AreaKind {
  id: string;
  name: string;
  fields: FieldDef[];
  /** Field keys the Draw method fills from a plan (area, perimeter). */
  plan?: { areaField?: string; perimeterField?: string };
}

export interface TakeoffLine {
  /** Stable and unique within a job, e.g. `${areaId}:walls`. */
  key: string;
  label: string;
  qty: number;
  unit: Unit;
  rateKey: string;
  /** Area the line came from; decides which rate set prices it. */
  areaId?: string;
}

export interface CheckRow {
  areaId?: string;
  group: string;
  label: string;
  value: string;
  kind: 'measured' | 'calculated';
}

export interface RateKeyDef {
  key: string;
  label: string;
  unit: Unit;
}

export interface Trade {
  id: string;
  name: string;
  areaKinds: AreaKind[];
  /** Every rate key the takeoff can emit, for the rate set editor. */
  rateKeys: RateKeyDef[];
  /** Pure function, no I/O. */
  takeoff(job: Job): TakeoffLine[];
  /** Ids are local to the trade; they are namespaced when seeded into Settings. */
  defaultRateSets: RateSet[];
  suggestedExtras: string[];
  checkSummary(job: Job): CheckRow[];
}
