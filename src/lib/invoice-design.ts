/**
 * The sheet designs an invoice can be drawn in.
 *
 * A template is meant to be a different document, not the same document with
 * different words in it — so the design is what a template mostly is, and the
 * lines it comes with are the smaller half of the idea.
 *
 * The design is a layout: where the heading sits, whether the table wears a
 * bar, how the total is called out. Colour and typeface stay separate, chosen
 * per invoice, so the two do not have to know about each other.
 */
export const INVOICE_DESIGNS = {
  classic: {
    label: 'Classic',
    blurb: 'A quiet letterhead with a tinted band. What Handled writes by default.',
  },
  bold: {
    label: 'Bold',
    blurb: 'A dark table bar, a plain heading, and the total called out at the end.',
  },
  modern: {
    label: 'Modern',
    blurb: 'A coloured masthead across the top, striped lines and a boxed total.',
  },
} as const;

export type InvoiceDesign = keyof typeof INVOICE_DESIGNS;

export const DEFAULT_DESIGN: InvoiceDesign = 'classic';

export function invoiceDesign(value: string | null | undefined): InvoiceDesign {
  return value && value in INVOICE_DESIGNS ? (value as InvoiceDesign) : DEFAULT_DESIGN;
}

/** The dark the bold sheet paints its table bar and its heading in. */
export const BOLD_INK = '#2b3a55';
