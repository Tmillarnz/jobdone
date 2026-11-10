import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { newArea, newJob } from './job';
import { migrateJob, SCHEMA_VERSION, type Migration } from './migrations';
import { confirmQuote, dayKey, formatQuoteNumber } from './quote';
import { defaultSettings, withTradeDefaults } from './settings';
import { openStorage, type Storage } from './storage';
import { testTrade } from './testkit';

let n = 0;
let db: Storage;
beforeEach(async () => {
  db = await openStorage(`test-${n++}`);
});

describe('settings', () => {
  it('seeds namespaced rate sets and a default per trade', () => {
    const s = defaultSettings([testTrade]);
    expect(s.rateSets.map((r) => r.id)).toEqual(['test:std', 'test:top']);
    expect(s.defaultRateSetId).toEqual({ test: 'test:std' });
    expect(s.chargeGst).toBe(true);
  });
  it('adds rate sets for a trade enabled later, keeping existing edits', () => {
    const s = defaultSettings([testTrade]);
    s.rateSets[0]!.rates.pour = 1;
    const other = { ...testTrade, id: 'other' };
    const out = withTradeDefaults(s, [testTrade, other]);
    expect(out.rateSets.map((r) => r.id)).toEqual(['test:std', 'test:top', 'other:std', 'other:top']);
    expect(out.rateSets[0]!.rates.pour).toBe(1);
    expect(out.defaultRateSetId.other).toBe('other:std');
  });
  it('repairs a default that points at a deleted rate set', () => {
    const s = defaultSettings([testTrade]);
    s.rateSets = s.rateSets.filter((r) => r.id !== 'test:std');
    expect(withTradeDefaults(s, [testTrade]).defaultRateSetId.test).toBe('test:top');
  });
  it('round-trips through storage', async () => {
    expect(await db.getSettings()).toBeUndefined();
    const s = { ...defaultSettings([testTrade]), businessName: 'Kauri Concrete' };
    await db.saveSettings(s);
    expect(await db.getSettings()).toEqual(s);
  });
});

describe('jobs', () => {
  it('creates a job on the trade default rate set', () => {
    const j = newJob('test', '  4 Rata Rd ', defaultSettings([testTrade]));
    expect(j).toMatchObject({ siteName: '4 Rata Rd', rateSetId: 'test:std', schemaVersion: SCHEMA_VERSION });
    expect(newArea(testTrade.areaKinds[0]!, 'Garage').fields).toEqual({ sealed: false });
  });
  it('saves, lists newest first, and deletes', async () => {
    const s = defaultSettings([testTrade]);
    const a = newJob('test', 'A', s, new Date(2026, 10, 1));
    const b = newJob('test', 'B', s, new Date(2026, 10, 2));
    await db.saveJob(a);
    await db.saveJob(b);
    expect((await db.listJobs()).map((j) => j.siteName)).toEqual(['B', 'A']);
    expect(await db.getJob(a.id)).toEqual(a);
    await db.deleteJob(a.id);
    expect(await db.getJob(a.id)).toBeUndefined();
  });
});

describe('migrations', () => {
  it('upgrades an unversioned record on read', async () => {
    const legacy = { id: 'old', tradeId: 'test', siteName: 'Old', createdAt: 'x', updatedAt: 'x', rateSetId: '' };
    await db.saveJob(legacy as never);
    const j = await db.getJob('old');
    expect(j).toMatchObject({ schemaVersion: SCHEMA_VERSION, areas: [], lines: [], extras: [], photos: [] });
  });
  it('runs each step in order up to the target', () => {
    const steps: Record<number, Migration> = {
      1: (r) => ({ ...r, trail: 'a' }),
      2: (r) => ({ ...r, trail: `${String(r.trail)}b` }),
    };
    const out = migrateJob({ id: 'j', schemaVersion: 1 }, steps, 3) as unknown as Record<string, unknown>;
    expect(out.trail).toBe('ab');
    expect(out.schemaVersion).toBe(3);
  });
  it('leaves a current record unchanged', () => {
    const rec = { id: 'j', schemaVersion: SCHEMA_VERSION, areas: [] };
    expect(migrateJob(rec)).toEqual(rec);
  });
  it('refuses a record from a newer app, and a gap in the chain', () => {
    expect(() => migrateJob({ schemaVersion: SCHEMA_VERSION + 1 })).toThrow(/newer version/);
    expect(() => migrateJob({ schemaVersion: 1 }, {}, 2)).toThrow(/No migration/);
  });
});

describe('quote numbering', () => {
  it('counts up per day from 001 and restarts the next day', async () => {
    const mon = new Date(2026, 10, 9);
    const tue = new Date(2026, 10, 10);
    const num = async (d: Date) => formatQuoteNumber(d, await db.nextQuoteSeq(dayKey(d)));
    expect(await num(mon)).toBe('UD-20261109-001');
    expect(await num(mon)).toBe('UD-20261109-002');
    expect(await num(tue)).toBe('UD-20261110-001');
    expect(await num(mon)).toBe('UD-20261109-003');
  });
  it('never hands out the same number twice under concurrent confirms', async () => {
    const seqs = await Promise.all(Array.from({ length: 20 }, () => db.nextQuoteSeq('20261110')));
    expect(new Set(seqs).size).toBe(20);
    expect(Math.max(...seqs)).toBe(20);
  });
  it('keeps counting after the database is reopened', async () => {
    const a = await openStorage('persist');
    await a.nextQuoteSeq('20261110');
    a.close();
    const b = await openStorage('persist');
    expect(await b.nextQuoteSeq('20261110')).toBe(2);
  });
});

describe('quotes and photos', () => {
  it('stores quotes and marks one sent', async () => {
    const s = defaultSettings([testTrade]);
    const j = newJob('test', 'A', s);
    const q = confirmQuote(j, s, 'UD-20261110-001', new Date(2026, 10, 10));
    await db.saveQuote(q);
    await db.saveQuote({ ...q, sentAt: '2026-11-10T03:00:00.000Z' });
    const all = await db.listQuotes();
    expect(all).toHaveLength(1);
    expect(all[0]!.sentAt).toBe('2026-11-10T03:00:00.000Z');
    expect(await db.getQuote(q.id)).toEqual(all[0]);
  });
  it('stores and removes a photo', async () => {
    await db.putPhoto('p1', new Blob(['abc'], { type: 'image/jpeg' }));
    expect(await db.getPhoto('p1')).toBeDefined();
    await db.deletePhoto('p1');
    expect(await db.getPhoto('p1')).toBeUndefined();
  });
});
