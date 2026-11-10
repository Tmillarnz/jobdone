import { useRef, useState } from 'preact/hooks';
import { bounds, isDisjoint, unionArea, unionPerimeter } from '../../core/geometry';
import { formatQty, roundTo } from '../../core/money';
import type { Rect } from '../../core/types';
import { NumberInput } from '../components';
import type { SizerProps } from '../slots';
import { applyPlan } from './plan';
import { PlanDiagram } from './PlanDiagram';

const GRID = 0.05; // metres
const MIN = 0.1;
const snap = (n: number) => roundTo(Math.round(n / GRID) * GRID, 2);

/** Pull a moving edge onto a nearby edge of another rectangle so shapes join cleanly. */
function stick(value: number, edges: number[], reach: number): number {
  let best = value;
  let gap = reach;
  for (const e of edges) {
    const d = Math.abs(e - value);
    if (d < gap) {
      gap = d;
      best = e;
    }
  }
  return best;
}

type View = { x: number; y: number; size: number };
function fit(rects: Rect[]): View {
  const b = bounds(rects);
  const size = Math.max(b.w, b.h, 3) * 1.35 + 1;
  return { x: b.x - (size - b.w) / 2, y: b.y - (size - b.h) / 2, size };
}

type Corner = 'nw' | 'ne' | 'sw' | 'se';
type Drag = { index: number; corner: Corner | null; startX: number; startY: number; orig: Rect };

export function Draw({ kind, area, onChange }: SizerProps) {
  const [open, setOpen] = useState(false);
  if (!kind.plan) return null;
  return (
    <section class="card">
      <div class="card-head">
        <h2>Draw</h2>
        <button class="btn small" onClick={() => setOpen(true)}>
          {area.plan?.length ? 'Edit the plan' : 'Draw a plan'}
        </button>
      </div>
      {area.plan?.length ? <PlanDiagram rects={area.plan} /> : <p class="help">For odd shapes. Build the plan from rectangles and the area and perimeter are filled in below.</p>}
      {open && (
        <DrawEditor
          initial={area.plan?.length ? area.plan : [{ x: 0, y: 0, w: 4, h: 3 }]}
          onCancel={() => setOpen(false)}
          onDone={(rects) => {
            onChange(applyPlan(area, kind, rects));
            setOpen(false);
          }}
        />
      )}
    </section>
  );
}

function DrawEditor({ initial, onDone, onCancel }: { initial: Rect[]; onDone(rects: Rect[]): void; onCancel(): void }) {
  const [rects, setRects] = useState<Rect[]>(() => initial.map((r) => ({ ...r })));
  const [sel, setSel] = useState(0);
  const [view, setView] = useState<View>(() => fit(initial));
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);

  const toMetres = (e: PointerEvent) => {
    const box = svg.current!.getBoundingClientRect();
    return { x: view.x + ((e.clientX - box.left) / box.width) * view.size, y: view.y + ((e.clientY - box.top) / box.height) * view.size };
  };
  const pxToM = () => view.size / (svg.current?.getBoundingClientRect().width || 320);

  const start = (e: PointerEvent, index: number, corner: Corner | null) => {
    e.preventDefault();
    e.stopPropagation();
    svg.current!.setPointerCapture(e.pointerId);
    const p = toMetres(e);
    drag.current = { index, corner, startX: p.x, startY: p.y, orig: { ...rects[index]! } };
    setSel(index);
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toMetres(e);
    const dx = p.x - d.startX;
    const dy = p.y - d.startY;
    const others = rects.filter((_, i) => i !== d.index);
    const xs = others.flatMap((r) => [r.x, r.x + r.w]);
    const ys = others.flatMap((r) => [r.y, r.y + r.h]);
    const reach = 14 * pxToM();
    const o = d.orig;
    let next: Rect;
    if (d.corner === null) {
      let x = snap(o.x + dx);
      let y = snap(o.y + dy);
      const left = stick(x, xs, reach);
      const right = stick(x + o.w, xs, reach);
      x = left !== x ? left : right !== x + o.w ? right - o.w : x;
      const top = stick(y, ys, reach);
      const bottom = stick(y + o.h, ys, reach);
      y = top !== y ? top : bottom !== y + o.h ? bottom - o.h : y;
      next = { ...o, x: roundTo(x, 3), y: roundTo(y, 3) };
    } else {
      let x0 = o.x;
      let x1 = o.x + o.w;
      let y0 = o.y;
      let y1 = o.y + o.h;
      if (d.corner.includes('w')) x0 = Math.min(stick(snap(x0 + dx), xs, reach), x1 - MIN);
      else x1 = Math.max(stick(snap(x1 + dx), xs, reach), x0 + MIN);
      if (d.corner.includes('n')) y0 = Math.min(stick(snap(y0 + dy), ys, reach), y1 - MIN);
      else y1 = Math.max(stick(snap(y1 + dy), ys, reach), y0 + MIN);
      next = { x: roundTo(x0, 3), y: roundTo(y0, 3), w: roundTo(x1 - x0, 3), h: roundTo(y1 - y0, 3) };
    }
    setRects(rects.map((r, i) => (i === d.index ? next : r)));
  };
  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    setView(fit(rects));
  };

  const update = (next: Rect[], select = sel) => {
    setRects(next);
    setSel(Math.min(select, next.length - 1));
    setView(fit(next));
  };
  const addRect = () => {
    const b = bounds(rects);
    update([...rects, { x: roundTo(b.x + b.w, 3), y: b.y, w: 2, h: 2 }], rects.length);
  };
  const setSize = (key: 'w' | 'h', v: number | undefined) => {
    if (v === undefined || v < MIN) return;
    update(rects.map((r, i) => (i === sel ? { ...r, [key]: roundTo(v, 3) } : r)));
  };

  const s = rects[sel];
  const px = pxToM();
  const handle = 13 * px;
  const font = 13 * px;
  const area = unionArea(rects);
  const perimeter = unionPerimeter(rects);

  return (
    <div class="overlay" role="dialog" aria-modal="true" aria-label="Draw a plan">
      <div class="overlay-body">
        <div class="draw-totals" aria-live="polite">
          <span>
            Area <strong>{formatQty(roundTo(area, 2), 'hr')} m²</strong>
          </span>
          <span>
            Perimeter <strong>{formatQty(roundTo(perimeter, 2), 'hr')} m</strong>
          </span>
        </div>
        <svg
          ref={svg}
          class="draw"
          viewBox={`${view.x} ${view.y} ${view.size} ${view.size}`}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <defs>
            <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M1 0H0V1" fill="none" class="draw-grid" stroke-width={px} />
            </pattern>
          </defs>
          <rect x={view.x} y={view.y} width={view.size} height={view.size} fill="url(#grid)" />
          {rects.map((r, i) => (
            <rect
              key={i}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              class={`draw-rect${i === sel ? ' sel' : ''}`}
              stroke-width={(i === sel ? 3 : 1.5) * px}
              onPointerDown={(e) => start(e, i, null)}
            />
          ))}
          {rects.map((r, i) => (
            <g key={`t${i}`} font-size={font} class="plan-text" pointer-events="none">
              <text x={r.x + r.w / 2} y={r.y + font * 1.2} text-anchor="middle">
                {roundTo(r.w, 2)} m
              </text>
              <text x={r.x + font * 0.4} y={r.y + r.h / 2 + font * 0.35}>
                {roundTo(r.h, 2)} m
              </text>
            </g>
          ))}
          {s &&
            (['nw', 'ne', 'sw', 'se'] as Corner[]).map((c) => (
              <circle
                key={c}
                cx={s.x + (c.includes('e') ? s.w : 0)}
                cy={s.y + (c.includes('s') ? s.h : 0)}
                r={handle}
                class="draw-handle"
                stroke-width={2 * px}
                onPointerDown={(e) => start(e, sel, c)}
              />
            ))}
        </svg>
        <p class="help">Drag a corner until the metres match your tape, or type the exact length. Drag a rectangle to move it. One grid square is 1 m.</p>
        {isDisjoint(rects) && <p class="notice warn">The rectangles do not all touch. Move them together, or the area and perimeter count each piece on its own.</p>}

        {s && (
          <div class="card">
            <div class="field-grid">
              <div class="field">
                <label for="draw-w">
                  Across <span class="unit">(m)</span>
                </label>
                <NumberInput key={`w${sel}`} id="draw-w" value={s.w} onChange={(v) => setSize('w', v)} />
              </div>
              <div class="field">
                <label for="draw-h">
                  Down <span class="unit">(m)</span>
                </label>
                <NumberInput key={`h${sel}`} id="draw-h" value={s.h} onChange={(v) => setSize('h', v)} />
              </div>
            </div>
            <div class="actions">
              <button class="btn small" onClick={addRect}>
                Add a rectangle
              </button>
              {rects.length > 1 && (
                <button class="btn small danger" onClick={() => update(rects.filter((_, i) => i !== sel), 0)}>
                  Remove this one
                </button>
              )}
            </div>
          </div>
        )}
        <div class="actions">
          <button class="btn" onClick={onCancel}>
            Cancel
          </button>
          <button class="btn primary" onClick={() => onDone(rects)}>
            Use this plan
          </button>
        </div>
      </div>
    </div>
  );
}
