import { bounds } from '../../core/geometry';
import { roundTo } from '../../core/money';
import type { Rect } from '../../core/types';

const label = (n: number) => `${roundTo(n, 2)}`;

/** A read-only picture of a plan, with each rectangle's sizes in metres. */
export function PlanDiagram({ rects }: { rects: Rect[] }) {
  if (rects.length === 0) return null;
  const b = bounds(rects);
  const pad = Math.max(b.w, b.h) * 0.12 + 0.3;
  const vw = b.w + pad * 2;
  const vh = b.h + pad * 2;
  const font = Math.max(vw, vh) / 22;
  return (
    <svg class="plan-diagram" viewBox={`${b.x - pad} ${b.y - pad} ${vw} ${vh}`} role="img" aria-label="Drawn plan">
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} class="plan-fill" />
      ))}
      {rects.map((r, i) => (
        <g key={`t${i}`} font-size={font} class="plan-text">
          <text x={r.x + r.w / 2} y={r.y + font * 1.1} text-anchor="middle">
            {label(r.w)}
          </text>
          <text x={r.x + font * 0.3} y={r.y + r.h / 2 + font * 0.35}>
            {label(r.h)}
          </text>
        </g>
      ))}
    </svg>
  );
}
