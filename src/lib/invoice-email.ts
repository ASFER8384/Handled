import { formatMoney } from '@/lib/money';

/**
 * The email an invoice goes out in.
 *
 * It is written as a covering note rather than a copy of the document: the
 * number, what is owed, when it is due, and where to send it. Everything else
 * is on the invoice itself, and repeating it here only invites the two to
 * disagree later.
 *
 * What comes back is a starting point, not a fixed message. It is put into the
 * composer for you to add to, so what leaves is still something a person
 * wrote.
 */
export type InvoiceEmailInput = {
  number: string;
  business: string;
  clientName: string;
  balanceCents: number;
  currency: string;
  dueAt: Date | null;
  /** Bank details from the company settings: label and value, in order. */
  pay: [string, string][];
  payNotes: string | null;
};

export function invoiceEmailSubject(input: InvoiceEmailInput): string {
  return `Invoice ${input.number} from ${input.business}`;
}

/** The body, as HTML: the composer is a rich text field, so it takes markup. */
export function invoiceEmailHtml(input: InvoiceEmailInput): string {
  const amount = formatMoney(input.balanceCents, input.currency);
  const due = input.dueAt
    ? input.dueAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const lines = [
    `<p>Hi ${escapeHtml(firstName(input.clientName))},</p>`,
    `<p>Invoice <strong>${escapeHtml(input.number)}</strong> comes to <strong>${escapeHtml(amount)}</strong>${
      due ? `, due <strong>${escapeHtml(due)}</strong>` : ''
    }.</p>`,
  ];

  if (input.pay.length > 0) {
    const details = input.pay
      .map(([label, value]) => `${escapeHtml(label)}: ${escapeHtml(value)}`)
      .join('<br>');
    lines.push(`<p>How to pay:<br>${details}</p>`);
  }
  if (input.payNotes) {
    lines.push(`<p>${escapeHtml(input.payNotes).split('\n').join('<br>')}</p>`);
  }

  lines.push('<p>Any questions, just reply to this email.</p>');
  lines.push('<p>Thank you,<br>{{my_name}}</p>');

  return lines.join('');
}

/** 'Marina Events LLC' is not what you call someone at the top of an email. */
function firstName(name: string): string {
  return name.split(' ')[0] || name;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
