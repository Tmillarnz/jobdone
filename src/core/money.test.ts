import { describe, expect, it } from 'vitest';
import { amountCents, formatMoney, formatQty, needsRate, parseMoney, roundQty, roundTo, totals } from './money';

describe('rounding', () => {
  it('rounds m2 and lm to 1 decimal, half up', () => {
    expect(roundQty(36.48, 'm2')).toBe(36.5);
    expect(roundQty(14.44, 'lm')).toBe(14.4);
    expect(roundQty(0.25, 'm2')).toBe(0.3);
    expect(roundQty(1.005, 'lm')).toBe(1);
  });
  it('survives binary float edges', () => {
    expect(roundTo(1.15, 1)).toBe(1.2); // 1.15 is stored as 1.149999…
    expect(roundTo(2.675, 2)).toBe(2.68);
    expect(roundTo(8.345, 2)).toBe(8.35);
  });
  it('keeps each as integers and hours as entered', () => {
    expect(roundQty(2.4, 'each')).toBe(2);
    expect(roundQty(1.25, 'hr')).toBe(1.25);
  });
  it('turns junk into 0', () => {
    expect(roundQty(NaN, 'm2')).toBe(0);
    expect(amountCents(NaN, 100)).toBe(0);
  });
});

describe('line amount', () => {
  it('is round(qty × rate) in whole cents', () => {
    expect(amountCents(36.5, 1800)).toBe(65700);
    expect(amountCents(14.4, 1600)).toBe(23040);
    expect(amountCents(1.15, 100)).toBe(115);
    expect(amountCents(0.1, 333)).toBe(33);
    expect(amountCents(0.5, 333)).toBe(167);
    expect(amountCents(1.25, 6500)).toBe(8125);
  });
  it('prices the rounded quantity, so shown qty × rate equals shown amount', () => {
    const qty = roundQty(36.48, 'm2');
    expect(amountCents(qty, 1800)).toBe(65700); // not 36.48 × 18 = 656.64
  });
});

describe('totals', () => {
  const lines = [
    { qty: 36.5, rateCents: 1800 },
    { qty: 14.4, rateCents: 1600 },
  ];
  const extras = [{ qty: 2, costCents: 4550 }];
  it('adds lines and extras, GST on', () => {
    const t = totals(lines, extras, true);
    expect(t.subtotalCents).toBe(65700 + 23040 + 9100);
    expect(t.gstCents).toBe(14676);
    expect(t.totalCents).toBe(97840 + 14676);
  });
  it('charges no GST when off', () => {
    const t = totals(lines, extras, false);
    expect(t.gstCents).toBe(0);
    expect(t.totalCents).toBe(t.subtotalCents);
  });
  it('rounds GST to the cent', () => {
    expect(totals([{ qty: 1, rateCents: 1003 }], [], true).gstCents).toBe(150); // 150.45
    expect(totals([{ qty: 1, rateCents: 1010 }], [], true).gstCents).toBe(152); // 151.5
  });
  it('is zero for an empty job', () => {
    expect(totals([], [], true)).toEqual({ subtotalCents: 0, gstCents: 0, totalCents: 0, chargeGst: true });
  });
});

describe('display', () => {
  it('formats NZD to two decimals', () => {
    expect(formatMoney(65700)).toBe('$657.00');
    expect(formatMoney(123456789)).toBe('$1,234,567.89');
    expect(formatMoney(5)).toBe('$0.05');
  });
  it('formats quantities by unit', () => {
    expect(formatQty(36.5, 'm2')).toBe('36.5');
    expect(formatQty(14, 'lm')).toBe('14.0');
    expect(formatQty(3, 'each')).toBe('3');
    expect(formatQty(1.25, 'hr')).toBe('1.25');
  });
  it('parses typed money', () => {
    expect(parseMoney('18')).toBe(1800);
    expect(parseMoney('18.5')).toBe(1850);
    expect(parseMoney('$1,234.56')).toBe(123456);
    expect(parseMoney('19.99')).toBe(1999);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('.')).toBeNull();
  });
  it('flags a zero or missing rate', () => {
    expect(needsRate({ rateCents: 0 })).toBe(true);
    expect(needsRate({ rateCents: NaN })).toBe(true);
    expect(needsRate({ rateCents: 1 })).toBe(false);
  });
});
