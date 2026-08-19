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

export function paidCents(payments: readonly { amountCents: number }[]): number {
  return payments.reduce((sum, payment) => sum + payment.amountCents, 0);
}

export function balanceCents(
  items: readonly LineItem[],
  payments: readonly { amountCents: number }[],
): number {
  return subtotalCents(items) - paidCents(payments);
}
