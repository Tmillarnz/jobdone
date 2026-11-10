import { bool, int, metres, num, str } from '../../core/fields';
import { formatQty, roundQty } from '../../core/money';
import type { Area, AreaKind, CheckRow, FieldDef, Job, TakeoffLine, Trade, Unit } from '../../core/types';

const openings: FieldDef[] = [
  { key: 'doors', label: 'Doors', type: 'integer', default: 0, group: 'Openings', say: ['door'] },
  { key: 'windows', label: 'Windows', type: 'integer', default: 0, group: 'Openings', say: ['window'] },
];
const item = (key: string, label: string, help: string): FieldDef => ({ key, label, type: 'boolean', default: false, group: 'Work items', help });
const labour: FieldDef = { key: 'labourHours', label: 'Labour', type: 'number', unit: 'hours', group: 'Work items', say: ['hours', 'hour'] };

const room: AreaKind = {
  id: 'room',
  name: 'Room',
  plan: { areaField: 'floorArea', perimeterField: 'perimeter', set: { shape: 'plan' } },
  spokenDims: ['length', 'width', 'height'],
  fields: [
    {
      key: 'shape', label: 'Measure by', type: 'select', default: 'rect', group: 'Size',
      options: [
        { value: 'rect', label: 'Length and width' },
        { value: 'plan', label: 'Floor area and perimeter (drawn plan)' },
      ],
    },
    { key: 'length', label: 'Length', type: 'number', unit: 'm', group: 'Size', showIf: { key: 'shape', in: ['rect'] }, say: ['long'] },
    { key: 'width', label: 'Width', type: 'number', unit: 'm', group: 'Size', showIf: { key: 'shape', in: ['rect'] }, say: ['wide'] },
    { key: 'floorArea', label: 'Floor area', type: 'number', unit: 'm²', group: 'Size', showIf: { key: 'shape', in: ['plan'] } },
    { key: 'perimeter', label: 'Perimeter', type: 'number', unit: 'm', group: 'Size', showIf: { key: 'shape', in: ['plan'] } },
    { key: 'height', label: 'Height', type: 'number', unit: 'm', group: 'Size', say: ['high', 'stud'] },
    ...openings,
    item('liningWalls', 'Lining, walls', 'Starts at the wall m².'),
    item('liningCeiling', 'Lining, ceiling', 'Starts at the ceiling m².'),
    item('decking', 'Decking', 'Starts at the floor m².'),
    item('framing', 'Framing', 'Starts at the perimeter.'),
    item('trim', 'Trim', 'Starts at the perimeter.'),
    labour,
  ],
};

const elevation: AreaKind = {
  id: 'elevation',
  name: 'Elevation',
  spokenDims: ['width', 'height'],
  fields: [
    { key: 'width', label: 'Width', type: 'number', unit: 'm', group: 'Size', say: ['wide', 'long'] },
    { key: 'height', label: 'Height', type: 'number', unit: 'm', group: 'Size', say: ['high'] },
    ...openings,
    item('cladding', 'Cladding', 'Starts at the gross m². Openings are not deducted.'),
    item('lining', 'Lining', 'Starts at the gross m². Openings are not deducted.'),
    item('framing', 'Framing', 'Starts at the width.'),
    labour,
  ],
};

export interface RoomFigures { perimeter: number; floor: number; walls: number; ceiling: number }

export function roomFigures(area: Area): RoomFigures {
  const f = area.fields;
  let perimeter: number;
  let floor: number;
  if (str(f, 'shape') === 'plan') {
    perimeter = num(f, 'perimeter');
    floor = num(f, 'floorArea');
  } else {
    const l = num(f, 'length');
    const w = num(f, 'width');
    perimeter = l > 0 && w > 0 ? 2 * (l + w) : 0;
    floor = l * w;
  }
  return { perimeter, floor, walls: perimeter * num(f, 'height'), ceiling: floor };
}

export const elevationGross = (area: Area) => num(area.fields, 'width') * num(area.fields, 'height');

function takeoff(job: Job): TakeoffLine[] {
  const out: TakeoffLine[] = [];
  for (const a of job.areas) {
    const f = a.fields;
    const add = (part: string, label: string, qty: number, unit: Unit, rateKey: string) => {
      const has = unit === 'hr' ? qty > 0 : roundQty(qty, unit) > 0;
      if (has) out.push({ key: `${a.id}:${part}`, label: `${a.name}: ${label}`, qty, unit, rateKey, areaId: a.id });
    };
    // A ticked work item starts at the matching measured figure. The operator can change it on the estimate.
    if (a.kind === room.id) {
      const r = roomFigures(a);
      if (bool(f, 'liningWalls')) add('liningWalls', 'wall lining', r.walls, 'm2', 'lining');
      if (bool(f, 'liningCeiling')) add('liningCeiling', 'ceiling lining', r.ceiling, 'm2', 'lining');
      if (bool(f, 'decking')) add('decking', 'decking', r.floor, 'm2', 'decking');
      if (bool(f, 'framing')) add('framing', 'framing', r.perimeter, 'lm', 'framing');
      if (bool(f, 'trim')) add('trim', 'trim', r.perimeter, 'lm', 'trim');
    } else if (a.kind === elevation.id) {
      const gross = elevationGross(a);
      if (bool(f, 'cladding')) add('cladding', 'cladding', gross, 'm2', 'cladding');
      if (bool(f, 'lining')) add('lining', 'lining', gross, 'm2', 'lining');
      if (bool(f, 'framing')) add('framing', 'framing', num(f, 'width'), 'lm', 'framing');
    } else continue;
    add('doors', 'doors', int(f, 'doors'), 'each', 'door');
    add('windows', 'windows', int(f, 'windows'), 'each', 'window');
    add('labour', 'labour', num(f, 'labourHours'), 'hr', 'labour');
  }
  return out;
}

function checkSummary(job: Job): CheckRow[] {
  const rows: CheckRow[] = [];
  const m2 = (n: number) => `${formatQty(roundQty(n, 'm2'), 'm2')} m²`;
  for (const a of job.areas) {
    const f = a.fields;
    const m = (label: string, value: string) => rows.push({ areaId: a.id, group: a.name, label, value, kind: 'measured' });
    const c = (label: string, value: string) => rows.push({ areaId: a.id, group: a.name, label, value, kind: 'calculated' });
    if (a.kind === room.id) {
      const r = roomFigures(a);
      if (str(f, 'shape') === 'plan') {
        m('Floor area', m2(num(f, 'floorArea')));
        m('Perimeter', metres(num(f, 'perimeter')));
      } else {
        m('Length', metres(num(f, 'length')));
        m('Width', metres(num(f, 'width')));
      }
      m('Height', metres(num(f, 'height')));
      c('Walls', m2(r.walls));
      c('Ceiling', m2(r.ceiling));
      c('Floor', m2(r.floor));
      c('Perimeter', `${formatQty(roundQty(r.perimeter, 'lm'), 'lm')} lm`);
    } else if (a.kind === elevation.id) {
      m('Width', metres(num(f, 'width')));
      m('Height', metres(num(f, 'height')));
      c('Gross area', m2(elevationGross(a)));
    } else continue;
    m('Doors', `${int(f, 'doors')} each`);
    m('Windows', `${int(f, 'windows')} each`);
    if (num(f, 'labourHours') > 0) m('Labour', `${formatQty(num(f, 'labourHours'), 'hr')} hr`);
  }
  return rows;
}

export const builder: Trade = {
  id: 'builder',
  name: 'Builder',
  rateSetNoun: 'Rate set',
  areaKinds: [room, elevation],
  rateKeys: [
    { key: 'cladding', label: 'Cladding', unit: 'm2' },
    { key: 'lining', label: 'Lining', unit: 'm2' },
    { key: 'decking', label: 'Decking', unit: 'm2' },
    { key: 'framing', label: 'Framing', unit: 'lm' },
    { key: 'trim', label: 'Trim', unit: 'lm' },
    { key: 'labour', label: 'Labour', unit: 'hr' },
    { key: 'door', label: 'Door', unit: 'each' },
    { key: 'window', label: 'Window', unit: 'each' },
  ],
  takeoff,
  checkSummary,
  // v1 has no building rates, so every rate ships unset.
  defaultRateSets: [{ id: 'standard', tradeId: 'builder', name: 'Standard', rates: {} }],
  suggestedExtras: ['Materials', 'Variation', 'Scaffold', 'Rubbish removal', 'Travel'],
};
