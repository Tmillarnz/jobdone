import { useEffect, useState } from 'preact/hooks';
import type { Area } from '../../core/types';
import { nav, useApp } from '../app';
import { Labelled, Missing, Screen, useJob } from '../components';
import { FieldForm } from '../FieldForm';
import { sizers } from '../slots';

export function AreaEditor({ id, areaId }: { id: string; areaId: string }) {
  const { settings, tradeOf } = useApp();
  const { job, save } = useJob(id);
  const [area, setArea] = useState<Area | null>(null);
  useEffect(() => {
    if (job && !area) setArea(job.areas.find((a) => a.id === areaId) ?? null);
  }, [job]);

  if (job === undefined) return null;
  const trade = job && tradeOf(job.tradeId);
  const kind = trade?.areaKinds.find((k) => k.id === area?.kind);
  if (!job || !trade) return <Missing what="job" />;
  if (!area || !kind) return job.areas.some((a) => a.id === areaId) ? null : <Missing what="area" />;

  const back = `/job/${job.id}`;
  const sets = settings.rateSets.filter((r) => r.tradeId === trade.id);
  const done = async () => {
    const name = area.name.trim() || kind.name;
    await save({ ...job, areas: job.areas.map((a) => (a.id === area.id ? { ...area, name } : a)) });
    nav(back);
  };
  const remove = async () => {
    if (!confirm(`Remove ${area.name}?`)) return;
    await save({ ...job, areas: job.areas.filter((a) => a.id !== area.id) });
    nav(back);
  };

  return (
    <Screen title={area.name || kind.name} sub={job.siteName} back={back}>
      <div class="card">
        <Labelled label="Name" for="area-name">
          <input id="area-name" type="text" value={area.name} onInput={(e) => setArea({ ...area, name: e.currentTarget.value })} />
        </Labelled>
        {sets.length > 1 && (
          <Labelled label={trade.rateSetNoun} for="area-rateset">
            <select
              id="area-rateset"
              value={area.rateSetId ?? ''}
              onChange={(e) => {
                const { rateSetId: _drop, ...rest } = area;
                setArea(e.currentTarget.value ? { ...rest, rateSetId: e.currentTarget.value } : rest);
              }}
            >
              <option value="">Same as the job</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Labelled>
        )}
      </div>

      {sizers.map((Sizer, i) => (
        <Sizer key={i} kind={kind} area={area} onChange={setArea} />
      ))}

      <FieldForm kind={kind} fields={area.fields} onChange={(fields) => setArea({ ...area, fields })} />

      <div class="actions sticky">
        <button class="btn primary block" onClick={() => void done()}>
          Save
        </button>
      </div>
      <button class="btn danger quiet" onClick={() => void remove()}>
        Remove
      </button>
    </Screen>
  );
}
