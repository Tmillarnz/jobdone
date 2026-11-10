import { describe, expect, it } from 'vitest';
import { roundQty } from '../../core/money';
import { regenerateJob } from '../../core/regenerate';
import { seededRateSets } from '../../core/settings';
import { job } from '../../core/testkit';
import type { FieldValue, Job } from '../../core/types';
import { painter } from './index';

const defaults = Object.fromEntries(
  painter.areaKinds[0]!.fields.filter((f) => f.default !== undefined).map((f) => [f.key, f.default!]),
);
const roomJob = (fields: Record<string, FieldValue>, over: Partial<Job> = {}): Job =>
  job({
    tradeId: 'painter',
    rateSetId: 'painter:value',
    areas: [{ id: 'r1', kind: 'room', name: 'Lounge', fields: { ...defaults, ...fields } }],
    ...over,
  });
const qtys = (j: Job) =>
  Object.fromEntries(painter.takeoff(j).map((l) => [l.key.split(':')[1], roundQty(l.qty, l.unit)]));

describe('painter worked check (brief 8.1)', () => {
  const j = roomJob({ length: 4.0, width: 3.6, height: 2.4, doors: 1, otherWindows: 2 });

  it('4.0 × 3.6 × 2.4, one door, two PVC windows', () => {
    const q = qtys(j);
    expect(q.walls).toBe(36.5);
    expect(q.ceiling).toBe(14.4);
    expect(q.skirting).toBe(14.4);
    expect(q.doors).toBe(1);
    expect(q.scotia).toBe(15.2);
    expect(Object.keys(q).some((k) => /window/i.test(k))).toBe(false);
    expect(Object.keys(q).sort()).toEqual(['ceiling', 'doors', 'scotia', 'skirting', 'walls']);
  });

  it('prices on the Value rates from v1', () => {
    const { job: priced } = regenerateJob(j, painter.takeoff, seededRateSets(painter));
    const by = Object.fromEntries(priced.lines.map((l) => [l.key.split(':')[1], l]));
    expect(by.walls).toMatchObject({ qty: 36.5, unit: 'm2', rateCents: 1800 });
    expect(by.ceiling).toMatchObject({ qty: 14.4, rateCents: 1600 });
    expect(by.skirting).toMatchObject({ qty: 14.4, unit: 'lm', rateCents: 800 });
    expect(by.doors).toMatchObject({ qty: 1, unit: 'each', rateCents: 8500 });
  });

  it('ships Premium paint rates unset, to be set in Settings', () => {
    const { job: priced } = regenerateJob({ ...j, rateSetId: 'painter:premium' }, painter.takeoff, seededRateSets(painter));
    expect(priced.lines.every((l) => l.rateCents === 0)).toBe(true);
  });

  it('shows the measured and calculated numbers on Check', () => {
    const rows = Object.fromEntries(painter.checkSummary(j).map((r) => [`${r.kind}:${r.label}`, r.value]));
    expect(rows['measured:Length']).toBe('4 m');
    expect(rows['measured:Doors']).toBe('1 at 0.8 m');
    expect(rows['calculated:Perimeter']).toBe('15.2 m');
    expect(rows['calculated:Walls']).toBe('36.5 m²');
    expect(rows['calculated:Skirting']).toBe('14.4 lm');
  });
});

describe('painter openings', () => {
  it('does not deduct standard doors and windows from walls', () => {
    const a = qtys(roomJob({ length: 4, width: 3.6, height: 2.4 }));
    const b = qtys(roomJob({ length: 4, width: 3.6, height: 2.4, doors: 3, otherWindows: 4, timberWindows: 2 }));
    expect(b.walls).toBe(a.walls);
  });

  it('deducts a slider from walls and skirting only when flagged', () => {
    const size = { length: 4, width: 3.6, height: 2.4, sliderWidth: 2.4, sliderHeight: 2 };
    expect(qtys(roomJob(size)).walls).toBe(36.5);
    const q = qtys(roomJob({ ...size, slider: true }));
    expect(q.walls).toBe(31.7); // 36.48 − 4.8
    expect(q.skirting).toBe(12.8); // 15.2 − 2.4
    expect(q.scotia).toBe(15.2); // full perimeter
  });

  it('takes door widths off skirting', () => {
    expect(qtys(roomJob({ length: 4, width: 3.6, height: 2.4, doors: 2 })).skirting).toBe(13.6);
    expect(qtys(roomJob({ length: 4, width: 3.6, height: 2.4, doors: 2, doorWidth: 0.9 })).skirting).toBe(13.4);
    expect(qtys(roomJob({ length: 1, width: 1, height: 2.4, doors: 9 })).skirting).toBeUndefined();
  });

  it('gives a line for timber frames and none for PVC or aluminium', () => {
    const q = qtys(roomJob({ length: 4, width: 3.6, height: 2.4, timberWindows: 2, otherWindows: 3 }));
    expect(q.windowFrames).toBe(2);
  });
});

describe('painter room shapes', () => {
  it('takes a list of wall lengths', () => {
    const q = qtys(roomJob({ shape: 'walls', wallLengths: '4 3.6, 4 3.6', floorArea: 14.4, height: 2.4, doors: 1 }));
    expect(q).toMatchObject({ walls: 36.5, ceiling: 14.4, skirting: 14.4 });
  });
  it('gives no ceiling line from wall lengths alone', () => {
    const q = qtys(roomJob({ shape: 'walls', wallLengths: '4 3.6 4 3.6', height: 2.4 }));
    expect(q.walls).toBe(36.5);
    expect(q.ceiling).toBeUndefined();
  });
  it('takes a drawn plan as floor area and perimeter', () => {
    const q = qtys(roomJob({ shape: 'plan', floorArea: 19, perimeter: 20, height: 2.4 }));
    expect(q).toMatchObject({ walls: 48, ceiling: 19, skirting: 20, scotia: 20 });
  });
  it('gives no lines for an unmeasured room', () => {
    expect(painter.takeoff(roomJob({}))).toEqual([]);
  });
});

describe('painter scope and wallpaper', () => {
  const size = { length: 4, width: 3.6, height: 2.4 };
  it('drops ceiling, skirting and scotia when turned off', () => {
    const q = qtys(roomJob({ ...size, paintCeiling: false, skirting: false, scotia: false }));
    expect(Object.keys(q)).toEqual(['walls']);
  });
  it('strip adds a line at wall m² and keeps the walls paint line', () => {
    const q = qtys(roomJob({ ...size, wallpaper: 'strip' }));
    expect(q.wallpaperStrip).toBe(36.5);
    expect(q.walls).toBe(36.5);
    expect(q.wallpaperHang).toBeUndefined();
  });
  it('hang removes the walls paint line unless paint is turned back on', () => {
    const q = qtys(roomJob({ ...size, wallpaper: 'hang' }));
    expect(q.wallpaperHang).toBe(36.5);
    expect(q.walls).toBeUndefined();
    expect(qtys(roomJob({ ...size, wallpaper: 'hang', paintWalls: true })).walls).toBe(36.5);
  });
  it('strip and hang gives both lines, with an editable quantity', () => {
    const q = qtys(roomJob({ ...size, wallpaper: 'strip_hang', wallpaperQty: 20 }));
    expect(q).toMatchObject({ wallpaperStrip: 20, wallpaperHang: 20 });
    expect(q.walls).toBeUndefined();
  });
  it('prices a room on its own coating when it has one', () => {
    const j = roomJob(size);
    j.areas[0]!.rateSetId = 'painter:premium';
    const sets = seededRateSets(painter);
    sets.find((s) => s.id === 'painter:premium')!.rates.walls = 2400;
    const { job: priced } = regenerateJob(j, painter.takeoff, sets);
    expect(priced.lines.find((l) => l.key === 'r1:walls')?.rateCents).toBe(2400);
  });
});
