import type { CheckRow } from '../../core/types';
import { nav, useApp } from '../app';
import { Missing, Screen, useJob } from '../components';
import { checkExtras } from '../slots';

export function Check({ id }: { id: string }) {
  const { tradeOf } = useApp();
  const { job } = useJob(id);
  if (job === undefined) return null;
  const trade = job && tradeOf(job.tradeId);
  if (!job || !trade) return <Missing what="job" />;

  const rows = trade.checkSummary(job);
  const groups: { name: string; areaId?: string; rows: CheckRow[] }[] = [];
  for (const r of rows) {
    const g = groups.find((x) => x.name === r.group && x.areaId === r.areaId);
    if (g) g.rows.push(r);
    else groups.push({ name: r.group, areaId: r.areaId, rows: [r] });
  }
  const table = (title: string, list: CheckRow[]) =>
    list.length > 0 && (
      <>
        <h3>{title}</h3>
        <dl class="pairs">
          {list.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      </>
    );

  return (
    <Screen title="Check" sub={job.siteName} back={`/job/${job.id}`}>
      <p class="lead">Check these against your tape before anything is priced.</p>
      {groups.map((g) => {
        const area = job.areas.find((a) => a.id === g.areaId);
        return (
          <section class="card" key={`${g.areaId}-${g.name}`}>
            <div class="card-head">
              <h2>{g.name}</h2>
              {area && (
                <button class="btn small" onClick={() => nav(`/job/${job.id}/area/${area.id}`)}>
                  Fix
                </button>
              )}
            </div>
            {area && checkExtras.map((Slot, i) => <Slot key={i} area={area} />)}
            {table('Measured', g.rows.filter((r) => r.kind === 'measured'))}
            {table('Calculated', g.rows.filter((r) => r.kind === 'calculated'))}
          </section>
        );
      })}
      <div class="actions sticky">
        <button class="btn" onClick={() => nav(`/job/${job.id}`)}>
          Back to fix
        </button>
        <button class="btn primary" onClick={() => nav(`/job/${job.id}/estimate`)}>
          Confirm and price
        </button>
      </div>
    </Screen>
  );
}
