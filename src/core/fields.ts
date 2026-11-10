import { roundTo } from './money';
import type { FieldDef, FieldValue } from './types';

type Fields = Record<string, FieldValue>;

/** A measurement field as a number. Blank, junk and negatives read as 0. */
export function num(fields: Fields, key: string): number {
  const v = fields[key];
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function int(fields: Fields, key: string): number {
  return Math.round(num(fields, key));
}

export function bool(fields: Fields, key: string): boolean {
  return fields[key] === true;
}

export function str(fields: Fields, key: string): string {
  const v = fields[key];
  return typeof v === 'string' ? v : v === undefined ? '' : String(v);
}

/** "4, 3.6 4 3.6" → [4, 3.6, 4, 3.6]. Anything that is not a positive number is dropped. */
export function numList(fields: Fields, key: string): number[] {
  return str(fields, key)
    .split(/[\s,;+]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function isVisible(field: FieldDef, fields: Fields): boolean {
  if (!field.showIf) return true;
  const v = fields[field.showIf.key];
  return v !== undefined && field.showIf.in.includes(v);
}

/** Metres for the Check screen: up to 2 decimals, no trailing zeros. */
export function metres(n: number): string {
  return `${new Intl.NumberFormat('en-NZ', { maximumFractionDigits: 2 }).format(roundTo(n, 2))} m`;
}
