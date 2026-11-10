import { useEffect, useState } from 'preact/hooks';
import { formatMoney, totals } from '../../core/money';
import { formatDate } from '../../core/quote';
import type { Job } from '../../core/types';
import { nav, useApp } from '../app';
import { Screen } from '../components';

export function Jobs() {
  const { db, settings, tradeOf, trades } = useApp();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  useEffect(() => {
    void db.listJobs().then(setJobs);
  }, []);

  return (
    <Screen title="Jobs" back="/">
      {jobs?.length === 0 && (
        <p class="notice">
          No jobs yet. <a href="#/new">Start a new job.</a>
        </p>
      )}
      <ul class="list">
        {jobs?.map((j) => (
          <li key={j.id}>
            <button class="row" onClick={() => nav(`/job/${j.id}`)}>
              <span>
                <strong>{j.siteName || 'Unnamed site'}</strong>
                <small>
                  {trades.length > 1 && `${tradeOf(j.tradeId)?.name ?? j.tradeId} · `}
                  {j.areas.length} sized · {formatDate(j.updatedAt)}
                </small>
              </span>
              <span class="amount">{j.lines.length > 0 ? formatMoney(totals(j.lines, j.extras, settings.chargeGst).totalCents) : ''}</span>
            </button>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
