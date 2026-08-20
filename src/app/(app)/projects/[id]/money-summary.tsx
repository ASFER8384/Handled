import { formatMoney } from '@/lib/money';

/**
 * Where this project's money stands, in the order you ask about it.
 *
 * Outstanding is the number anyone actually comes here for, so it is said
 * once, large, and the rest sits under it as the workings. The bar is the same
 * fact drawn: how much of what you have billed has landed. Nothing is shown as
 * a percentage — a project is a handful of invoices, not a statistic.
 */
export function MoneySummary({
  valueCents,
  invoicedCents,
  paidCents,
  currency,
}: {
  valueCents: number;
  invoicedCents: number;
  paidCents: number;
  currency: string;
}) {
  const outstanding = invoicedCents - paidCents;
  const settled = invoicedCents > 0 && outstanding <= 0;
  const filled = invoicedCents > 0 ? Math.min(100, (paidCents / invoicedCents) * 100) : 0;

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted text-xs tracking-widest uppercase">
            {settled ? 'All paid' : 'Outstanding'}
          </p>
          <p
            className={`mt-1.5 text-3xl font-semibold tabular-nums ${settled ? '' : 'text-accent'}`}
          >
            {formatMoney(settled ? invoicedCents : outstanding, currency)}
          </p>
        </div>

        <p className="text-muted text-sm">
          {formatMoney(paidCents, currency)} of {formatMoney(invoicedCents, currency)} invoiced
        </p>
      </div>

      {/* The same two numbers, drawn. Empty until something has been billed. */}
      <div className="bg-background mt-4 h-2 overflow-hidden rounded-full">
        <div
          className="bg-accent h-full rounded-full transition-[width] duration-500"
          style={{ width: `${filled}%` }}
        />
      </div>

      <dl className="divide-line mt-5 grid gap-px sm:grid-cols-3 sm:divide-x">
        <Figure label="Project value" cents={valueCents} currency={currency} />
        <Figure label="Invoiced" cents={invoicedCents} currency={currency} pad />
        <Figure label="Paid" cents={paidCents} currency={currency} pad />
      </dl>
    </section>
  );
}

function Figure({
  label,
  cents,
  currency,
  pad,
}: {
  label: string;
  cents: number;
  currency: string;
  /** Off the divider, for the columns that have one to their left. */
  pad?: boolean;
}) {
  return (
    <div className={pad ? 'sm:pl-5' : ''}>
      <dt className="text-muted text-sm">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{formatMoney(cents, currency)}</dd>
    </div>
  );
}
