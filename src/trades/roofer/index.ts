import { int, num, str } from '../../core/fields';
import { formatQty, roundQty, roundTo } from '../../core/money';
import type { Area, AreaKind, CheckRow, Job, TakeoffLine, Trade } from '../../core/types';

const PITCHES = [0, 3, 5, 8, 10, 12, 15, 18, 20, 22.5, 25, 27.5, 30, 35, 40, 45, 50, 60];

/** Slope length per unit of plan length: 1 / cos(pitch). */
export function pitchFactor(degrees: number): number {
  return 1 / Math.cos((degrees * Math.PI) / 180);
}

const LENGTHS = [
  { key: 'ridge', label: 'Ridge', rateKey: 'ridge' },
  { key: 'hip', label: 'Hip', rateKey: 'hip' },
  { key: 'valley', label: 'Valley', rateKey: 'valley' },
  { key: 'barge', label: 'Barge', rateKey: 'barge' },
];

const plane: AreaKind = {
  id: 'roofPlane',
  name: 'Roof plane',
  plan: { areaField: 'planArea' },
  fields: [
    { key: 'planArea', label: 'Plan area', type: 'number', unit: 'm²', group: 'Size', help: 'The area seen from straight above. Type it, or use Draw.' },
    {
      key: 'pitch', label: 'Pitch', type: 'select', default: '', group: 'Size',
      options: [{ value: '', label: 'Choose the pitch' }, ...PITCHES.map((p) => ({ value: String(p), label: p === 0 ? 'Flat (0°)' : `${p}°` }))],
    },
    { key: 'factor', label: 'Pitch factor', type: 'number', group: 'Size', help: 'Leave blank to use the pitch. Type a factor here to override it.' },
    ...LENGTHS.map((l) => ({ key: l.key, label: l.label, type: 'number' as const, unit: 'm', group: 'Lengths' })),
    { key: 'gutter', label: 'Gutters', type: 'number', unit: 'm', group: 'Lengths', say: ['gutter', 'spouting'] },
    { key: 'flashingLm', label: 'Flashings by length', type: 'number', unit: 'm', group: 'Flashings and downpipes' },
    { key: 'flashingEach', label: 'Flashings, each', type: 'integer', default: 0, group: 'Flashings and downpipes' },
    { key: 'downpipes', label: 'Downpipes', type: 'integer', default: 0, group: 'Flashings and downpipes', say: ['downpipe'] },
  ],
};

/** The factor in force: the operator's override if typed, else from the pitch, else none. */
export function planeFactor(area: Area): { factor: number; source: 'override' | 'pitch' | 'missing' } {
  const typed = num(area.fields, 'factor');
  if (typed > 0) return { factor: typed, source: 'override' };
  const pitch = str(area.fields, 'pitch');
  if (pitch === '' || !Number.isFinite(Number(pitch))) return { factor: 0, source: 'missing' };
  return { factor: pitchFactor(Number(pitch)), source: 'pitch' };
}

function takeoff(job: Job): TakeoffLine[] {
  const out: TakeoffLine[] = [];
  for (const a of job.areas) {
    if (a.kind !== plane.id) continue;
    const add = (part: string, label: string, qty: number, unit: TakeoffLine['unit'], rateKey: string) => {
      if (roundQty(qty, unit) > 0) out.push({ key: `${a.id}:${part}`, label: `${a.name}: ${label}`, qty, unit, rateKey, areaId: a.id });
    };
    add('roof', 'roofing', num(a.fields, 'planArea') * planeFactor(a).factor, 'm2', 'roof');
    for (const l of LENGTHS) add(l.key, l.label.toLowerCase(), num(a.fields, l.key), 'lm', l.rateKey);
    add('flashingLm', 'flashings', num(a.fields, 'flashingLm'), 'lm', 'flashingLm');
    add('flashingEach', 'flashings', int(a.fields, 'flashingEach'), 'each', 'flashingEach');
    add('gutter', 'gutters', num(a.fields, 'gutter'), 'lm', 'gutter');
    add('downpipes', 'downpipes', int(a.fields, 'downpipes'), 'each', 'downpipe');
  }
  return out;
}

function checkSummary(job: Job): CheckRow[] {
  const rows: CheckRow[] = [];
  for (const a of job.areas) {
    if (a.kind !== plane.id) continue;
    const m = (label: string, value: string) => rows.push({ areaId: a.id, group: a.name, label, value, kind: 'measured' });
    const c = (label: string, value: string) => rows.push({ areaId: a.id, group: a.name, label, value, kind: 'calculated' });
    const planArea = num(a.fields, 'planArea');
    const pf = planeFactor(a);
    const pitch = str(a.fields, 'pitch');

    m('Plan area', `${formatQty(roundTo(planArea, 2), 'hr')} m²`);
    m('Pitch', pitch === '' ? 'not set' : `${pitch}°`);
    for (const l of LENGTHS) if (num(a.fields, l.key) > 0) m(l.label, `${formatQty(roundQty(num(a.fields, l.key), 'lm'), 'lm')} lm`);
    if (num(a.fields, 'gutter') > 0) m('Gutters', `${formatQty(roundQty(num(a.fields, 'gutter'), 'lm'), 'lm')} lm`);
    if (num(a.fields, 'flashingLm') > 0) m('Flashings', `${formatQty(roundQty(num(a.fields, 'flashingLm'), 'lm'), 'lm')} lm`);
    if (int(a.fields, 'flashingEach') > 0) m('Flashings', `${int(a.fields, 'flashingEach')} each`);
    if (int(a.fields, 'downpipes') > 0) m('Downpipes', `${int(a.fields, 'downpipes')} each`);

    c('Roof area', pf.source === 'missing' ? 'set the pitch' : `${formatQty(roundQty(planArea * pf.factor, 'm2'), 'm2')} m²`);
    c('Pitch factor', pf.source === 'missing' ? 'not set' : `${roundTo(pf.factor, 3)}${pf.source === 'override' ? ' (typed)' : ''}`);
  }
  return rows;
}

const system = (id: string, name: string) => ({ id, tradeId: 'roofer', name, rates: {} });

export const roofer: Trade = {
  id: 'roofer',
  name: 'Roofer',
  rateSetNoun: 'Roof system',
  areaKinds: [plane],
  rateKeys: [
    { key: 'roof', label: 'Roofing', unit: 'm2' },
    ...LENGTHS.map((l) => ({ key: l.rateKey, label: l.label, unit: 'lm' as const })),
    { key: 'flashingLm', label: 'Flashings by length', unit: 'lm' },
    { key: 'flashingEach', label: 'Flashings', unit: 'each' },
    { key: 'gutter', label: 'Gutters', unit: 'lm' },
    { key: 'downpipe', label: 'Downpipe', unit: 'each' },
  ],
  takeoff,
  checkSummary,
  // v1 has no roofing rates, so every rate ships unset.
  defaultRateSets: [system('iron', 'Iron'), system('tile', 'Tile'), system('membrane', 'Membrane')],
  suggestedExtras: ['Access', 'Scaffold', 'Edge protection', 'Rubbish'],
};
