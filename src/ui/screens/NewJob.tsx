import { useState } from 'preact/hooks';
import { newJob } from '../../core/job';
import { nav, useApp } from '../app';
import { Labelled, Screen } from '../components';

export function NewJob() {
  const { db, settings, trades } = useApp();
  const [site, setSite] = useState('');
  const [tradeId, setTradeId] = useState(trades.length === 1 ? trades[0]!.id : '');
  const ready = site.trim() !== '' && tradeId !== '';

  const create = async () => {
    if (!ready) return;
    const job = newJob(tradeId, site, settings);
    await db.saveJob(job);
    nav(`/job/${job.id}`, true);
  };

  return (
    <Screen title="New job" back="/">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <div class="card">
          <Labelled label="Site" for="site" help="The street is enough.">
            <input id="site" type="text" autocomplete="off" value={site} onInput={(e) => setSite(e.currentTarget.value)} />
          </Labelled>
          {trades.length > 1 && (
            <div class="field">
              <span class="label" id="trade-label">
                Trade
              </span>
              <div class="choices" role="radiogroup" aria-labelledby="trade-label">
                {trades.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    role="radio"
                    aria-checked={tradeId === t.id}
                    class={`choice${tradeId === t.id ? ' on' : ''}`}
                    onClick={() => setTradeId(t.id)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button class="btn primary block" type="submit" disabled={!ready}>
          Start sizing
        </button>
      </form>
    </Screen>
  );
}
