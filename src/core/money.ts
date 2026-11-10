import type { Cents, Extra, Line, Unit } from './types';

export const GST_RATE = 0.15;

/** Round half away from zero at a given number of decimals, without float drift. */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** decimals;
  const scaled = value * f;
  const r = Math.round(Math.abs(scaled) + 1e-9);
  return (Math.sign(scaled) * r) / f || 0;
}

/** m² and lm to 1 decimal, each as integers, hours as entered. */
export function roundQty(qty: number, unit: Unit): number {
  if (!Number.isFinite(qty)) return 0;
  if (unit === 'm2' || unit === 'lm') return roundTo(qty, 1);
  if (unit === 'each') return roundTo(qty, 0);
  return qty;
}

/** Amount in cents = round(qty × rate). Qty is taken at up to 3 decimals. */
export function amountCents(qty: number, rateCents: Cents): Cents {
  if (!Number.isFinite(qty) || !Number.isFinite(rateCents)) return 0;
  const milli = Math.round(qty * 1000);
  return roundTo((milli * rateCents) / 1000, 0);
}

export function lineAmount(line: Pick<Line, 'qty' | 'rateCents'>): Cents {
  return amountCents(line.qty, line.rateCents);
}

export function extraAmount(extra: Pick<Extra, 'qty' | 'costCents'>): Cents {
  return amountCents(extra.qty, extra.costCents);
}

export function needsRate(line: Pick<Line, 'rateCents'>): boolean {
  return !(line.rateCents > 0);
}

export interface Totals {
  subtotalCents: Cents;
  gstCents: Cents;
  totalCents: Cents;
  chargeGst: boolean;
}

export function totals(
  lines: Pick<Line, 'qty' | 'rateCents'>[],
  extras: Pick<Extra, 'qty' | 'costCents'>[],
  chargeGst: boolean,
): Totals {
  const subtotalCents =
    lines.reduce((s, l) => s + lineAmount(l), 0) + extras.reduce((s, e) => s + extraAmount(e), 0);
  const gstCents = chargeGst ? roundTo(subtotalCents * GST_RATE, 0) : 0;
  return { subtotalCents, gstCents, totalCents: subtotalCents + gstCents, chargeGst };
}

const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(cents: Cents): string {
  return nzd.format((Number.isFinite(cents) ? cents : 0) / 100);
}

const UNIT_LABEL: Record<Unit, string> = { m2: 'm²', lm: 'lm', each: 'each', hr: 'hr' };

export function unitLabel(unit: Unit): string {
  return UNIT_LABEL[unit];
}

export function formatQty(qty: number, unit: Unit): string {
  const opts: Intl.NumberFormatOptions =
    unit === 'm2' || unit === 'lm'
      ? { minimumFractionDigits: 1, maximumFractionDigits: 1 }
      : unit === 'each'
        ? { maximumFractionDigits: 0 }
        : { maximumFractionDigits: 2 };
  return new Intl.NumberFormat('en-NZ', opts).format(qty);
}

/** "18", "18.5", "$1,234.50" → cents. Returns null when it is not a number. */
export function parseMoney(text: string): Cents | null {
  const cleaned = text.replace(/[$,\s]/g, '');
  if (cleaned === '' || !/^-?\d*\.?\d*$/.test(cleaned) || cleaned === '.' || cleaned === '-') return null;
  return roundTo(Number(cleaned) * 100, 0);
}

export function centsToInput(cents: Cents): string {
  return (cents / 100).toFixed(2);
}
