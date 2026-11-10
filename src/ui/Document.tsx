import { extraAmount, formatMoney, formatQty, lineAmount, totals, unitLabel } from '../core/money';
import { formatDate } from '../core/quote';
import type { DocData } from '../core/quoteText';
import { useApp } from './app';

/** The paper layout, used on screen for a quote and on paper for both. */
export function Document({ doc, printOnly }: { doc: DocData; printOnly?: boolean }) {
  const { settings: s } = useApp();
  const t = totals(doc.lines, doc.extras, doc.chargeGst);
  return (
    <article class={`doc${printOnly ? ' print-only' : ''}`}>
      <header class="doc-head">
        <div>
          <p class="doc-business">{s.businessName || 'Business name not set'}</p>
          {s.address && <p>{s.address}</p>}
          {s.phone && <p>{s.phone}</p>}
          {s.email && <p>{s.email}</p>}
          {doc.chargeGst && doc.gstNumber && <p>GST number {doc.gstNumber}</p>}
        </div>
        <div class="doc-id">
          <p class="doc-label">{doc.label}</p>
          {doc.number && <p>{doc.number}</p>}
          <p>{formatDate(doc.date)}</p>
        </div>
      </header>
      <p class="doc-site">
        <strong>Site:</strong> {doc.siteName}
      </p>
      {doc.label === 'Estimate' && <p class="doc-note">Estimate only, not an offer.</p>}

      <table class="doc-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="n">Qty</th>
            <th class="n">Rate</th>
            <th class="n">Amount</th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((l) => (
            <tr key={l.id}>
              <td>{l.label || 'Item'}</td>
              <td class="n">
                {formatQty(l.qty, l.unit)} {unitLabel(l.unit)}
              </td>
              <td class="n">{formatMoney(l.rateCents)}</td>
              <td class="n">{formatMoney(lineAmount(l))}</td>
            </tr>
          ))}
          {doc.extras.length > 0 && (
            <tr class="doc-sub">
              <th colSpan={4}>Extras</th>
            </tr>
          )}
          {doc.extras.map((e) => (
            <tr key={e.id}>
              <td>{e.item || 'Extra'}</td>
              <td class="n">{formatQty(e.qty, 'hr')}</td>
              <td class="n">{formatMoney(e.costCents)}</td>
              <td class="n">{formatMoney(extraAmount(e))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {doc.chargeGst ? (
            <>
              <tr>
                <td colSpan={3}>Total excluding GST</td>
                <td class="n">{formatMoney(t.subtotalCents)}</td>
              </tr>
              <tr>
                <td colSpan={3}>GST 15%</td>
                <td class="n">{formatMoney(t.gstCents)}</td>
              </tr>
              <tr class="grand">
                <td colSpan={3}>Total including GST</td>
                <td class="n">{formatMoney(t.totalCents)}</td>
              </tr>
            </>
          ) : (
            <tr class="grand">
              <td colSpan={3}>Total (no GST charged)</td>
              <td class="n">{formatMoney(t.totalCents)}</td>
            </tr>
          )}
        </tfoot>
      </table>

      {doc.terms?.trim() && (
        <section class="doc-terms">
          <h2>Terms</h2>
          <p>{doc.terms}</p>
        </section>
      )}
      {doc.label === 'Quote' && s.bankLine?.trim() && <p class="doc-bank">{s.bankLine}</p>}
    </article>
  );
}
