import { describe, expect, it } from 'vitest';
import { docText, type DocData } from './quoteText';
import { line } from './testkit';

const business = { businessName: 'Kauri Painting', phone: '021 555 010', email: 'hi@kauri.example', address: '', bankLine: 'Pay to 12-3456-7890123-00' };
const doc: DocData = {
  label: 'Quote',
  number: 'UD-20261110-001',
  date: new Date(2026, 10, 10, 12).toISOString(),
  siteName: '12 Kowhai St',
  lines: [line({ label: 'Lounge: walls', qty: 36.5, unit: 'm2', rateCents: 1800 })],
  extras: [{ id: 'x', item: 'Travel', qty: 1, costCents: 5000 }],
  chargeGst: true,
  gstNumber: '123-456-789',
  terms: 'Valid 30 days.',
};

describe('copy as text', () => {
  it('gives the whole quote as plain text', () => {
    expect(docText(doc, business)).toBe(
      [
        'Kauri Painting',
        '021 555 010 · hi@kauri.example',
        '',
        'QUOTE UD-20261110-001',
        '10 November 2026',
        'Site: 12 Kowhai St',
        '',
        'Lounge: walls',
        '  36.5 m² × $18.00 = $657.00',
        '',
        'Extras',
        'Travel',
        '  1 × $50.00 = $50.00',
        '',
        'Total excluding GST: $707.00',
        'GST 15%: $106.05',
        'Total including GST: $813.05',
        'GST number: 123-456-789',
        '',
        'Terms',
        'Valid 30 days.',
        '',
        'Pay to 12-3456-7890123-00',
      ].join('\n'),
    );
  });
  it('shows one total and no GST number when GST is off', () => {
    const text = docText({ ...doc, chargeGst: false, gstNumber: '' }, business);
    expect(text).toContain('Total: $707.00\nNo GST charged.');
    expect(text).not.toContain('GST number');
    expect(text).not.toContain('15%');
  });
  it('marks an estimate as not an offer and leaves the bank line off', () => {
    const text = docText({ ...doc, label: 'Estimate', number: undefined, terms: undefined }, business);
    expect(text).toContain('ESTIMATE\n10 November 2026');
    expect(text).toContain('Estimate only, not an offer.');
    expect(text).not.toContain('Pay to');
  });
});
