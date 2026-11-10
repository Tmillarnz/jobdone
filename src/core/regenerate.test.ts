import { describe, expect, it } from 'vitest';
import { rateFor, regenerateJob, regenerateLines } from './regenerate';
import { seededRateSets } from './settings';
import { job, line, testTrade } from './testkit';
import type { TakeoffLine } from './types';

const tl = (key: string, qty: number, over: Partial<TakeoffLine> = {}): TakeoffLine => ({
  key, label: key, qty, unit: 'm2', rateKey: 'pour', ...over,
});
const price = () => 9000;

describe('regenerateLines', () => {
  it('builds lines from a takeoff with rounded quantities', () => {
    const { lines } = regenerateLines([], [tl('a', 36.48), tl('b', 2.6, { unit: 'each' })], price);
    expect(lines.map((l) => [l.key, l.qty, l.source, l.edited])).toEqual([
      ['a', 36.5, 'takeoff', false],
      ['b', 3, 'takeoff', false],
    ]);
  });

  it('replaces unedited takeoff lines and drops ones no longer produced', () => {
    const existing = [line({ id: 'x', key: 'a', qty: 10 }), line({ id: 'y', key: 'gone', qty: 5 })];
    const { lines, orphaned } = regenerateLines(existing, [tl('a', 12)], price);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ id: 'x', key: 'a', qty: 12, rateCents: 9000 });
    expect(orphaned).toEqual([]);
  });

  it('never touches edited lines or manual lines', () => {
    const edited = line({ id: 'e', key: 'a', qty: 99, rateCents: 1234, label: 'My wording', edited: true });
    const manual = line({ id: 'm', key: 'manual:1', source: 'manual', qty: 3, rateCents: 500 });
    const { lines } = regenerateLines([edited, manual], [tl('a', 12), tl('b', 4)], price);
    expect(lines.find((l) => l.id === 'e')).toEqual({ ...edited, orphaned: false });
    expect(lines.find((l) => l.id === 'm')).toEqual(manual);
    expect(lines.filter((l) => l.key === 'a')).toHaveLength(1);
    expect(lines.map((l) => l.key)).toEqual(['a', 'b', 'manual:1']);
  });

  it('keeps and flags an edited line whose key has gone', () => {
    const edited = line({ id: 'e', key: 'old', qty: 7, edited: true });
    const { lines, orphaned } = regenerateLines([edited], [tl('a', 1)], price);
    expect(orphaned).toEqual([{ ...edited, orphaned: true }]);
    expect(lines.find((l) => l.id === 'e')?.orphaned).toBe(true);
  });

  it('clears the flag when the key comes back', () => {
    const edited = line({ id: 'e', key: 'a', edited: true, orphaned: true });
    const { lines, orphaned } = regenerateLines([edited], [tl('a', 1)], price);
    expect(lines[0]?.orphaned).toBe(false);
    expect(orphaned).toEqual([]);
  });

  it('is stable when run twice', () => {
    const first = regenerateLines([], [tl('a', 1), tl('b', 2)], price).lines;
    expect(regenerateLines(first, [tl('a', 1), tl('b', 2)], price).lines).toEqual(first);
  });
});

describe('regenerateJob', () => {
  const rateSets = seededRateSets(testTrade);
  const base = job({
    areas: [
      { id: 'a1', kind: 'slab', name: 'Garage', fields: { length: 6, width: 3.55 } },
      { id: 'a2', kind: 'slab', name: 'Path', rateSetId: 'test:top', fields: { length: 10, width: 1 } },
    ],
    extras: [{ id: 'x1', item: 'Pump hire', qty: 1, costCents: 45000 }],
  });

  it('prices from the job rate set, or the area override', () => {
    const { job: out } = regenerateJob(base, testTrade.takeoff, rateSets);
    const by = Object.fromEntries(out.lines.map((l) => [l.key, l]));
    expect(by['a1:pour']).toMatchObject({ qty: 21.3, rateCents: 9000 });
    expect(by['a2:pour']).toMatchObject({ qty: 10, rateCents: 12000 });
    expect(by['a2:edge']?.rateCents).toBe(1500);
  });

  it('leaves a missing rate at 0 rather than inventing one', () => {
    const { job: out } = regenerateJob(base, testTrade.takeoff, rateSets);
    expect(out.lines.find((l) => l.key === 'a1:edge')?.rateCents).toBe(0);
    expect(rateFor(job({ rateSetId: 'nope' }), rateSets, tl('a', 1))).toBe(0);
  });

  it('leaves extras alone', () => {
    const { job: out } = regenerateJob(base, testTrade.takeoff, rateSets);
    expect(out.extras).toBe(base.extras);
  });

  it('flags edited lines when their area is removed', () => {
    const first = regenerateJob(base, testTrade.takeoff, rateSets).job;
    const lines = first.lines.map((l) => (l.key === 'a2:pour' ? { ...l, qty: 11, edited: true } : l));
    const { job: out, orphaned } = regenerateJob(
      { ...first, lines, areas: [first.areas[0]!] },
      testTrade.takeoff,
      rateSets,
    );
    expect(orphaned.map((l) => l.key)).toEqual(['a2:pour']);
    expect(out.lines.map((l) => l.key)).toEqual(['a1:pour', 'a1:edge', 'a2:pour']);
    expect(out.lines[2]).toMatchObject({ qty: 11, orphaned: true });
  });
});
