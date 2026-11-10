import type { Rect } from './types';

const mm = (n: number) => Math.round(n * 1000);

/**
 * Lay the rectangles on the grid made by all their edges, in whole millimetres,
 * and mark each grid cell that any rectangle covers.
 */
function grid(rects: Rect[]) {
  const live = rects.filter((r) => r.w > 0 && r.h > 0);
  const xs = [...new Set(live.flatMap((r) => [mm(r.x), mm(r.x + r.w)]))].sort((a, b) => a - b);
  const ys = [...new Set(live.flatMap((r) => [mm(r.y), mm(r.y + r.h)]))].sort((a, b) => a - b);
  const filled: boolean[][] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    filled.push([]);
    for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i]! + xs[i + 1]!) / 2;
      const cy = (ys[j]! + ys[j + 1]!) / 2;
      filled[i]!.push(live.some((r) => cx > mm(r.x) && cx < mm(r.x + r.w) && cy > mm(r.y) && cy < mm(r.y + r.h)));
    }
  }
  return { xs, ys, filled };
}

/** Area of the union of the rectangles in m². Overlaps count once. */
export function unionArea(rects: Rect[]): number {
  const { xs, ys, filled } = grid(rects);
  let a = 0;
  for (let i = 0; i < filled.length; i++)
    for (let j = 0; j < filled[i]!.length; j++)
      if (filled[i]![j]) a += (xs[i + 1]! - xs[i]!) * (ys[j + 1]! - ys[j]!);
  return a / 1e6;
}

/** Length of the outline of the union in metres. Shared and overlapped edges are not counted. */
export function unionPerimeter(rects: Rect[]): number {
  const { xs, ys, filled } = grid(rects);
  const at = (i: number, j: number) => filled[i]?.[j] === true;
  let p = 0;
  for (let i = 0; i < filled.length; i++)
    for (let j = 0; j < filled[i]!.length; j++) {
      if (!at(i, j)) continue;
      const w = xs[i + 1]! - xs[i]!;
      const h = ys[j + 1]! - ys[j]!;
      if (!at(i - 1, j)) p += h;
      if (!at(i + 1, j)) p += h;
      if (!at(i, j - 1)) p += w;
      if (!at(i, j + 1)) p += w;
    }
  return p / 1000;
}

/** More than one separate piece: the rectangles do not all touch. */
export function isDisjoint(rects: Rect[]): boolean {
  const { filled } = grid(rects);
  const seen = filled.map((col) => col.map(() => false));
  let pieces = 0;
  for (let i = 0; i < filled.length; i++)
    for (let j = 0; j < filled[i]!.length; j++) {
      if (!filled[i]![j] || seen[i]![j]) continue;
      pieces += 1;
      const stack: [number, number][] = [[i, j]];
      while (stack.length) {
        const [a, b] = stack.pop()!;
        if (!filled[a]?.[b] || seen[a]![b]) continue;
        seen[a]![b] = true;
        stack.push([a - 1, b], [a + 1, b], [a, b - 1], [a, b + 1]);
      }
    }
  return pieces > 1;
}

export function bounds(rects: Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
