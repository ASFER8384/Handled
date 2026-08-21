/**
 * The way an invoice usually starts, so most of one is already written.
 *
 * One plain invoice on your own letterhead — logo, contact details, terms —
 * with a single line to describe the work. The wording is done; the price is
 * yours to put in, and is left empty rather than guessed at.
 *
 * The rest of the gallery is yours — an invoice you like is saved as a
 * template from its own page, and shows up here beside this one.
 */
export type InvoiceTemplate = {
  id: string;
  name: string;
  /** The one line under the name in the picker. */
  blurb: string;
  /** How long after today it falls due, when it is made from this. */
  dueInDays: number;
  notes: string;
  /** What kind of file it is, for the gallery filter. */
  kind: string;
  /** The sheet design it is drawn in. A template is mostly this. */
  design: 'classic' | 'bold' | 'modern';
  /** The trades it was written for, or 'Any business' when it suits all of them. */
  industries: string[];
  /** `sampleCents` is only ever drawn in a preview, never saved on an invoice. */
  items: { description: string; quantity: number; sampleCents?: number }[];
  /**
   * How the total is broken up, when it is not paid in one go. `share` is a
   * proportion of the invoice — the amounts themselves are worked out once
   * there are prices to work them out from — and `days` is how long after
   * today that step falls due.
   */
  schedule?: { label: string; share: number; days: number }[];
};

export const INVOICE_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 'simple',
    name: 'Simple invoice with logo',
    blurb: 'Your logo, your details, one line to fill in.',
    kind: 'Invoice',
    design: 'classic',
    industries: ['Any business'],
    dueInDays: 14,
    notes: 'Payable in full by the due date above.',
    items: [{ description: 'Services provided', quantity: 1, sampleCents: 250000 }],
  },
  {
    id: 'schedule',
    name: 'Invoice with a payment schedule',
    blurb: 'One job, paid in steps: a deposit, a middle payment, the rest on delivery.',
    kind: 'Invoice',
    design: 'bold',
    industries: ['Any business', 'Photography & video', 'Events & weddings'],
    dueInDays: 60,
    notes: 'Each step is due on the date beside it. The work continues once each one is in.',
    items: [
      { description: 'Coverage on the day', quantity: 1, sampleCents: 600000 },
      { description: 'Editing and delivery', quantity: 1, sampleCents: 150000 },
    ],
    schedule: [
      { label: 'Deposit', share: 0.5, days: 7 },
      { label: 'Before the day', share: 0.25, days: 30 },
      { label: 'On delivery', share: 0.25, days: 60 },
    ],
  },
  {
    id: 'hours',
    name: 'Hours and materials',
    blurb: 'Time billed by the hour, with what was bought alongside it.',
    kind: 'Invoice',
    design: 'modern',
    industries: ['Consulting', 'Design & creative', 'Any business'],
    dueInDays: 7,
    notes: 'Hours are billed as worked. Receipts for anything bought are attached on request.',
    items: [
      { description: 'Design hours', quantity: 12, sampleCents: 45000 },
      { description: 'Revisions', quantity: 3, sampleCents: 45000 },
      { description: 'Stock photography and fonts', quantity: 1, sampleCents: 90000 },
    ],
  },
];

/** Every industry any template claims, for the gallery's filter. */
export const TEMPLATE_INDUSTRIES = [
  ...new Set(INVOICE_TEMPLATES.flatMap((template) => template.industries)),
].sort();

export function findTemplate(id: string | null | undefined): InvoiceTemplate | null {
  return INVOICE_TEMPLATES.find((template) => template.id === id) ?? null;
}

/** Local YYYY-MM-DD a number of days from today, for a date field. */
export function dueDateFromNow(days: number, today = new Date()): string {
  const due = new Date(today);
  due.setDate(today.getDate() + days);
  return due.toLocaleDateString('en-CA');
}
