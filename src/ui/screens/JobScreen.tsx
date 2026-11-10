import { newArea } from '../../core/job';
import type { AreaKind, Job, Trade } from '../../core/types';
import { nav, useApp } from '../app';
import { Labelled, Missing, Screen, useJob } from '../components';
import { jobExtras } from '../slots';

export function areaSummary(trade: Trade, job: Job, areaId: string): string {
  return trade
    .checkSummary(job)
    .filter((r) => r.areaId === areaId && r.kind === 'calculated')
    .slice(0, 4)
    .map((r) => `${r.label} ${r.value}`)
    .join(' · ');
}

export function JobScreen({ id }: { id: string }) {
  const { db, settings, tradeOf } = useApp();
  const { job, save } = useJob(id);
  if (job === undefined) return null;
  const trade = job && tradeOf(job.tradeId);
  if (!job || !trade) return <Missing what="job" />;

  const sets = settings.rateSets.filter((r) => r.tradeId === trade.id);
  const add = async (kind: AreaKind) => {
    const n = job.areas.filter((a) => a.kind === kind.id).length + 1;
    const area = newArea(kind, `${kind.name} ${n}`);
    await save({ ...job, areas: [...job.areas, area] });
    nav(`/job/${job.id}/area/${area.id}`);
  };
  const remove = async () => {
    if (!confirm(`Delete the job at ${job.siteName}? Confirmed quotes are kept.`)) return;
    for (const p of job.photos) await db.deletePhoto(p.id);
    await db.deleteJob(job.id);
    nav('/jobs', true);
  };

  return (
    <Screen title={job.siteName || 'Job'} sub={trade.name} back="/jobs">
      <div class="card">
        <Labelled label="Site" for="site">
          <input id="site" type="text" value={job.siteName} onInput={(e) => void save({ ...job, siteName: e.currentTarget.value })} />
        </Labelled>
        <Labelled label={trade.rateSetNoun} for="rateset" help={`Prices the whole job unless something below has its own.`}>
          <select id="rateset" value={job.rateSetId} onChange={(e) => void save({ ...job, rateSetId: e.currentTarget.value })}>
            {!sets.some((s) => s.id === job.rateSetId) && <option value={job.rateSetId}>Choose</option>}
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Labelled>
      </div>

      <h2>Sized so far</h2>
      {job.areas.length === 0 && <p class="notice">Nothing sized yet. Add the first one below.</p>}
      <ul class="list">
        {job.areas.map((a) => (
          <li key={a.id}>
            <button class="row" onClick={() => nav(`/job/${job.id}/area/${a.id}`)}>
              <span>
                <strong>{a.name}</strong>
                <small>{areaSummary(trade, job, a.id) || 'No measurements yet'}</small>
              </span>
              <span class="chev" aria-hidden="true">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div class="actions">
        {trade.areaKinds.map((k) => (
          <button key={k.id} class="btn" onClick={() => void add(k)}>
            Add {k.name.toLowerCase()}
          </button>
        ))}
      </div>

      {jobExtras.map((Slot, i) => (
        <Slot key={i} job={job} save={save} />
      ))}

      <div class="actions sticky no-print">
        <button class="btn primary block" disabled={job.areas.length === 0} onClick={() => nav(`/job/${job.id}/check`)}>
          Check the numbers
        </button>
      </div>
      <button class="btn danger quiet" onClick={() => void remove()}>
        Delete job
      </button>
    </Screen>
  );
}
