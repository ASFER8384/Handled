/**
 * An invoice paid in steps rather than all at once.
 *
 * The invoice stays one document with one total; the schedule says how that
 * total is broken up and when each piece falls due. Money is still recorded
 * against the invoice as a whole — a client pays what they pay — and the rows
 * fill from the top, which is the order the steps were agreed in.
 */
export type Instalment = {
  label: string;
  amountCents: number;
  dueAt: Date | null;
};

export type InstalmentState = 'PAID' | 'PART PAID' | 'OVERDUE' | 'UPCOMING';

export type InstalmentRow = Instalment & {
  state: InstalmentState;
  /** How much of this step the money in has covered. */
  paidCents: number;
};

/**
 * The schedule read against what has actually been paid.
 *
 * Payments are not tied to a step: they land on the invoice and fill the steps
 * in order, so a client who pays half of milestone two after all of milestone
 * one sees exactly that.
 */
export function scheduleRows(
  instalments: readonly Instalment[],
  paidCents: number,
  today = new Date(),
): InstalmentRow[] {
  let left = Math.max(0, paidCents);

  return instalments.map((instalment) => {
    const covered = Math.min(left, instalment.amountCents);
    left -= covered;

    const overdue = instalment.dueAt !== null && instalment.dueAt < today;
    const state: InstalmentState =
      covered >= instalment.amountCents && instalment.amountCents > 0
        ? 'PAID'
        : covered > 0
          ? 'PART PAID'
          : overdue
            ? 'OVERDUE'
            : 'UPCOMING';

    return { ...instalment, state, paidCents: covered };
  });
}

/**
 * A total split into equal steps, to the fil.
 *
 * The remainder goes on the last step rather than being spread or dropped: a
 * schedule that does not add up to the invoice is worse than an uneven one,
 * and it is the last payment people expect to be the odd amount.
 */
export function splitCents(total: number, parts: number): number[] {
  if (parts < 1) return [];
  const each = Math.floor(total / parts);
  const amounts = Array.from({ length: parts }, () => each);
  amounts[parts - 1] += total - each * parts;
  return amounts;
}

/** What the steps come to. Compared against the invoice total, not trusted over it. */
export function scheduledCents(instalments: readonly { amountCents: number }[]): number {
  return instalments.reduce((sum, instalment) => sum + instalment.amountCents, 0);
}

/**
 * A total split by agreed proportions — half, then a quarter, then a quarter.
 *
 * As with an even split, the rounding lands on the last step, so the pieces
 * always add back up to the invoice.
 */
export function splitByShares(total: number, shares: readonly number[]): number[] {
  if (shares.length === 0) return [];
  const whole = shares.reduce((sum, share) => sum + share, 0) || 1;
  const amounts = shares.map((share) => Math.floor((total * share) / whole));
  const rounding = total - amounts.reduce((sum, amount) => sum + amount, 0);
  amounts[amounts.length - 1] += rounding;
  return amounts;
}
