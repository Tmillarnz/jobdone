import { uid } from './id';
import type { Job, Quote, Settings } from './types';

/** Local calendar day as YYYYMMDD. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** UD-YYYYMMDD-xxx, where xxx is the device's sequence for that day, from 001. */
export function formatQuoteNumber(date: Date, seq: number): string {
  return `UD-${dayKey(date)}-${String(seq).padStart(3, '0')}`;
}

/**
 * Snapshot the job's lines and extras with the GST treatment and terms in force
 * now. The copy is deep, so later edits to the job or Settings cannot reach it.
 */
export function confirmQuote(job: Job, settings: Settings, number: string, date: Date): Quote {
  return {
    id: uid(),
    jobId: job.id,
    number,
    date: date.toISOString(),
    siteName: job.siteName,
    lines: job.lines.map((l) => ({ ...l })),
    extras: job.extras.map((e) => ({ ...e })),
    chargeGst: settings.chargeGst,
    gstNumber: settings.chargeGst ? settings.gstNumber : '',
    terms: settings.defaultTerms,
  };
}

/** GST is being charged but there is no GST number to print. */
export function gstNumberMissing(s: Pick<Settings, 'chargeGst' | 'gstNumber'>): boolean {
  return s.chargeGst && s.gstNumber.trim() === '';
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}
