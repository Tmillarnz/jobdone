import type { Job } from './types';

export const SCHEMA_VERSION = 1;

type Raw = Record<string, unknown>;
export type Migration = (raw: Raw) => Raw;

/**
 * migrations[n] upgrades a record from version n to n + 1. To change the Job
 * shape: bump SCHEMA_VERSION and add the step here. Records are upgraded when
 * read and written back at the new version on the next save.
 */
export const jobMigrations: Record<number, Migration> = {
  // Records written before versioning existed are treated as version 0.
  0: (raw) => ({
    areas: [],
    lines: [],
    extras: [],
    photos: [],
    ...raw,
  }),
};

export function migrateJob(
  raw: unknown,
  migrations: Record<number, Migration> = jobMigrations,
  target: number = SCHEMA_VERSION,
): Job {
  if (!raw || typeof raw !== 'object') throw new Error('Job record is not an object');
  let rec = { ...(raw as Raw) };
  let v = typeof rec.schemaVersion === 'number' ? rec.schemaVersion : 0;
  if (v > target) {
    throw new Error(`Job was saved by a newer version of the app (schema ${v}, this app reads ${target})`);
  }
  while (v < target) {
    const step = migrations[v];
    if (!step) throw new Error(`No migration from schema ${v}`);
    rec = step(rec);
    v += 1;
    rec.schemaVersion = v;
  }
  return rec as unknown as Job;
}
