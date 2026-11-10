import { describe, expect, it } from 'vitest';
import { totals } from './money';
import { confirmQuote, dayKey, formatQuoteNumber, gstNumberMissing } from './quote';
import { defaultSettings } from './settings';
import { job, line, testTrade } from './testkit';

describe('quote number', () => {
  it('is UD-YYYYMMDD-xxx on the local calendar day', () => {
    expect(formatQuoteNumber(new Date(2026, 10, 10, 9, 30), 1)).toBe('UD-20261110-001');
    expect(formatQuoteNumber(new Date(2026, 0, 5, 23, 59), 42)).toBe('UD-20260105-042');
    expect(dayKey(new Date(2026, 11, 31, 0, 0))).toBe('20261231');
  });
  it('does not truncate past 999', () => {
    expect(formatQuoteNumber(new Date(2026, 10, 10), 1000)).toBe('UD-20261110-1000');
  });
});

describe('confirmQuote', () => {
  const settings = { ...defaultSettings([testTrade]), gstNumber: '123-456-789', defaultTerms: 'Seven days.' };
  const source = () =>
    job({
      lines: [line({ id: 'a', qty: 36.5, unit: 'm2', rateCents: 1800 })],
      extras: [{ id: 'x', item: 'Travel', qty: 1, costCents: 5000 }],
    });

  it('snapshots lines, extras, GST treatment and terms', () => {
    const j = source();
    const q = confirmQuote(j, settings, 'UD-20261110-001', new Date(2026, 10, 10));
    expect(q).toMatchObject({
      jobId: 'j1', number: 'UD-20261110-001', siteName: '12 Kowhai St',
      chargeGst: true, gstNumber: '123-456-789', terms: 'Seven days.',
    });
    expect(q.lines).toEqual(j.lines);
    expect(q.extras).toEqual(j.extras);
    expect(q.sentAt).toBeUndefined();
  });

  it('is not altered by later changes to the job or settings', () => {
    const j = source();
    const s = { ...settings };
    const q = confirmQuote(j, s, 'UD-20261110-001', new Date(2026, 10, 10));
    const before = totals(q.lines, q.extras, q.chargeGst);
    j.lines[0]!.rateCents = 1;
    j.lines.push(line({ id: 'b' }));
    j.extras[0]!.costCents = 1;
    j.siteName = 'Somewhere else';
    s.chargeGst = false;
    s.defaultTerms = 'Changed';
    expect(totals(q.lines, q.extras, q.chargeGst)).toEqual(before);
    expect(before.totalCents).toBe(81305); // (657.00 + 50.00) × 1.15
    expect(q.lines).toHaveLength(1);
    expect(q.terms).toBe('Seven days.');
    expect(q.siteName).toBe('12 Kowhai St');
  });

  it('carries no GST number when GST is not charged', () => {
    const q = confirmQuote(source(), { ...settings, chargeGst: false }, 'n', new Date());
    expect(q.chargeGst).toBe(false);
    expect(q.gstNumber).toBe('');
    expect(totals(q.lines, q.extras, q.chargeGst).gstCents).toBe(0);
  });
});

describe('GST number warning', () => {
  it('warns only when GST is on and the number is empty', () => {
    expect(gstNumberMissing({ chargeGst: true, gstNumber: '  ' })).toBe(true);
    expect(gstNumberMissing({ chargeGst: true, gstNumber: '12-345-678' })).toBe(false);
    expect(gstNumberMissing({ chargeGst: false, gstNumber: '' })).toBe(false);
  });
});
