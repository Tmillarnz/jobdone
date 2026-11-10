import { roundTo } from '../../core/money';
import { unionArea, unionPerimeter } from '../../core/geometry';
import type { Area, AreaKind, Rect } from '../../core/types';

/** Write a drawn plan into the same Area record the Type method fills. */
export function applyPlan(area: Area, kind: AreaKind, rects: Rect[]): Area {
  const fields = { ...area.fields, ...(kind.plan?.set ?? {}) };
  if (kind.plan?.areaField) fields[kind.plan.areaField] = roundTo(unionArea(rects), 2);
  if (kind.plan?.perimeterField) fields[kind.plan.perimeterField] = roundTo(unionPerimeter(rects), 2);
  return { ...area, fields, plan: rects.map((r) => ({ ...r })) };
}
