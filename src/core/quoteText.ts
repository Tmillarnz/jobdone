import { extraAmount, formatMoney, formatQty, lineAmount, totals, unitLabel } from './money';
import { formatDate } from './quote';
import type { Extra, Line, Settings } from './types';

export interface DocData {
  label: 'Estimate' | 'Quote';
  number?: string;
  date: string;
  siteName: string;
  lines: Line[];
  extras: Extra[];
  chargeGst: boolean;
  gstNumber: string;
  terms?: string;
}

type Business = Pick<Settings, 'businessName' | 'phone' | 'email' | 'address' | 'bankLine'>;

/** Plain text for pasting into an email or a text message. */
export function docText(doc: DocData, business: Business): string {
  const out: string[] = [];
  if (business.businessName.trim()) out.push(business.businessName.trim());
  const contact = [business.phone, business.email].map((s) => s.trim()).filter(Boolean).join(' · ');
  if (contact) out.push(contact);
  if (business.address.trim()) out.push(business.address.trim());
  if (out.length) out.push('');

  out.push(doc.number ? `${doc.label.toUpperCase()} ${doc.number}` : doc.label.toUpperCase());
  out.push(formatDate(doc.date));
  if (doc.siteName.trim()) out.push(`Site: ${doc.siteName.trim()}`);
  out.push('');

  for (const l of doc.lines) {
    out.push(l.label || 'Item');
    out.push(`  ${formatQty(l.qty, l.unit)} ${unitLabel(l.unit)} × ${formatMoney(l.rateCents)} = ${formatMoney(lineAmount(l))}`);
  }
  if (doc.extras.length) {
    out.push('', 'Extras');
    for (const e of doc.extras) {
      out.push(e.item || 'Extra');
      out.push(`  ${formatQty(e.qty, 'hr')} × ${formatMoney(e.costCents)} = ${formatMoney(extraAmount(e))}`);
    }
  }

  const t = totals(doc.lines, doc.extras, doc.chargeGst);
  out.push('');
  if (doc.chargeGst) {
    out.push(`Total excluding GST: ${formatMoney(t.subtotalCents)}`);
    out.push(`GST 15%: ${formatMoney(t.gstCents)}`);
    out.push(`Total including GST: ${formatMoney(t.totalCents)}`);
    if (doc.gstNumber.trim()) out.push(`GST number: ${doc.gstNumber.trim()}`);
  } else {
    out.push(`Total: ${formatMoney(t.totalCents)}`);
    out.push('No GST charged.');
  }

  if (doc.label === 'Estimate') out.push('', 'Estimate only, not an offer.');
  if (doc.terms?.trim()) out.push('', 'Terms', doc.terms.trim());
  if (doc.label === 'Quote' && business.bankLine?.trim()) out.push('', business.bankLine.trim());
  return out.join('\n');
}
