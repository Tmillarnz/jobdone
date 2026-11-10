import { useEffect, useState } from 'preact/hooks';
import { formatMoney, totals } from '../../core/money';
import { formatDate } from '../../core/quote';
import type { Quote } from '../../core/types';
import { nav, useApp } from '../app';
import { Screen } from '../components';

export function Quotes() {
  const { db } = useApp();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  useEffect(() => {
    void db.listQuotes().then(setQuotes);
  }, []);
  const sent = quotes?.filter((q) => q.sentAt) ?? [];
  const waiting = quotes?.filter((q) => !q.sentAt) ?? [];

  const list = (items: Quote[]) => (
    <ul class="list">
      {items.map((q) => (
        <li key={q.id}>
          <button class="row" onClick={() => nav(`/quote/${q.id}`)}>
            <span>
              <strong>{q.siteName || 'Unnamed site'}</strong>
              <small>
                {q.number} · {q.sentAt ? `sent ${formatDate(q.sentAt)}` : `confirmed ${formatDate(q.date)}`}
              </small>
            </span>
            <span class="amount">{formatMoney(totals(q.lines, q.extras, q.chargeGst).totalCents)}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <Screen title="Sent quotes" back="/">
      {quotes && sent.length === 0 && <p class="notice">No quotes marked sent yet.</p>}
      {list(sent)}
      {waiting.length > 0 && (
        <>
          <h2>Confirmed, not yet sent</h2>
          {list(waiting)}
        </>
      )}
    </Screen>
  );
}
