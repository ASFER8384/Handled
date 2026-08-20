import { formatMoney, formatRate } from '@/lib/money';
import { invoiceTheme } from '@/lib/invoice-theme';

/**
 * The invoice itself, written as an email.
 *
 * A covering note saying an amount is owed is not an invoice; the client has
 * to be able to read the document in the message they were sent. So the whole
 * sheet is drawn here in the body: your name, who is being billed, every line
 * with its price, what it comes to, and where to send the money.
 *
 * It is built with tables and inline styles rather than the app's stylesheet.
 * Mail clients throw away a <style> block and most of what modern CSS does,
 * and an invoice that arrives as a stack of unstyled paragraphs is worse than
 * one that never left.
 */
export type InvoiceEmailInput = {
  number: string;
  business: string;
  businessContact: string;
  businessAddress: string | null;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  issuedAt: Date | null;
  dueAt: Date | null;
  items: { description: string; quantity: number; unitPriceCents: number }[];
  subtotalCents: number;
  taxCents: number;
  taxLabel: string;
  taxRateBp: number;
  paidCents: number;
  balanceCents: number;
  currency: string;
  notes: string | null;
  themeColor: string | null;
  /** Bank details from the company settings: label and value, in order. */
  pay: [string, string][];
  payNotes: string | null;
};

export function invoiceEmailSubject(input: InvoiceEmailInput): string {
  return `Invoice ${input.number} from ${input.business}`;
}

/**
 * The covering note the invoice travels with.
 *
 * Short on purpose: the document is attached as a PDF, and repeating it here
 * only gives the two something to disagree about. It says who it is for, what
 * is owed, and by when.
 */
export function invoiceEmailHtml(input: InvoiceEmailInput): string {
  const amount = formatMoney(input.balanceCents, input.currency);
  const due = date(input.dueAt);

  const lines = [
    `<p>Hi ${esc(firstName(input.clientName))},</p>`,
    `<p>Invoice <strong>${esc(input.number)}</strong> is attached, for <strong>${esc(amount)}</strong>${
      due ? `, due <strong>${esc(due)}</strong>` : ''
    }.</p>`,
  ];

  if (input.pay.length > 0) {
    lines.push(
      `<p>How to pay:<br>${input.pay
        .map(([label, value]) => `${esc(label)}: ${esc(value)}`)
        .join('<br>')}</p>`,
    );
  }
  if (input.payNotes) lines.push(`<p>${esc(input.payNotes)}</p>`);

  lines.push('<p>Any questions, just reply to this email.</p>');
  lines.push('<p>Thank you,<br>{{my_name}}</p>');
  return lines.join('');
}

/** The document on its own, for anywhere else that has to show one in a mail. */
export function invoiceDocumentHtml(input: InvoiceEmailInput): string {
  const accent = invoiceTheme(input.themeColor, null).hex;
  const muted = '#6b615a';
  const line = '#e9e0d7';
  const cell = `padding:10px 0;border-bottom:1px solid ${line};font-size:14px`;
  const head = `padding:8px 0;border-bottom:1px solid ${line};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${muted};text-align:left`;

  const rows = input.items
    .map(
      (item) =>
        `<tr>` +
        `<td style="${cell}">${esc(item.description)}</td>` +
        `<td style="${cell};text-align:right">${item.quantity}</td>` +
        `<td style="${cell};text-align:right">${esc(formatMoney(item.unitPriceCents, input.currency))}</td>` +
        `<td style="${cell};text-align:right">${esc(formatMoney(item.quantity * item.unitPriceCents, input.currency))}</td>` +
        `</tr>`,
    )
    .join('');

  const totals = [
    ['Subtotal', formatMoney(input.subtotalCents, input.currency), false],
    ...(input.taxRateBp
      ? [
          [
            `${input.taxLabel} ${formatRate(input.taxRateBp)}`,
            formatMoney(input.taxCents, input.currency),
            false,
          ] as const,
        ]
      : []),
    ['Paid', formatMoney(input.paidCents, input.currency), false],
    ['Balance due', formatMoney(input.balanceCents, input.currency), true],
  ]
    .map(
      ([label, value, strong]) =>
        `<tr>` +
        `<td style="padding:6px 0;font-size:14px;color:${strong ? '#17110e' : muted};${
          strong ? `font-weight:600;border-top:1px solid ${line};padding-top:10px` : ''
        }">${esc(String(label))}</td>` +
        `<td style="padding:6px 0;font-size:14px;text-align:right;${
          strong
            ? `font-weight:600;color:${accent};border-top:1px solid ${line};padding-top:10px`
            : ''
        }">${esc(String(value))}</td>` +
        `</tr>`,
    )
    .join('');

  const payBlock = input.pay.length
    ? `<tr><td colspan="4" style="padding-top:24px;border-top:1px solid ${line}">` +
      `<p style="margin:0 0 6px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${muted}">How to pay</p>` +
      input.pay
        .map(
          ([label, value]) =>
            `<p style="margin:0;font-size:14px"><span style="color:${muted}">${esc(label)}:</span> ${esc(value)}</p>`,
        )
        .join('') +
      (input.payNotes
        ? `<p style="margin:8px 0 0;font-size:13px;color:${muted}">${esc(input.payNotes)}</p>`
        : '') +
      `</td></tr>`
    : '';

  const notesBlock = input.notes
    ? `<tr><td colspan="4" style="padding-top:20px">` +
      `<p style="margin:0 0 4px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${muted}">Notes</p>` +
      `<p style="margin:0;font-size:14px">${esc(input.notes)}</p>` +
      `</td></tr>`
    : '';

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" ` +
    `style="max-width:640px;border:1px solid ${line};border-radius:12px;padding:28px;margin-top:24px;font-family:Arial,Helvetica,sans-serif;color:#17110e">` +
    // who it is from
    `<tr><td colspan="4">` +
    `<p style="margin:0;font-size:17px;font-weight:600">${esc(input.business)}</p>` +
    `<p style="margin:2px 0 0;font-size:13px;color:${muted}">${esc(input.businessContact)}</p>` +
    (input.businessAddress
      ? `<p style="margin:2px 0 0;font-size:13px;color:${muted}">${esc(input.businessAddress)}</p>`
      : '') +
    `</td></tr>` +
    // the band
    `<tr><td colspan="4" style="padding:22px 0 18px">` +
    `<div style="background:${accent}14;color:${accent};padding:12px 16px;font-size:22px;font-weight:700;letter-spacing:-0.5px">INVOICE</div>` +
    `</td></tr>` +
    // who it is to, and when
    `<tr><td colspan="2" style="vertical-align:top;padding-bottom:20px">` +
    `<p style="margin:0;font-size:13px;color:${muted}">Bill to</p>` +
    `<p style="margin:4px 0 0;font-size:14px;font-weight:600">${esc(input.clientName)}</p>` +
    (input.clientCompany
      ? `<p style="margin:0;font-size:14px">${esc(input.clientCompany)}</p>`
      : '') +
    (input.clientEmail
      ? `<p style="margin:0;font-size:13px;color:${muted}">${esc(input.clientEmail)}</p>`
      : '') +
    `</td>` +
    `<td colspan="2" style="vertical-align:top;text-align:right;padding-bottom:20px">` +
    field('Invoice #', input.number, muted) +
    field('Date issued', date(input.issuedAt) ?? 'Not sent yet', muted) +
    field('Payment due', date(input.dueAt) ?? '—', muted) +
    `</td></tr>` +
    // what is being billed
    `<tr>` +
    `<th style="${head}">Service info</th>` +
    `<th style="${head};text-align:right">Qty</th>` +
    `<th style="${head};text-align:right">Unit price</th>` +
    `<th style="${head};text-align:right">Total</th>` +
    `</tr>` +
    rows +
    // what it comes to
    `<tr><td colspan="2"></td><td colspan="2" style="padding-top:14px">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${totals}</table>` +
    `</td></tr>` +
    payBlock +
    notesBlock +
    `</table>`
  );
}

function field(label: string, value: string, muted: string): string {
  return (
    `<p style="margin:0 0 10px"><span style="display:block;font-size:13px;color:${muted}">${esc(label)}</span>` +
    `<span style="font-size:14px;font-weight:600">${esc(value)}</span></p>`
  );
}

function date(value: Date | null): string | null {
  if (!value) return null;
  return value.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** 'Marina Events LLC' is not what you call someone at the top of an email. */
function firstName(name: string): string {
  return name.split(' ')[0] || name;
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
