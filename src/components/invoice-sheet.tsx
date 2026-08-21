import { formatMoney } from '@/lib/money';
import type { InstalmentRow } from '@/lib/invoice-schedule';
import { formatDate } from '@/components/ui';
import { formatRate } from '@/lib/money';
import { invoiceTheme } from '@/lib/invoice-theme';
import { BOLD_INK, invoiceDesign } from '@/lib/invoice-design';

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
  schedule,
  design,
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
  /** The steps it is paid in, already read against what has been paid. */
  schedule?: InstalmentRow[];
  /** Which sheet design it is drawn in: a layout, not a colour. */
  design?: string | null;
  /** How it is painted, as chosen when it was written. */
  themeColor?: string | null;
  themeFont?: string | null;
}) {
  const theme = invoiceTheme(themeColor ?? null, themeFont ?? null);
  // Two documents rather than two skins: the bold sheet moves the heading,
  // bars the table and calls out the total, and the classic one does none of
  // those. Everything below is written once and asks which it is drawing.
  const look = invoiceDesign(design);
  const bold = look === 'bold';
  const modern = look === 'modern';
  const nextDue = schedule?.find((step) => step.state !== 'PAID') ?? null;

  return (
    <article
      className="invoice-sheet card @container p-8 @lg:p-10"
      style={{ fontFamily: theme.stack }}
    >
      {/* who it is from */}
      {modern ? (
        <header
          className="-mx-8 -mt-8 mb-8 flex flex-wrap items-start justify-between gap-6 px-8 py-7 @lg:-mx-10 @lg:-mt-10 @lg:mb-10 @lg:px-10"
          style={{ backgroundColor: theme.hex, color: '#ffffff' }}
        >
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo && (
              <span className="mb-3 inline-block rounded bg-white p-1.5">
                <img src={logo} alt="" className="max-h-10 max-w-[160px] object-contain" />
              </span>
            )}
            <p className="text-lg font-semibold">{from}</p>
            {fromEmail && <p className="mt-0.5 text-sm text-white/75">{fromEmail}</p>}
            {fromAddress && (
              <p className="mt-0.5 text-sm whitespace-pre-line text-white/75">{fromAddress}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tracking-tight">INVOICE</p>
            <p className="mt-1 text-sm text-white/75 tabular-nums">{number}</p>
          </div>
        </header>
      ) : (
        <header>
          {/* Plain img: served by a route that checks the workspace, not a
            static asset, so next/image would only add a resizer in front. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo && <img src={logo} alt="" className="mb-3 max-h-16 max-w-[220px] object-contain" />}
          {bold ? (
            <>
              {/* The sender is a byline here, not a masthead: the word INVOICE
                is what the page leads with. */}
              <p className="text-sm font-semibold" style={{ color: theme.hex }}>
                {from}
              </p>
              {fromEmail && (
                <p className="mt-0.5 text-xs" style={{ color: theme.hex }}>
                  {fromEmail}
                </p>
              )}
              {fromAddress && (
                <p className="text-muted mt-0.5 text-xs whitespace-pre-line">{fromAddress}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-lg font-semibold">{from}</p>
              <p className="text-muted mt-0.5 text-sm">{fromEmail}</p>
              {fromAddress && (
                <p className="text-muted mt-0.5 text-sm whitespace-pre-line">{fromAddress}</p>
              )}
            </>
          )}
        </header>
      )}

      {modern ? null : bold ? (
        <h2 className="mt-6 text-3xl font-bold tracking-tight">Invoice</h2>
      ) : (
        <h2
          className="mt-8 px-4 py-3 text-2xl font-bold tracking-tight"
          style={{ backgroundColor: `${theme.hex}14`, color: theme.hex }}
        >
          INVOICE
        </h2>
      )}

      {/* who it is to, and which invoice this is */}
      <div className="mt-8 grid gap-8 @lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-muted text-sm">Bill to</p>
          <p className="mt-1.5 font-medium">{billTo.name}</p>
          {billTo.company && <p className="text-sm">{billTo.company}</p>}
          {billTo.address && (
            <p className="text-muted text-sm whitespace-pre-line">{billTo.address}</p>
          )}
          {billTo.email && <p className="text-muted text-sm">{billTo.email}</p>}
        </div>

        <dl className="grid grid-cols-2 gap-x-10 gap-y-4 text-sm @lg:text-right">
          {/* The modern sheet says the number in its masthead already. */}
          {!modern && (
            <div>
              <dt className="text-muted">Invoice #</dt>
              <dd className="mt-1 font-medium tabular-nums">{number}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted">Date issued</dt>
            <dd className="mt-1 font-medium">{issuedAt ? formatDate(issuedAt) : 'Not sent yet'}</dd>
          </div>
          <div>
            <dt className="text-muted">{nextDue ? 'Next payment due' : 'Payment due'}</dt>
            <dd className="mt-1 font-medium" style={nextDue ? { color: theme.hex } : undefined}>
              {nextDue ? nextDue.label : dueAt ? formatDate(dueAt) : '—'}
            </dd>
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
      <table className={`w-full text-sm ${bold ? 'mt-8' : 'mt-10'}`}>
        <thead>
          <tr
            className={
              bold
                ? 'text-xs tracking-widest text-white uppercase'
                : modern
                  ? 'text-xs tracking-widest uppercase'
                  : 'text-muted border-line border-b text-xs tracking-widest uppercase'
            }
            style={
              bold
                ? { backgroundColor: BOLD_INK }
                : modern
                  ? { backgroundColor: `${theme.hex}14`, color: theme.hex }
                  : undefined
            }
          >
            <th className={`text-left font-medium ${bold || modern ? 'px-4 py-3' : 'py-3'}`}>
              Service info
            </th>
            <th
              className={`hidden text-right font-medium @lg:table-cell ${bold || modern ? 'px-4 py-3' : 'py-3'}`}
            >
              Qty
            </th>
            <th
              className={`hidden text-right font-medium @lg:table-cell ${bold || modern ? 'px-4 py-3' : 'py-3'}`}
            >
              Unit price
            </th>
            <th className={`text-right font-medium ${bold || modern ? 'px-4 py-3' : 'py-3'}`}>
              Total
            </th>
          </tr>
        </thead>
        <tbody className={modern ? '' : 'divide-line divide-y'}>
          {items.map((item, index) => (
            <tr
              key={item.id}
              style={modern && index % 2 === 1 ? { backgroundColor: `${theme.hex}0a` } : undefined}
            >
              <td
                className={`py-3.5 pr-4 ${bold || modern ? 'pl-4' : ''} ${bold ? 'font-medium' : ''}`}
              >
                {item.description}
                {/* Narrow enough that the two middle columns had to go, so
                    what they said is written under the line instead. */}
                <span className="text-muted mt-0.5 block tabular-nums @lg:hidden">
                  {item.quantity} × {formatMoney(item.unitPriceCents, currency)}
                </span>
              </td>
              <td className="hidden py-3.5 pl-3 text-right tabular-nums @lg:table-cell">
                {item.quantity}
              </td>
              <td className="hidden py-3.5 pl-3 text-right tabular-nums @lg:table-cell">
                {formatMoney(item.unitPriceCents, currency)}
              </td>
              <td
                className={`py-3.5 pl-3 text-right tabular-nums ${bold || modern ? 'pr-4' : ''} ${
                  bold ? 'font-medium' : ''
                }`}
              >
                {formatMoney(item.quantity * item.unitPriceCents, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* what it comes to */}
      <div className="mt-6 flex justify-end">
        <dl
          className={`w-full max-w-[280px] text-sm ${modern ? 'rounded-lg p-4' : ''}`}
          style={modern ? { backgroundColor: `${theme.hex}0f` } : undefined}
        >
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
          {bold && (
            <div
              className="mt-1.5 flex justify-between border-t-2 pt-3 text-base"
              style={{ borderColor: BOLD_INK }}
            >
              <dt className="font-semibold">Total ({currency})</dt>
              <dd className="font-bold tabular-nums" style={{ color: theme.hex }}>
                {formatMoney(subtotal + (tax ?? 0), currency)}
              </dd>
            </div>
          )}
          <div
            className={`flex justify-between ${
              bold ? 'text-muted pt-2 text-sm' : 'border-line mt-1.5 border-t pt-3 text-base'
            }`}
          >
            <dt className={bold ? '' : 'font-medium'}>Balance due</dt>
            <dd
              className={bold ? 'tabular-nums' : 'font-semibold tabular-nums'}
              style={bold ? undefined : { color: theme.hex }}
            >
              {formatMoney(balance, currency)}
            </dd>
          </div>
        </dl>
      </div>

      {schedule && schedule.length > 0 && (
        <section
          className={
            bold ? 'border-line mt-10 rounded-lg border p-5' : 'border-line mt-10 border-t pt-5'
          }
        >
          <p className="text-muted text-xs tracking-widest uppercase">Payment schedule</p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-muted text-xs tracking-widest uppercase">
                <th className="pb-2 text-left font-medium">Amount</th>
                <th className="pb-2 text-left font-medium">Step</th>
                <th className="hidden pb-2 text-left font-medium @lg:table-cell">Due date</th>
                <th className="pb-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {schedule.map((step, index) => (
                <tr key={`${step.label}-${index}`}>
                  <td className="py-2.5 pr-4 font-medium tabular-nums">
                    {formatMoney(step.amountCents, currency)}
                  </td>
                  <td className="py-2.5 pr-4">
                    {step.label}
                    {/* The date has nowhere of its own to go on a narrow page. */}
                    {step.dueAt && (
                      <span className="text-muted mt-0.5 block @lg:hidden">
                        {formatDate(step.dueAt)}
                      </span>
                    )}
                  </td>
                  <td className="text-muted hidden py-2.5 pr-4 @lg:table-cell">
                    {step.dueAt ? formatDate(step.dueAt) : '—'}
                  </td>
                  <td
                    className="py-2.5 text-right text-xs tracking-widest uppercase"
                    style={step.state === 'PAID' ? { color: theme.hex } : undefined}
                  >
                    <span className={step.state === 'PAID' ? 'font-semibold' : 'text-muted'}>
                      {step.state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {(pay?.length || payNotes || taxNumber) && (
        <section className="border-line mt-10 border-t pt-5">
          <p className="text-muted text-xs tracking-widest uppercase">How to pay</p>
          <dl className="mt-2 grid gap-x-8 gap-y-1 text-sm @lg:grid-cols-2">
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
