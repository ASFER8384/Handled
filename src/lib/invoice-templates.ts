/**
 * Three ways an invoice usually starts, so most of one is already written.
 *
 * They are the shapes of the money rather than the amounts: a retainer to hold
 * a date, the balance that follows it, or the whole job billed at once. The
 * lines are named and the terms are said; the prices are yours to put in, and
 * are left empty rather than guessed at.
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
  /** The trades it was written for, or 'Any business' when it suits all of them. */
  industries: string[];
  /** `sampleCents` is only ever drawn in a preview, never saved on an invoice. */
  items: { description: string; quantity: number; sampleCents?: number }[];
};

export const INVOICE_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 'deposit',
    name: 'Deposit',
    blurb: 'A retainer that holds the date, with the rest to follow.',
    kind: 'Invoice',
    industries: ['Photography & video', 'Events & weddings'],
    dueInDays: 7,
    notes: 'This retainer holds your date. The balance is due before the day itself.',
    items: [{ description: 'Retainer to hold the date', quantity: 1, sampleCents: 250000 }],
  },
  {
    id: 'balance',
    name: 'Balance',
    blurb: 'What is left to pay once the deposit is in.',
    kind: 'Invoice',
    industries: ['Photography & video', 'Events & weddings'],
    dueInDays: 14,
    notes: 'The balance of the agreed fee, less the retainer already paid.',
    items: [
      { description: 'Balance of agreed fee', quantity: 1, sampleCents: 750000 },
      { description: 'Less retainer already paid', quantity: 1, sampleCents: -250000 },
    ],
  },
  {
    id: 'full',
    name: 'Full amount',
    blurb: 'The whole job on one invoice, itemised.',
    kind: 'Invoice',
    industries: ['Any business', 'Design & creative', 'Consulting'],
    dueInDays: 14,
    notes: 'Payable in full by the due date above.',
    items: [
      { description: 'Coverage on the day', quantity: 1, sampleCents: 600000 },
      { description: 'Editing and delivery', quantity: 1, sampleCents: 150000 },
      { description: 'Travel', quantity: 1, sampleCents: 50000 },
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
