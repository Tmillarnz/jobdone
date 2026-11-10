import { int, num, str } from '../../core/fields';
import { formatQty, roundQty } from '../../core/money';
import type { AreaKind, CheckRow, Job, RateKeyDef, TakeoffLine, Trade } from '../../core/types';

const FIXTURES = [
  { value: 'basin', label: 'Basin' },
  { value: 'toilet', label: 'Toilet' },
  { value: 'shower', label: 'Shower' },
  { value: 'bath', label: 'Bath' },
  { value: 'sink', label: 'Sink' },
  { value: 'washingMachine', label: 'Washing machine' },
  { value: 'dishwasher', label: 'Dishwasher' },
  { value: 'hotWaterCylinder', label: 'Hot water cylinder' },
  { value: 'outsideTap', label: 'Outside tap' },
];
const POINT_TYPES = [
  { value: 'new', label: 'New' },
  { value: 'relocate', label: 'Relocate' },
  { value: 'replace', label: 'Replace' },
];
/** Appliances and the hot water cylinder can carry a grade. */
const GRADED = ['washingMachine', 'dishwasher', 'hotWaterCylinder'];
const PIPES = [
  { key: 'hot', label: 'Hot' },
  { key: 'cold', label: 'Cold' },
  { key: 'waste', label: 'Waste' },
  { key: 'gas', label: 'Gas' },
];

const fixture: AreaKind = {
  id: 'fixture',
  name: 'Fixture',
  fields: [
    { key: 'fixture', label: 'Fixture', type: 'select', default: 'basin', options: FIXTURES },
    { key: 'pointType', label: 'Point type', type: 'select', default: 'new', options: POINT_TYPES },
    { key: 'qty', label: 'How many', type: 'integer', default: 1 },
    {
      key: 'grade', label: 'Grade', type: 'select', default: '',
      options: [
        { value: '', label: 'Not stated' },
        { value: 'standard', label: 'Standard' },
        { value: 'specified', label: 'Specified' },
      ],
      help: 'Shown on the line. It does not change the rate.',
      showIf: { key: 'fixture', in: GRADED },
    },
  ],
};

const pipeRun: AreaKind = {
  id: 'pipeRun',
  name: 'Pipe run',
  fields: PIPES.map((p) => ({ key: p.key, label: p.label, type: 'number' as const, unit: 'm' })),
};

const labelOf = (list: { value: string; label: string }[], v: string) => list.find((o) => o.value === v)?.label ?? v;

function fixtureLabel(fields: Job['areas'][number]['fields']): string {
  const f = str(fields, 'fixture');
  const grade = GRADED.includes(f) ? str(fields, 'grade') : '';
  return `${labelOf(FIXTURES, f).toLowerCase()}, ${labelOf(POINT_TYPES, str(fields, 'pointType')).toLowerCase()}${grade ? `, ${grade}` : ''}`;
}

function takeoff(job: Job): TakeoffLine[] {
  const out: TakeoffLine[] = [];
  for (const a of job.areas) {
    if (a.kind === fixture.id) {
      const qty = int(a.fields, 'qty');
      if (qty > 0) {
        out.push({
          key: `${a.id}:fixture`,
          label: `${a.name}: ${fixtureLabel(a.fields)}`,
          qty,
          unit: 'each',
          rateKey: `${str(a.fields, 'fixture')}.${str(a.fields, 'pointType')}`,
          areaId: a.id,
        });
      }
    } else if (a.kind === pipeRun.id) {
      for (const p of PIPES) {
        const lm = num(a.fields, p.key);
        if (roundQty(lm, 'lm') > 0) {
          out.push({ key: `${a.id}:${p.key}`, label: `${a.name}: ${p.label.toLowerCase()} pipe`, qty: lm, unit: 'lm', rateKey: `pipe.${p.key}`, areaId: a.id });
        }
      }
    }
  }
  return out;
}

function checkSummary(job: Job): CheckRow[] {
  const rows: CheckRow[] = [];
  for (const a of job.areas) {
    if (a.kind === fixture.id) {
      rows.push({ areaId: a.id, group: a.name, label: 'Fixture', value: fixtureLabel(a.fields), kind: 'measured' });
      rows.push({ areaId: a.id, group: a.name, label: 'Points', value: `${int(a.fields, 'qty')} each`, kind: 'calculated' });
    } else if (a.kind === pipeRun.id) {
      let total = 0;
      for (const p of PIPES) {
        const lm = num(a.fields, p.key);
        total += roundQty(lm, 'lm');
        if (lm > 0) rows.push({ areaId: a.id, group: a.name, label: p.label, value: `${formatQty(roundQty(lm, 'lm'), 'lm')} lm`, kind: 'measured' });
      }
      rows.push({ areaId: a.id, group: a.name, label: 'Pipe in total', value: `${formatQty(total, 'lm')} lm`, kind: 'calculated' });
    }
  }
  return rows;
}

const rateKeys: RateKeyDef[] = [
  ...FIXTURES.flatMap((f) => POINT_TYPES.map((p) => ({ key: `${f.value}.${p.value}`, label: `${f.label}, ${p.label.toLowerCase()}`, unit: 'each' as const }))),
  ...PIPES.map((p) => ({ key: `pipe.${p.key}`, label: `${p.label} pipe`, unit: 'lm' as const })),
];

export const plumber: Trade = {
  id: 'plumber',
  name: 'Plumber',
  rateSetNoun: 'Rate set',
  areaKinds: [fixture, pipeRun],
  rateKeys,
  takeoff,
  checkSummary,
  // v1 has no plumbing rates, so every rate ships unset.
  defaultRateSets: [{ id: 'standard', tradeId: 'plumber', name: 'Standard', rates: {} }],
  suggestedExtras: ['Access', 'Concrete cut', 'Travel', 'After-hours', 'Consent fees'],
};
