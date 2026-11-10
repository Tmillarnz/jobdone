import { uid } from './id';
import { roundQty } from './money';
import type { Job, Line, RateSet, TakeoffLine } from './types';

/** The rate set that prices a takeoff line: the area's own, else the job's. */
export function rateFor(job: Job, rateSets: RateSet[], tl: TakeoffLine): number {
  const area = tl.areaId ? job.areas.find((a) => a.id === tl.areaId) : undefined;
  const setId = area?.rateSetId ?? job.rateSetId;
  const set = rateSets.find((s) => s.id === setId);
  const rate = set?.rates[tl.rateKey];
  // A missing rate stays 0 so the line shows "set rate". Never invent a price.
  return typeof rate === 'number' && rate > 0 ? rate : 0;
}

export interface RegenerateResult {
  lines: Line[];
  /** Edited lines kept although the takeoff no longer produces their key. */
  orphaned: Line[];
}

/**
 * Replace only lines with source 'takeoff' and edited false. Edited lines and
 * manual lines are kept exactly as they are. Extras are not an input at all.
 */
export function regenerateLines(
  existing: Line[],
  takeoff: TakeoffLine[],
  priceOf: (tl: TakeoffLine) => number,
): RegenerateResult {
  const editedByKey = new Map<string, Line>();
  const oldIdByKey = new Map<string, string>();
  for (const l of existing) {
    if (l.source !== 'takeoff') continue;
    if (l.edited) editedByKey.set(l.key, l);
    else oldIdByKey.set(l.key, l.id);
  }

  const lines: Line[] = [];
  const seen = new Set<string>();
  for (const tl of takeoff) {
    if (seen.has(tl.key)) continue;
    seen.add(tl.key);
    const kept = editedByKey.get(tl.key);
    if (kept) {
      lines.push({ ...kept, orphaned: false });
      continue;
    }
    lines.push({
      id: oldIdByKey.get(tl.key) ?? uid(),
      source: 'takeoff',
      key: tl.key,
      label: tl.label,
      qty: roundQty(tl.qty, tl.unit),
      unit: tl.unit,
      rateCents: priceOf(tl),
      edited: false,
    });
  }

  const orphaned: Line[] = [];
  for (const l of existing) {
    if (l.source === 'takeoff' && l.edited && !seen.has(l.key)) {
      const flagged = { ...l, orphaned: true };
      orphaned.push(flagged);
      lines.push(flagged);
    }
  }
  for (const l of existing) if (l.source === 'manual') lines.push(l);

  return { lines, orphaned };
}

/** Run a trade's takeoff over a job and merge it into the job's lines. */
export function regenerateJob(
  job: Job,
  takeoff: (job: Job) => TakeoffLine[],
  rateSets: RateSet[],
): { job: Job; orphaned: Line[] } {
  const { lines, orphaned } = regenerateLines(job.lines, takeoff(job), (tl) => rateFor(job, rateSets, tl));
  return { job: { ...job, lines }, orphaned };
}
