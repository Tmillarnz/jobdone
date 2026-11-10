import { describe, expect, it } from 'vitest';
import { bounds, isDisjoint, unionArea, unionPerimeter } from './geometry';

describe('union of rectangles', () => {
  it('handles one rectangle', () => {
    const r = [{ x: 0, y: 0, w: 4, h: 3.6 }];
    expect(unionArea(r)).toBeCloseTo(14.4, 6);
    expect(unionPerimeter(r)).toBeCloseTo(15.2, 6);
  });

  it('L-shaped room: union area and outline perimeter, not the bounding box', () => {
    // 5 × 3 main room with a 2 × 2 leg below its left end.
    const L = [
      { x: 0, y: 0, w: 5, h: 3 },
      { x: 0, y: 3, w: 2, h: 2 },
    ];
    expect(unionArea(L)).toBe(19); // bounding box would be 25
    expect(unionPerimeter(L)).toBe(20); // the shared 2 m edge is not outline
    expect(bounds(L)).toEqual({ x: 0, y: 0, w: 5, h: 5 });
  });

  it('counts an overlap once', () => {
    const cross = [
      { x: 0, y: 1, w: 3, h: 1 },
      { x: 1, y: 0, w: 1, h: 3 },
    ];
    expect(unionArea(cross)).toBe(5);
    expect(unionPerimeter(cross)).toBe(12);
  });

  it('gives the same L whichever way it is cut', () => {
    const cutA = [{ x: 0, y: 0, w: 5, h: 3 }, { x: 0, y: 3, w: 2, h: 2 }];
    const cutB = [{ x: 0, y: 0, w: 2, h: 5 }, { x: 2, y: 0, w: 3, h: 3 }];
    const overlapped = [{ x: 0, y: 0, w: 5, h: 3 }, { x: 0, y: 0, w: 2, h: 5 }];
    for (const s of [cutB, overlapped]) {
      expect(unionArea(s)).toBe(unionArea(cutA));
      expect(unionPerimeter(s)).toBe(unionPerimeter(cutA));
    }
  });

  it('is exact on tape-measure decimals', () => {
    const r = [{ x: 0.1, y: 0.2, w: 3.65, h: 2.35 }, { x: 3.75, y: 0.2, w: 1.2, h: 1.1 }];
    expect(unionArea(r)).toBeCloseTo(3.65 * 2.35 + 1.2 * 1.1, 9);
    expect(unionPerimeter(r)).toBeCloseTo(2 * (4.85 + 2.35), 9);
  });

  it('includes the edge of an enclosed hole', () => {
    const ring = [
      { x: 0, y: 0, w: 3, h: 1 }, { x: 0, y: 2, w: 3, h: 1 },
      { x: 0, y: 1, w: 1, h: 1 }, { x: 2, y: 1, w: 1, h: 1 },
    ];
    expect(unionArea(ring)).toBe(8);
    expect(unionPerimeter(ring)).toBe(16);
  });

  it('spots separate pieces and ignores empty rectangles', () => {
    expect(isDisjoint([{ x: 0, y: 0, w: 1, h: 1 }, { x: 2, y: 0, w: 1, h: 1 }])).toBe(true);
    expect(isDisjoint([{ x: 0, y: 0, w: 1, h: 1 }, { x: 1, y: 0, w: 1, h: 1 }])).toBe(false);
    expect(unionArea([{ x: 0, y: 0, w: 0, h: 5 }])).toBe(0);
    expect(unionArea([])).toBe(0);
    expect(unionPerimeter([])).toBe(0);
  });
});
