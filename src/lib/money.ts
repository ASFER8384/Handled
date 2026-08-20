/**
 * Money is stored and passed around as integer minor units (cents/fils).
 * Floats never touch a total.
 */

export function formatMoney(cents: number, currency = 'AED'): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Headline figures go compact — "AED 12K", "AED 1.2K". Minor units read as an
 * invoice line, not a number, and blow out the column they sit in.
 */
export function formatMoneyCompact(cents: number, currency = 'AED'): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
    // Otherwise 12,000 renders as "AED 12.0K".
    trailingZeroDisplay: 'stripIfInteger',
  }).format(cents / 100);
}

/** Parses user input like "1,250.50" into 125050. Returns null if unparseable. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export type LineItem = { quantity: number; unitPriceCents: number };

export function subtotalCents(items: readonly LineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
}

/**
 * Tax on the subtotal, at a rate held in basis points — 500 is 5%.
 *
 * Rounded once, on the whole invoice, rather than per line: rounding each line
 * and adding them up is how a total comes out a fil away from the same sum
 * done on paper.
 */
export function taxCents(items: readonly LineItem[], rateBp: number): number {
  if (!rateBp) return 0;
  return Math.round((subtotalCents(items) * rateBp) / 10000);
}

/** What is actually owed: the lines plus whatever tax is charged on them. */
export function totalCents(items: readonly LineItem[], rateBp = 0): number {
  return subtotalCents(items) + taxCents(items, rateBp);
}

/** A rate as it is written: 500 -> "5%", 250 -> "2.5%". */
export function formatRate(rateBp: number): string {
  return `${(rateBp / 100).toFixed(rateBp % 100 === 0 ? 0 : 2).replace(/0$/, '')}%`;
}

export function paidCents(payments: readonly { amountCents: number }[]): number {
  return payments.reduce((sum, payment) => sum + payment.amountCents, 0);
}

export function balanceCents(
  items: readonly LineItem[],
  payments: readonly { amountCents: number }[],
  rateBp = 0,
): number {
  return totalCents(items, rateBp) - paidCents(payments);
}
