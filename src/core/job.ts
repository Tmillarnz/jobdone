import { uid } from './id';
import { SCHEMA_VERSION } from './migrations';
import type { Area, AreaKind, FieldValue, Job, Settings } from './types';

export function newJob(tradeId: string, siteName: string, settings: Settings, now = new Date()): Job {
  const stamp = now.toISOString();
  return {
    id: uid(),
    tradeId,
    siteName: siteName.trim(),
    createdAt: stamp,
    updatedAt: stamp,
    rateSetId: settings.defaultRateSetId[tradeId] ?? '',
    areas: [],
    lines: [],
    extras: [],
    photos: [],
    schemaVersion: SCHEMA_VERSION,
  };
}

/** A new area with the kind's field defaults. Type, Draw and Talk all write this record. */
export function newArea(kind: AreaKind, name: string): Area {
  const fields: Record<string, FieldValue> = {};
  for (const f of kind.fields) if (f.default !== undefined) fields[f.key] = f.default;
  return { id: uid(), kind: kind.id, name, fields };
}

export function touch(job: Job, now = new Date()): Job {
  return { ...job, updatedAt: now.toISOString() };
}
