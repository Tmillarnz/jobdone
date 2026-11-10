import type { Job, Line, Trade } from './types';

/** A made-up trade for core tests, so core never leans on a real one. */
export const testTrade: Trade = {
  id: 'test',
  name: 'Test trade',
  areaKinds: [
    {
      id: 'slab',
      name: 'Slab',
      fields: [
        { key: 'length', label: 'Length', type: 'number', unit: 'm' },
        { key: 'width', label: 'Width', type: 'number', unit: 'm' },
        { key: 'sealed', label: 'Sealed', type: 'boolean', default: false },
      ],
    },
  ],
  rateKeys: [
    { key: 'pour', label: 'Pour', unit: 'm2' },
    { key: 'edge', label: 'Edge', unit: 'lm' },
  ],
  takeoff(job) {
    return job.areas.flatMap((a) => {
      const l = Number(a.fields.length) || 0;
      const w = Number(a.fields.width) || 0;
      return [
        { key: `${a.id}:pour`, label: `${a.name} pour`, qty: l * w, unit: 'm2' as const, rateKey: 'pour', areaId: a.id },
        { key: `${a.id}:edge`, label: `${a.name} edge`, qty: 2 * (l + w), unit: 'lm' as const, rateKey: 'edge', areaId: a.id },
      ];
    });
  },
  defaultRateSets: [
    { id: 'std', tradeId: 'test', name: 'Standard', rates: { pour: 9000, edge: 0 } },
    { id: 'top', tradeId: 'test', name: 'Top', rates: { pour: 12000, edge: 1500 } },
  ],
  suggestedExtras: ['Pump hire'],
  checkSummary: () => [],
};

export function line(over: Partial<Line> = {}): Line {
  return { id: 'l1', source: 'takeoff', key: 'k', label: 'Line', qty: 1, unit: 'each', rateCents: 100, edited: false, ...over };
}

export function job(over: Partial<Job> = {}): Job {
  return {
    id: 'j1',
    tradeId: 'test',
    siteName: '12 Kowhai St',
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
    rateSetId: 'test:std',
    areas: [],
    lines: [],
    extras: [],
    photos: [],
    schemaVersion: 1,
    ...over,
  };
}
