/**
 * The parts of an invoice that come from your company settings, and can be
 * left off this one.
 *
 * Settings say what your business is; an invoice is one document to one
 * client, and now and then a piece of that does not belong on it — a job with
 * no tax on it, a client who pays by card and does not need the bank details,
 * a plain sheet without the letterhead. Turning a part off here changes this
 * invoice only; settings stay as they are.
 *
 * Kept with the invoice rather than worked out when it is read, so the copy
 * the client is holding never grows a line it did not have when it was sent.
 */
export const INVOICE_PARTS = [
  { key: 'logo', label: 'Logo', hint: 'The mark at the top' },
  { key: 'contact', label: 'Contact line', hint: 'Email, phone and site' },
  { key: 'address', label: 'Business address', hint: 'Under your name' },
  { key: 'pay', label: 'How to pay', hint: 'Bank details at the foot' },
  { key: 'taxNumber', label: 'Tax registration', hint: 'Your TRN or VAT number' },
  { key: 'notes', label: 'Notes', hint: 'The terms you wrote' },
] as const;

export type InvoicePart = (typeof INVOICE_PARTS)[number]['key'];

export const INVOICE_PART_KEYS = INVOICE_PARTS.map((part) => part.key) as InvoicePart[];

/** Everything is on unless it was turned off, so an older invoice is whole. */
export function shows(hidden: readonly string[] | null | undefined, part: InvoicePart): boolean {
  return !hidden?.includes(part);
}
