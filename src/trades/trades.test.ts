import { describe, expect, it } from 'vitest';
import { unionArea } from '../core/geometry';
import { roundQty, totals } from '../core/money';
import { confirmQuote } from '../core/quote';
import { regenerateJob } from '../core/regenerate';
import { defaultSettings, seededRateSets } from '../core/settings';
import { job } from '../core/testkit';
import type { Area, FieldValue, Job, Trade } from '../core/types';
import { applyPlan } from '../ui/sizing/plan';
import { builder } from './builder';
import { painter } from './painter';
import { plumber } from './plumber';
import { registry } from './registry';
import { pitchFactor, roofer } from './roofer';

function area(trade: Trade, kindId: string, id: string, name: string, fields: Record<string, FieldValue>): Area {
  const kind = trade.areaKinds.find((k) => k.id === kindId)!;
  const defaults = Object.fromEntries(kind.fields.filter((f) => f.default !== undefined).map((f) => [f.key, f.default!]));
  return { id, kind: kindId, name, fields: { ...defaults, ...fields } };
}
const jobFor = (trade: Trade, areas: Area[]): Job => job({ tradeId: trade.id, rateSetId: seededRateSets(trade)[0]!.id, areas });
const lines = (trade: Trade, j: Job) =>
  Object.fromEntries(trade.takeoff(j).map((l) => [l.key, { qty: roundQty(l.qty, l.unit), unit: l.unit, rateKey: l.rateKey, label: l.label }]));

describe('plumber takeoff', () => {
  const j = jobFor(plumber, [
    area(plumber, 'fixture', 'f1', 'Bathroom', { fixture: 'basin', pointType: 'new', qty: 2 }),
    area(plumber, 'fixture', 'f2', 'Laundry', { fixture: 'washingMachine', pointType: 'relocate', grade: 'specified' }),
    area(plumber, 'fixture', 'f3', 'Cupboard', { fixture: 'hotWaterCylinder', pointType: 'replace' }),
    area(plumber, 'fixture', 'f4', 'Ensuite', { fixture: 'toilet', pointType: 'new', grade: 'specified' }),
    area(plumber, 'pipeRun', 'p1', 'Under floor', { hot: 6.24, cold: 8, waste: 3.55 }),
  ]);
  const l = lines(plumber, j);

  it('counts fixtures each, with rate key fixture.pointType', () => {
    expect(l['f1:fixture']).toMatchObject({ qty: 2, unit: 'each', rateKey: 'basin.new', label: 'Bathroom: basin, new' });
    expect(l['f2:fixture']).toMatchObject({ qty: 1, rateKey: 'washingMachine.relocate' });
    expect(l['f3:fixture']).toMatchObject({ qty: 1, rateKey: 'hotWaterCylinder.replace' });
  });
  it('shows the grade on appliances and the cylinder only, without changing the rate key', () => {
    expect(l['f2:fixture']!.label).toBe('Laundry: washing machine, relocate, specified');
    expect(l['f3:fixture']!.label).toBe('Cupboard: hot water cylinder, replace');
    expect(l['f4:fixture']!.label).toBe('Ensuite: toilet, new');
  });
  it('gives pipe runs in lm and skips empty ones', () => {
    expect(l['p1:hot']).toMatchObject({ qty: 6.2, unit: 'lm', rateKey: 'pipe.hot' });
    expect(l['p1:cold']).toMatchObject({ qty: 8, rateKey: 'pipe.cold' });
    expect(l['p1:waste']).toMatchObject({ qty: 3.6, rateKey: 'pipe.waste' });
    expect(l['p1:gas']).toBeUndefined();
  });
  it('has a rate for every fixture and point type, and each pipe', () => {
    const keys = plumber.rateKeys.map((k) => k.key);
    expect(keys).toHaveLength(9 * 3 + 4);
    for (const line of Object.values(l)) expect(keys).toContain(line.rateKey);
    expect(keys).toEqual(expect.arrayContaining(['outsideTap.new', 'bath.replace', 'sink.relocate', 'shower.new', 'dishwasher.new', 'pipe.gas']));
  });
  it('suggests the brief extras and ships no invented rates', () => {
    expect(plumber.suggestedExtras).toEqual(['Access', 'Concrete cut', 'Travel', 'After-hours', 'Consent fees']);
    const priced = regenerateJob(j, plumber.takeoff, seededRateSets(plumber)).job;
    expect(priced.lines.every((x) => x.rateCents === 0)).toBe(true);
  });
});

describe('roofer takeoff', () => {
  it('sets the pitch factor to 1 / cos(pitch)', () => {
    expect(pitchFactor(0)).toBe(1);
    expect(pitchFactor(30)).toBeCloseTo(1.1547, 4);
    expect(pitchFactor(45)).toBeCloseTo(Math.SQRT2, 10);
    expect(pitchFactor(22.5)).toBeCloseTo(1.0824, 4);
  });
  const full = { planArea: 100, pitch: '30', ridge: 12, hip: 5.5, valley: 3, barge: 16.24, gutter: 24, flashingLm: 6, flashingEach: 2, downpipes: 3 };

  it('multiplies plan area by the factor and lists lengths and counts', () => {
    const l = lines(roofer, jobFor(roofer, [area(roofer, 'roofPlane', 'r1', 'North face', full)]));
    expect(l['r1:roof']).toMatchObject({ qty: 115.5, unit: 'm2', rateKey: 'roof' });
    expect(l['r1:ridge']).toMatchObject({ qty: 12, unit: 'lm', rateKey: 'ridge' });
    expect(l['r1:hip']).toMatchObject({ qty: 5.5, rateKey: 'hip' });
    expect(l['r1:valley']).toMatchObject({ qty: 3, rateKey: 'valley' });
    expect(l['r1:barge']).toMatchObject({ qty: 16.2, rateKey: 'barge' });
    expect(l['r1:gutter']).toMatchObject({ qty: 24, unit: 'lm', rateKey: 'gutter' });
    expect(l['r1:flashingLm']).toMatchObject({ qty: 6, unit: 'lm' });
    expect(l['r1:flashingEach']).toMatchObject({ qty: 2, unit: 'each' });
    expect(l['r1:downpipes']).toMatchObject({ qty: 3, unit: 'each', rateKey: 'downpipe' });
  });
  it('lets the operator override the factor', () => {
    const l = lines(roofer, jobFor(roofer, [area(roofer, 'roofPlane', 'r1', 'A', { planArea: 100, pitch: '30', factor: 1.2 })]));
    expect(l['r1:roof']!.qty).toBe(120);
    const noPitch = lines(roofer, jobFor(roofer, [area(roofer, 'roofPlane', 'r1', 'A', { planArea: 50, factor: 1.05 })]));
    expect(noPitch['r1:roof']!.qty).toBe(52.5);
  });
  it('gives no roofing line until a pitch is chosen, and says so on Check', () => {
    const j = jobFor(roofer, [area(roofer, 'roofPlane', 'r1', 'A', { planArea: 100 })]);
    expect(lines(roofer, j)['r1:roof']).toBeUndefined();
    expect(roofer.checkSummary(j).find((r) => r.label === 'Roof area')?.value).toBe('set the pitch');
  });
  it('treats flat as a real pitch', () => {
    const l = lines(roofer, jobFor(roofer, [area(roofer, 'roofPlane', 'r1', 'A', { planArea: 80, pitch: '0' })]));
    expect(l['r1:roof']!.qty).toBe(80);
  });
  it('takes plan area from a drawn plan of rectangles', () => {
    const kind = roofer.areaKinds[0]!;
    const rects = [{ x: 0, y: 0, w: 10, h: 6 }, { x: 10, y: 0, w: 4, h: 3 }];
    const drawn = applyPlan(area(roofer, 'roofPlane', 'r1', 'A', { pitch: '25' }), kind, rects);
    expect(drawn.fields.planArea).toBe(72);
    expect(drawn.plan).toEqual(rects);
    expect(lines(roofer, jobFor(roofer, [drawn]))['r1:roof']!.qty).toBe(roundQty(unionArea(rects) * pitchFactor(25), 'm2'));
  });
  it('ships iron, tile and membrane systems and the brief extras', () => {
    expect(roofer.defaultRateSets.map((r) => r.name)).toEqual(['Iron', 'Tile', 'Membrane']);
    expect(roofer.suggestedExtras).toEqual(['Access', 'Scaffold', 'Edge protection', 'Rubbish']);
  });
  it('prices a plane on its own roof system', () => {
    const sets = seededRateSets(roofer);
    sets.find((s) => s.id === 'roofer:iron')!.rates.roof = 9500;
    sets.find((s) => s.id === 'roofer:membrane')!.rates.roof = 14000;
    const a = area(roofer, 'roofPlane', 'r1', 'Main', full);
    const b = { ...area(roofer, 'roofPlane', 'r2', 'Deck roof', { planArea: 10, pitch: '3' }), rateSetId: 'roofer:membrane' };
    const priced = regenerateJob(jobFor(roofer, [a, b]), roofer.takeoff, sets).job;
    expect(priced.lines.find((l) => l.key === 'r1:roof')?.rateCents).toBe(9500);
    expect(priced.lines.find((l) => l.key === 'r2:roof')?.rateCents).toBe(14000);
  });
});

describe('builder takeoff', () => {
  const roomFields = { length: 5, width: 4, height: 2.4, doors: 2, windows: 3 };
  const check = (j: Job) => Object.fromEntries(builder.checkSummary(j).map((r) => [`${r.group}/${r.label}`, r.value]));

  it('a room yields wall, ceiling and floor m² and perimeter lm', () => {
    const c = check(jobFor(builder, [area(builder, 'room', 'b1', 'Lounge', roomFields)]));
    expect(c['Lounge/Walls']).toBe('43.2 m²');
    expect(c['Lounge/Ceiling']).toBe('20.0 m²');
    expect(c['Lounge/Floor']).toBe('20.0 m²');
    expect(c['Lounge/Perimeter']).toBe('18.0 lm');
  });
  it('an elevation yields gross m²', () => {
    const c = check(jobFor(builder, [area(builder, 'elevation', 'e1', 'North', { width: 8.2, height: 2.7 })]));
    expect(c['North/Gross area']).toBe('22.1 m²');
  });
  it('counts openings each and adds nothing else until a work item is ticked', () => {
    const l = lines(builder, jobFor(builder, [area(builder, 'room', 'b1', 'Lounge', roomFields)]));
    expect(Object.keys(l)).toEqual(['b1:doors', 'b1:windows']);
    expect(l['b1:doors']).toMatchObject({ qty: 2, unit: 'each', rateKey: 'door' });
    expect(l['b1:windows']).toMatchObject({ qty: 3, unit: 'each', rateKey: 'window' });
  });
  it('pre-fills each room work item from the matching measured figure', () => {
    const l = lines(builder, jobFor(builder, [
      area(builder, 'room', 'b1', 'Lounge', { ...roomFields, liningWalls: true, liningCeiling: true, decking: true, framing: true, trim: true, labourHours: 6.25 }),
    ]));
    expect(l['b1:liningWalls']).toMatchObject({ qty: 43.2, unit: 'm2', rateKey: 'lining' });
    expect(l['b1:liningCeiling']).toMatchObject({ qty: 20, unit: 'm2', rateKey: 'lining' });
    expect(l['b1:decking']).toMatchObject({ qty: 20, unit: 'm2', rateKey: 'decking' });
    expect(l['b1:framing']).toMatchObject({ qty: 18, unit: 'lm', rateKey: 'framing' });
    expect(l['b1:trim']).toMatchObject({ qty: 18, unit: 'lm', rateKey: 'trim' });
    expect(l['b1:labour']).toMatchObject({ qty: 6.25, unit: 'hr', rateKey: 'labour' });
  });
  it('pre-fills elevation work items, without deducting openings', () => {
    const l = lines(builder, jobFor(builder, [
      area(builder, 'elevation', 'e1', 'North', { width: 8.2, height: 2.7, doors: 1, windows: 4, cladding: true, lining: true, framing: true }),
    ]));
    expect(l['e1:cladding']).toMatchObject({ qty: 22.1, unit: 'm2', rateKey: 'cladding' });
    expect(l['e1:lining']).toMatchObject({ qty: 22.1, rateKey: 'lining' });
    expect(l['e1:framing']).toMatchObject({ qty: 8.2, unit: 'lm' });
    expect(l['e1:windows']!.qty).toBe(4);
  });
  it('keeps an edited work item quantity when the job is regenerated', () => {
    const j = jobFor(builder, [area(builder, 'elevation', 'e1', 'North', { width: 8.2, height: 2.7, cladding: true })]);
    const sets = seededRateSets(builder);
    const first = regenerateJob(j, builder.takeoff, sets).job;
    const edited = { ...first, lines: first.lines.map((l) => ({ ...l, qty: 19.5, edited: true })) };
    edited.areas[0]!.fields.height = 3;
    expect(regenerateJob(edited, builder.takeoff, sets).job.lines[0]).toMatchObject({ key: 'e1:cladding', qty: 19.5, edited: true });
  });
  it('takes a drawn room as floor area and perimeter', () => {
    const drawn = applyPlan(area(builder, 'room', 'b1', 'Deck', { height: 0, decking: true, framing: true }), builder.areaKinds[0]!, [
      { x: 0, y: 0, w: 5, h: 3 }, { x: 0, y: 3, w: 2, h: 2 },
    ]);
    const l = lines(builder, jobFor(builder, [drawn]));
    expect(l['b1:decking']!.qty).toBe(19);
    expect(l['b1:framing']!.qty).toBe(20);
  });
});

describe('every registered trade', () => {
  it('has a unique id and at least one area kind and rate set', () => {
    expect(new Set(registry.map((t) => t.id)).size).toBe(registry.length);
    for (const t of registry) {
      expect(t.areaKinds.length).toBeGreaterThan(0);
      expect(t.defaultRateSets.length).toBeGreaterThan(0);
      expect(t.defaultRateSets.every((r) => r.tradeId === t.id)).toBe(true);
    }
  });
  it('only emits rate keys it declares, with keys unique in the job', () => {
    for (const t of registry) {
      // Fill every field of every kind so each line the trade can make is made.
      const areas = t.areaKinds.flatMap((k, i) => {
        const fields: Record<string, FieldValue> = {};
        for (const f of k.fields) {
          if (f.type === 'number') fields[f.key] = 3;
          else if (f.type === 'integer') fields[f.key] = 2;
          else if (f.type === 'boolean') fields[f.key] = true;
          else if (f.type === 'numberList') fields[f.key] = '3 3 3 3';
          else if (f.type === 'select') fields[f.key] = f.options!.at(-1)!.value;
        }
        return [{ id: `a${i}`, kind: k.id, name: k.name, fields }];
      });
      const out = t.takeoff(jobFor(t, areas));
      expect(out.length).toBeGreaterThan(0);
      expect(new Set(out.map((l) => l.key)).size).toBe(out.length);
      const declared = t.rateKeys.map((k) => k.key);
      for (const l of out) {
        expect(declared).toContain(l.rateKey);
        expect(t.rateKeys.find((k) => k.key === l.rateKey)!.unit).toBe(l.unit);
      }
      expect(t.checkSummary(jobFor(t, areas)).length).toBeGreaterThan(0);
    }
  });
  it('runs from a new job to a confirmed quote', () => {
    for (const t of registry) {
      const settings = defaultSettings(registry);
      const k = t.areaKinds[0]!;
      const fields: Record<string, FieldValue> = {};
      for (const f of k.fields) {
        if (f.default !== undefined) fields[f.key] = f.default;
        if (f.type === 'number') fields[f.key] = 4;
        if (f.type === 'integer') fields[f.key] = 1;
        if (f.type === 'boolean') fields[f.key] = true;
        if (f.type === 'select' && f.default === '') fields[f.key] = f.options![1]!.value;
      }
      const j = job({ tradeId: t.id, rateSetId: settings.defaultRateSetId[t.id]!, areas: [{ id: 'a', kind: k.id, name: k.name, fields }] });
      const priced = regenerateJob(j, t.takeoff, settings.rateSets).job;
      expect(priced.lines.length).toBeGreaterThan(0);
      const withRates = { ...priced, lines: priced.lines.map((l) => ({ ...l, rateCents: l.rateCents || 1000, edited: true })) };
      const q = confirmQuote(withRates, settings, 'UD-20261110-001', new Date());
      const sum = totals(q.lines, q.extras, q.chargeGst);
      expect(sum.subtotalCents).toBeGreaterThan(0);
      expect(sum.totalCents).toBe(sum.subtotalCents + Math.round(sum.subtotalCents * 0.15));
    }
  });
  it('lets a trade outside the four be added without touching core', () => {
    const hvac: Trade = { ...painter, id: 'hvac', name: 'HVAC', defaultRateSets: [{ id: 'std', tradeId: 'hvac', name: 'Standard', rates: {} }] };
    const s = defaultSettings([...registry, hvac]);
    expect(s.defaultRateSetId.hvac).toBe('hvac:std');
  });
});
