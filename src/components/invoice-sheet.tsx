import { formatMoney } from '@/lib/money';
import { formatDate } from '@/components/ui';
import { formatRate } from '@/lib/money';
import { invoiceTheme } from '@/lib/invoice-theme';

type Line = {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
};

/**
 * The invoice as the thing you would print and post, not as a list of fields.
 *
 * It is the same page on screen, in a PDF and on paper, because an invoice is
 * a document the other side keeps — and one that reads like a form is one they
 * have to be told how to read.
 */
export function InvoiceSheet({
  number,
  from,
  fromEmail,
  fromAddress,
  logo,
  billTo,
  issuedAt,
  dueAt,
  items,
  subtotal,
  tax,
  taxLabel,
  taxRateBp,
  taxNumber,
  paid,
  balance,
  currency,
  notes,
  pay,
  payNotes,
  themeColor,
  themeFont,
}: {
  number: string;
  from: string;
  /** Email, phone and site on one line, as a client reads them. */
  fromEmail: string;
  fromAddress?: string | null;
  /** Where the workspace's mark is served from, when it has one. */
  logo?: string | null;
  billTo: { name: string; company: string | null; address: string | null; email: string | null };
  issuedAt: Date | null;
  dueAt: Date | null;
  items: Line[];
  subtotal: number;
  /** Nothing is drawn for it when the rate is nothing. */
  tax?: number;
  taxLabel?: string;
  taxRateBp?: number;
  taxNumber?: string | null;
  paid: number;
  balance: number;
  currency: string;
  notes: string | null;
  /** Where to send the money, as label and value pairs. */
  pay?: [string, string][];
  payNotes?: string | null;
  /** How it is painted, as chosen when it was written. */
  themeColor?: string | null;
  themeFont?: string | null;
}) {
  const theme = invoiceTheme(themeColor ?? null, themeFont ?? null);

  return (
    <article className="invoice-sheet card p-8 sm:p-10" style={{ fontFamily: theme.stack }}>
      {/* who it is from */}
      <header>
        {/* Plain img: served by a route that checks the workspace, not a
            static asset, so next/image would only add a resizer in front. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo && <img src={logo} alt="" className="mb-3 max-h-16 max-w-[220px] object-contain" />}
        <p className="text-lg font-semibold">{from}</p>
        <p className="text-muted mt-0.5 text-sm">{fromEmail}</p>
        {fromAddress && (
          <p className="text-muted mt-0.5 text-sm whitespace-pre-line">{fromAddress}</p>
        )}
      </header>

      <h2
        className="mt-8 px-4 py-3 text-2xl font-bold tracking-tight"
        style={{ backgroundColor: `${theme.hex}14`, color: theme.hex }}
      >
        INVOICE
      </h2>

      {/* who it is to, and which invoice this is */}
      <div className="mt-8 grid gap-8 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="text-muted text-sm">Bill to</p>
          <p className="mt-1.5 font-medium">{billTo.name}</p>
          {billTo.company && <p className="text-sm">{billTo.company}</p>}
          {billTo.address && (
            <p className="text-muted text-sm whitespace-pre-line">{billTo.address}</p>
          )}
          {billTo.email && <p className="text-muted text-sm">{billTo.email}</p>}
        </div>

        <dl className="grid grid-cols-2 gap-x-10 gap-y-4 text-sm sm:text-right">
          <div>
            <dt className="text-muted">Invoice #</dt>
            <dd className="mt-1 font-medium tabular-nums">{number}</dd>
          </div>
          <div>
            <dt className="text-muted">Date issued</dt>
            <dd className="mt-1 font-medium">{issuedAt ? formatDate(issuedAt) : 'Not sent yet'}</dd>
          </div>
          <div>
            <dt className="text-muted">Payment due</dt>
            <dd className="mt-1 font-medium">{dueAt ? formatDate(dueAt) : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Balance due</dt>
            <dd className="mt-1 font-semibold tabular-nums" style={{ color: theme.hex }}>
              {formatMoney(balance, currency)}
            </dd>
          </div>
        </dl>
      </div>

      {/* what is being billed */}
      <table className="mt-10 w-full text-sm">
        <thead>
          <tr className="text-muted border-line border-b text-xs tracking-widest uppercase">
            <th className="py-3 text-left font-medium">Service info</th>
            <th className="py-3 text-right font-medium">Qty</th>
            <th className="py-3 text-right font-medium">Unit price</th>
            <th className="py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-line divide-y">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-3.5 pr-4">{item.description}</td>
              <td className="py-3.5 text-right tabular-nums">{item.quantity}</td>
              <td className="py-3.5 text-right tabular-nums">
                {formatMoney(item.unitPriceCents, currency)}
              </td>
              <td className="py-3.5 text-right tabular-nums">
                {formatMoney(item.quantity * item.unitPriceCents, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* what it comes to */}
      <div className="mt-6 flex justify-end">
        <dl className="w-full max-w-[280px] text-sm">
          <div className="flex justify-between py-1.5">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(subtotal, currency)}</dd>
          </div>
          {Boolean(taxRateBp) && (
            <div className="flex justify-between py-1.5">
              <dt className="text-muted">
                {taxLabel ?? 'VAT'} {formatRate(taxRateBp ?? 0)}
              </dt>
              <dd className="tabular-nums">{formatMoney(tax ?? 0, currency)}</dd>
            </div>
          )}
          <div className="flex justify-between py-1.5">
            <dt className="text-muted">Paid</dt>
            <dd className="tabular-nums">{formatMoney(paid, currency)}</dd>
          </div>
          <div className="border-line mt-1.5 flex justify-between border-t pt-3 text-base">
            <dt className="font-medium">Balance due</dt>
            <dd className="font-semibold tabular-nums" style={{ color: theme.hex }}>
              {formatMoney(balance, currency)}
            </dd>
          </div>
        </dl>
      </div>

      {(pay?.length || payNotes) && (
        <section className="border-line mt-10 border-t pt-5">
          <p className="text-muted text-xs tracking-widest uppercase">How to pay</p>
          <dl className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {pay?.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          {payNotes && <p className="text-muted mt-2 text-sm whitespace-pre-wrap">{payNotes}</p>}
          {taxNumber && (
            <p className="text-muted mt-2 text-sm">
              {taxLabel ?? 'VAT'} registration {taxNumber}
            </p>
          )}
        </section>
      )}

      {notes && (
        <footer className="border-line mt-10 border-t pt-5">
          <p className="text-muted text-xs tracking-widest uppercase">Notes</p>
          <p className="mt-2 text-sm whitespace-pre-wrap">{notes}</p>
        </footer>
      )}
    </article>
  );
}
