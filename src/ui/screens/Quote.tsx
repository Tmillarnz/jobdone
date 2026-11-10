import { useEffect, useState } from 'preact/hooks';
import { formatDate } from '../../core/quote';
import { docText, type DocData } from '../../core/quoteText';
import type { Quote } from '../../core/types';
import { nav, useApp } from '../app';
import { Missing, Screen } from '../components';
import { Document } from '../Document';

export function quoteDoc(q: Quote): DocData {
  return { label: 'Quote', number: q.number, date: q.date, siteName: q.siteName, lines: q.lines, extras: q.extras, chargeGst: q.chargeGst, gstNumber: q.gstNumber, terms: q.terms };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older WebViews and non-secure pages: fall back to a selection copy.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function QuoteScreen({ id }: { id: string }) {
  const { db, settings } = useApp();
  const [quote, setQuote] = useState<Quote | null | undefined>(undefined);
  const [jobExists, setJobExists] = useState(false);
  const [copied, setCopied] = useState('');
  useEffect(() => {
    void db.getQuote(id).then(async (q) => {
      setQuote(q ?? null);
      if (q) setJobExists((await db.getJob(q.jobId)) !== undefined);
    });
  }, [id]);
  if (quote === undefined) return null;
  if (!quote) return <Missing what="quote" />;

  const doc = quoteDoc(quote);
  const setSent = async (sentAt: string | undefined) => {
    const { sentAt: _old, ...rest } = quote;
    const next: Quote = sentAt ? { ...rest, sentAt } : rest;
    setQuote(next);
    await db.saveQuote(next);
  };
  const copy = async () => {
    setCopied((await copyText(docText(doc, settings))) ? 'Copied. Paste it into your email or text.' : 'This device would not copy. Use Print or save as PDF.');
  };

  return (
    <Screen title={`Quote ${quote.number}`} sub={quote.siteName} back="/quotes">
      <div class="no-print">
        <p class={`notice${quote.sentAt ? '' : ' warn'}`}>
          {quote.sentAt
            ? `Marked sent on ${formatDate(quote.sentAt)}.`
            : 'Confirmed, not yet sent. The app never sends anything. Copy or print it, send it yourself, then mark it sent.'}
        </p>
        <p class="lead">This quote is fixed. Later changes to the job or to Settings do not change it.</p>
      </div>

      <Document doc={doc} />

      <div class="no-print">
        <p class="status" role="status">
          {copied}
        </p>
        <div class="actions">
          <button class="btn" onClick={() => void copy()}>
            Copy as text
          </button>
          <button class="btn" onClick={() => window.print()}>
            Print or save as PDF
          </button>
        </div>
        <div class="actions">
          {quote.sentAt ? (
            <button class="btn" onClick={() => void setSent(undefined)}>
              Mark not sent
            </button>
          ) : (
            <button class="btn primary" onClick={() => void setSent(new Date().toISOString())}>
              Mark sent
            </button>
          )}
          {jobExists && (
            <button class="btn" onClick={() => nav(`/job/${quote.jobId}`)}>
              Open the job
            </button>
          )}
        </div>
      </div>
    </Screen>
  );
}
