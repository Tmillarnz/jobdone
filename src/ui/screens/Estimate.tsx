import { useEffect, useRef } from 'preact/hooks';
import { uid } from '../../core/id';
import { extraAmount, formatMoney, lineAmount, needsRate, roundQty, totals, unitLabel } from '../../core/money';
import { confirmQuote, dayKey, formatQuoteNumber, gstNumberMissing } from '../../core/quote';
import { regenerateJob } from '../../core/regenerate';
import type { Extra, Job, Line, Unit } from '../../core/types';
import { nav, useApp } from '../app';
import { Document } from '../Document';
import { MoneyInput, Missing, NumberInput, Screen, useJob } from '../components';

const UNITS: Unit[] = ['each', 'm2', 'lm', 'hr'];

export function Estimate({ id }: { id: string }) {
  const { db, settings, tradeOf } = useApp();
  const { job, save } = useJob(id);
  const trade = job ? tradeOf(job.tradeId) : undefined;
  const regenerated = useRef(false);

  // Bring the lines up to date with the measurements and rates on the way in.
  useEffect(() => {
    if (!job || !trade || regenerated.current) return;
    regenerated.current = true;
    const next = regenerateJob(job, trade.takeoff, settings.rateSets).job;
    if (JSON.stringify(next.lines) !== JSON.stringify(job.lines)) void save(next);
  }, [job]);

  if (job === undefined) return null;
  if (!job || !trade) return <Missing what="job" />;

  const regen = (j: Job) => regenerateJob(j, trade.takeoff, settings.rateSets).job;
  const setLine = (lineId: string, patch: Partial<Line>) =>
    save({
      ...job,
      lines: job.lines.map((l) => (l.id === lineId ? { ...l, ...patch, edited: l.source === 'takeoff' ? true : l.edited } : l)),
    });
  const setExtra = (extraId: string, patch: Partial<Extra>) =>
    save({ ...job, extras: job.extras.map((e) => (e.id === extraId ? { ...e, ...patch } : e)) });
  const addExtra = (item: string) => save({ ...job, extras: [...job.extras, { id: uid(), item, qty: 1, costCents: 0 }] });
  const addLine = () =>
    save({
      ...job,
      lines: [...job.lines, { id: uid(), source: 'manual', key: `manual:${uid()}`, label: '', qty: 1, unit: 'each', rateCents: 0, edited: false }],
    });

  const confirmIt = async () => {
    const ask =
      unset > 0
        ? `${unset === 1 ? '1 line has' : `${unset} lines have`} no rate and will be on the quote at $0.00. Confirm anyway?`
        : 'Confirm this as a quote? The quote is fixed once confirmed. You can still change the job and confirm a new one.';
    if (!confirm(ask)) return;
    const now = new Date();
    const number = formatQuoteNumber(now, await db.nextQuoteSeq(dayKey(now)));
    const quote = confirmQuote(job, settings, number, now);
    await db.saveQuote(quote);
    nav(`/quote/${quote.id}`);
  };

  const sets = settings.rateSets.filter((r) => r.tradeId === trade.id);
  const t = totals(job.lines, job.extras, settings.chargeGst);
  const unset = job.lines.filter(needsRate).length;
  const unused = trade.suggestedExtras.filter((s) => !job.extras.some((e) => e.item === s));

  return (
    <Screen title="Estimate" sub={job.siteName} back={`/job/${job.id}/check`}>
      <Document
        printOnly
        doc={{ label: 'Estimate', date: job.updatedAt, siteName: job.siteName, lines: job.lines, extras: job.extras, chargeGst: settings.chargeGst, gstNumber: settings.gstNumber }}
      />
      <div class="no-print">
      <p class="banner">Estimate only, not an offer.</p>

      {sets.length > 1 && (
        <div class="card inline-field no-print">
          <label for="est-rateset">{trade.rateSetNoun}</label>
          <select id="est-rateset" value={job.rateSetId} onChange={(e) => void save(regen({ ...job, rateSetId: e.currentTarget.value }))}>
            {!sets.some((s) => s.id === job.rateSetId) && <option value={job.rateSetId}>Choose</option>}
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {unset > 0 && (
        <p class="notice warn">
          {unset === 1 ? '1 line has no rate.' : `${unset} lines have no rate.`} Type a rate on the line, or set it for every job in{' '}
          <a href="#/settings">Settings</a>.
        </p>
      )}

      <h2>Lines</h2>
      {job.lines.length === 0 && <p class="notice">No lines yet. Go back and add measurements, or add a line below.</p>}
      <ul class="lines">
        {job.lines.map((l) => (
          <li key={l.id} class={`line${needsRate(l) ? ' unset' : ''}`}>
            {l.source === 'manual' ? (
              <input
                class="line-label"
                type="text"
                aria-label="Line description"
                placeholder="What is it?"
                value={l.label}
                onInput={(e) => void setLine(l.id, { label: e.currentTarget.value })}
              />
            ) : (
              <p class="line-label">{l.label}</p>
            )}
            <div class="line-nums">
              <NumberInput label={`${l.label} quantity`} value={l.qty} onChange={(v) => void setLine(l.id, { qty: roundQty(v ?? 0, l.unit) })} />
              {l.source === 'manual' ? (
                <select aria-label="Unit" value={l.unit} onChange={(e) => void setLine(l.id, { unit: e.currentTarget.value as Unit, qty: roundQty(l.qty, e.currentTarget.value as Unit) })}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {unitLabel(u)}
                    </option>
                  ))}
                </select>
              ) : (
                <span class="unit">{unitLabel(l.unit)}</span>
              )}
              <span class="times" aria-hidden="true">
                ×
              </span>
              <MoneyInput label={`${l.label} rate`} cents={l.rateCents} placeholder="set rate" onChange={(c) => void setLine(l.id, { rateCents: c })} />
              <strong class="amount">{formatMoney(lineAmount(l))}</strong>
            </div>
            <div class="line-tags">
              {needsRate(l) && <span class="tag warn">Set rate</span>}
              {l.orphaned && <span class="tag warn">No longer in the takeoff. Kept because you edited it.</span>}
              {l.edited && !l.orphaned && <span class="tag">Edited</span>}
              {l.source === 'manual' && <span class="tag">Added by you</span>}
              {l.edited && (
                <button class="link" onClick={() => void save(regen({ ...job, lines: job.lines.map((x) => (x.id === l.id ? { ...x, edited: false } : x)) }))}>
                  {l.orphaned ? 'Remove' : 'Reset to takeoff'}
                </button>
              )}
              {l.source === 'manual' && (
                <button class="link" onClick={() => void save({ ...job, lines: job.lines.filter((x) => x.id !== l.id) })}>
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <button class="btn" onClick={() => void addLine()}>
        Add a line
      </button>

      <h2>Extras</h2>
      <ul class="lines">
        {job.extras.map((x) => (
          <li key={x.id} class="line">
            <input class="line-label" type="text" aria-label="Extra" placeholder="What is it?" value={x.item} onInput={(e) => void setExtra(x.id, { item: e.currentTarget.value })} />
            <div class="line-nums">
              <NumberInput label={`${x.item} quantity`} value={x.qty} onChange={(v) => void setExtra(x.id, { qty: v ?? 0 })} />
              <span class="times" aria-hidden="true">
                ×
              </span>
              <MoneyInput label={`${x.item} cost`} cents={x.costCents} onChange={(c) => void setExtra(x.id, { costCents: c })} />
              <strong class="amount">{formatMoney(extraAmount(x))}</strong>
            </div>
            <div class="line-tags">
              <button class="link" onClick={() => void save({ ...job, extras: job.extras.filter((e) => e.id !== x.id) })}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div class="chips">
        {unused.map((s) => (
          <button key={s} class="chip" onClick={() => void addExtra(s)}>
            + {s}
          </button>
        ))}
        <button class="chip" onClick={() => void addExtra('')}>
          + Other
        </button>
      </div>

      <TotalsBlock subtotal={t.subtotalCents} gst={t.gstCents} total={t.totalCents} chargeGst={t.chargeGst} />
      {gstNumberMissing(settings) && (
        <p class="notice warn">
          GST is being charged but there is no GST number to print. <a href="#/settings">Add it in Settings.</a>
        </p>
      )}
      <div class="actions sticky">
        <button class="btn" onClick={() => window.print()}>
          Print estimate
        </button>
        <button class="btn primary" disabled={job.lines.length + job.extras.length === 0} onClick={() => void confirmIt()}>
          Confirm quote
        </button>
      </div>
      </div>
    </Screen>
  );
}

export function TotalsBlock(p: { subtotal: number; gst: number; total: number; chargeGst: boolean }) {
  return (
    <dl class="totals">
      {p.chargeGst ? (
        <>
          <div>
            <dt>Total excluding GST</dt>
            <dd>{formatMoney(p.subtotal)}</dd>
          </div>
          <div>
            <dt>GST 15%</dt>
            <dd>{formatMoney(p.gst)}</dd>
          </div>
          <div class="grand">
            <dt>Total including GST</dt>
            <dd>{formatMoney(p.total)}</dd>
          </div>
        </>
      ) : (
        <div class="grand">
          <dt>Total (no GST charged)</dt>
          <dd>{formatMoney(p.total)}</dd>
        </div>
      )}
    </dl>
  );
}
