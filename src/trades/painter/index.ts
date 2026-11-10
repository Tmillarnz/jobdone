import { bool, int, metres, num, numList, str } from '../../core/fields';
import { formatQty, roundQty } from '../../core/money';
import type { Area, AreaKind, CheckRow, Job, TakeoffLine, Trade } from '../../core/types';

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
        { value: 'walls', label: 'Wall lengths' },
        { value: 'plan', label: 'Floor area and perimeter (drawn plan)' },
      ],
    },
    { key: 'length', label: 'Length', type: 'number', unit: 'm', group: 'Size', showIf: { key: 'shape', in: ['rect'] }, say: ['long'] },
    { key: 'width', label: 'Width', type: 'number', unit: 'm', group: 'Size', showIf: { key: 'shape', in: ['rect'] }, say: ['wide'] },
    {
      key: 'wallLengths', label: 'Wall lengths', type: 'numberList', unit: 'm', group: 'Size',
      help: 'Each wall in metres, separated by spaces. For example: 4 3.6 4 3.6',
      showIf: { key: 'shape', in: ['walls'] },
    },
    {
      key: 'floorArea', label: 'Floor area', type: 'number', unit: 'm²', group: 'Size',
      help: 'Filled in by Draw. With wall lengths, type it for the ceiling.',
      showIf: { key: 'shape', in: ['plan', 'walls'] }, say: ['floor', 'area'],
    },
    { key: 'perimeter', label: 'Perimeter', type: 'number', unit: 'm', group: 'Size', showIf: { key: 'shape', in: ['plan'] } },
    { key: 'height', label: 'Height', type: 'number', unit: 'm', group: 'Size', say: ['high', 'stud'] },

    { key: 'doors', label: 'Doors', type: 'integer', default: 0, group: 'Openings', say: ['door'] },
    { key: 'doorWidth', label: 'Door width', type: 'number', unit: 'm', default: 0.8, group: 'Openings', help: 'Comes off the skirting for each door.' },
    { key: 'timberWindows', label: 'Timber window frames', type: 'integer', default: 0, group: 'Openings', say: ['timber windows', 'timber window', 'timber frames'] },
    { key: 'otherWindows', label: 'PVC or aluminium windows', type: 'integer', default: 0, group: 'Openings', help: 'Counted for the record. Not painted, so no line.', say: ['pvc windows', 'aluminium windows', 'pvc window', 'aluminium window'] },
    { key: 'slider', label: 'Ranch slider or glass wall', type: 'boolean', default: false, group: 'Openings', help: 'Deducted from walls and skirting. Standard doors and windows are not deducted.', say: ['ranch slider', 'slider', 'glass wall'] },
    { key: 'sliderWidth', label: 'Slider width', type: 'number', unit: 'm', group: 'Openings', showIf: { key: 'slider', in: [true] } },
    { key: 'sliderHeight', label: 'Slider height', type: 'number', unit: 'm', group: 'Openings', showIf: { key: 'slider', in: [true] } },

    { key: 'paintCeiling', label: 'Ceiling', type: 'boolean', default: true, group: 'Scope' },
    { key: 'skirting', label: 'Skirting', type: 'boolean', default: true, group: 'Scope' },
    { key: 'scotia', label: 'Scotia', type: 'boolean', default: true, group: 'Scope' },
    {
      key: 'wallpaper', label: 'Wallpaper', type: 'select', default: 'none', group: 'Scope',
      options: [
        { value: 'none', label: 'None' },
        { value: 'strip', label: 'Strip' },
        { value: 'hang', label: 'Hang' },
        { value: 'strip_hang', label: 'Strip and hang' },
      ],
    },
    { key: 'wallpaperQty', label: 'Wallpaper area', type: 'number', unit: 'm²', group: 'Scope', help: 'Leave blank to use the wall area.', showIf: { key: 'wallpaper', in: ['strip', 'hang', 'strip_hang'] } },
    { key: 'paintWalls', label: 'Paint the walls as well', type: 'boolean', default: false, group: 'Scope', help: 'Hanging wallpaper removes the wall paint line unless this is on.', showIf: { key: 'wallpaper', in: ['hang', 'strip_hang'] } },
  ],
};

export interface RoomSizes {
  perimeter: number;
  floor: number;
  height: number;
  sliderWidth: number;
  sliderArea: number;
  walls: number;
  skirting: number;
}

export function roomSizes(area: Area): RoomSizes {
  const f = area.fields;
  const shape = str(f, 'shape') || 'rect';
  let perimeter = 0;
  let floor = 0;
  if (shape === 'walls') {
    perimeter = numList(f, 'wallLengths').reduce((s, n) => s + n, 0);
    floor = num(f, 'floorArea');
  } else if (shape === 'plan') {
    perimeter = num(f, 'perimeter');
    floor = num(f, 'floorArea');
  } else {
    const l = num(f, 'length');
    const w = num(f, 'width');
    perimeter = l > 0 && w > 0 ? 2 * (l + w) : 0;
    floor = l * w;
  }
  const height = num(f, 'height');
  const flagged = bool(f, 'slider');
  const sliderWidth = flagged ? num(f, 'sliderWidth') : 0;
  const sliderArea = flagged ? sliderWidth * num(f, 'sliderHeight') : 0;
  const walls = Math.max(0, perimeter * height - sliderArea);
  const skirting = Math.max(0, perimeter - int(f, 'doors') * num(f, 'doorWidth') - sliderWidth);
  return { perimeter, floor, height, sliderWidth, sliderArea, walls, skirting };
}

function takeoff(job: Job): TakeoffLine[] {
  const out: TakeoffLine[] = [];
  for (const a of job.areas) {
    if (a.kind !== room.id) continue;
    const f = a.fields;
    const s = roomSizes(a);
    const add = (part: string, label: string, qty: number, unit: TakeoffLine['unit'], rateKey: string) => {
      if (roundQty(qty, unit) > 0) out.push({ key: `${a.id}:${part}`, label: `${a.name}: ${label}`, qty, unit, rateKey, areaId: a.id });
    };
    const paper = str(f, 'wallpaper');
    const hang = paper === 'hang' || paper === 'strip_hang';
    const strip = paper === 'strip' || paper === 'strip_hang';
    // Price on the wall area the operator sees, so wallpaper matches the walls line.
    const paperQty = num(f, 'wallpaperQty') || roundQty(s.walls, 'm2');

    if (!hang || bool(f, 'paintWalls')) add('walls', 'walls', s.walls, 'm2', 'walls');
    if (bool(f, 'paintCeiling')) add('ceiling', 'ceiling', s.floor, 'm2', 'ceiling');
    if (bool(f, 'skirting')) add('skirting', 'skirting', s.skirting, 'lm', 'trim');
    if (bool(f, 'scotia')) add('scotia', 'scotia', s.perimeter, 'lm', 'trim');
    add('doors', 'doors, both faces and frame', int(f, 'doors'), 'each', 'door');
    add('windowFrames', 'timber window frames', int(f, 'timberWindows'), 'each', 'windowFrame');
    if (strip) add('wallpaperStrip', 'wallpaper strip', paperQty, 'm2', 'wallpaperStrip');
    if (hang) add('wallpaperHang', 'wallpaper hang', paperQty, 'm2', 'wallpaperHang');
  }
  return out;
}

function checkSummary(job: Job): CheckRow[] {
  const rows: CheckRow[] = [];
  for (const a of job.areas) {
    if (a.kind !== room.id) continue;
    const f = a.fields;
    const s = roomSizes(a);
    const shape = str(f, 'shape') || 'rect';
    const m = (label: string, value: string) => rows.push({ areaId: a.id, group: a.name, label, value, kind: 'measured' });
    const c = (label: string, value: string) => rows.push({ areaId: a.id, group: a.name, label, value, kind: 'calculated' });

    if (shape === 'rect') {
      m('Length', metres(num(f, 'length')));
      m('Width', metres(num(f, 'width')));
    } else if (shape === 'walls') {
      m('Wall lengths', numList(f, 'wallLengths').map((n) => metres(n)).join(', ') || 'none');
      m('Floor area', `${formatQty(num(f, 'floorArea'), 'm2')} m²`);
    } else {
      m('Floor area', `${formatQty(num(f, 'floorArea'), 'm2')} m²`);
      m('Perimeter', metres(num(f, 'perimeter')));
    }
    m('Height', metres(s.height));
    m('Doors', `${int(f, 'doors')} at ${metres(num(f, 'doorWidth'))}`);
    m('Timber window frames', String(int(f, 'timberWindows')));
    m('PVC or aluminium windows', `${int(f, 'otherWindows')} (not painted)`);
    if (bool(f, 'slider')) {
      m('Ranch slider or glass wall', s.sliderArea > 0 ? `${metres(s.sliderWidth)} × ${metres(num(f, 'sliderHeight'))}` : 'flagged, size missing');
    }

    if (shape !== 'plan') c('Perimeter', metres(s.perimeter));
    c('Walls', `${formatQty(roundQty(s.walls, 'm2'), 'm2')} m²${s.sliderArea > 0 ? ' after slider' : ''}`);
    c('Ceiling', `${formatQty(roundQty(s.floor, 'm2'), 'm2')} m²`);
    c('Skirting', `${formatQty(roundQty(s.skirting, 'lm'), 'lm')} lm`);
    c('Scotia', `${formatQty(roundQty(s.perimeter, 'lm'), 'lm')} lm`);
  }
  return rows;
}

// Value rates are the per-unit rates v1 shipped. v1 had no per-unit Premium
// rates and no window frame rate, so those ship unset and show "set rate".
const wallpaper = { wallpaperStrip: 1200, wallpaperHang: 1800 };

export const painter: Trade = {
  id: 'painter',
  name: 'Painter',
  rateSetNoun: 'Coating',
  areaKinds: [room],
  rateKeys: [
    { key: 'walls', label: 'Walls', unit: 'm2' },
    { key: 'ceiling', label: 'Ceiling', unit: 'm2' },
    { key: 'trim', label: 'Trim (skirting, scotia)', unit: 'lm' },
    { key: 'door', label: 'Door, both faces and frame', unit: 'each' },
    { key: 'windowFrame', label: 'Timber window frame', unit: 'each' },
    { key: 'wallpaperStrip', label: 'Wallpaper strip', unit: 'm2' },
    { key: 'wallpaperHang', label: 'Wallpaper hang', unit: 'm2' },
  ],
  takeoff,
  checkSummary,
  defaultRateSets: [
    { id: 'value', tradeId: 'painter', name: 'Value', rates: { walls: 1800, ceiling: 1600, trim: 800, door: 8500, windowFrame: 0, ...wallpaper } },
    { id: 'premium', tradeId: 'painter', name: 'Premium', rates: { walls: 0, ceiling: 0, trim: 0, door: 0, windowFrame: 0, ...wallpaper } },
  ],
  suggestedExtras: ['Access', 'Scaffold', 'Furniture moving', 'Plaster repairs', 'Travel'],
};
