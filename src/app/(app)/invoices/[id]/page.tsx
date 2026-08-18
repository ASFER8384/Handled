import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { balanceCents, formatMoney, paidCents, subtotalCents } from '@/lib/money';
import { PageHeader, StatusBadge, formatDate } from '@/components/ui';
import { InvoiceActions } from './invoice-actions';
import { PaymentForm } from './payment-form';

export default async function InvoiceDetailPage({ params }: PageProps<'/invoices/[id]'>) {
  const ctx = await requireWorkspace();
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: {
      client: true,
      project: { select: { id: true, name: true } },
      items: { orderBy: { position: 'asc' } },
      payments: { orderBy: { paidAt: 'desc' } },
    },
  });
  if (!invoice) notFound();

  const total = subtotalCents(invoice.items);
  const paid = paidCents(invoice.payments);
  const balance = balanceCents(invoice.items, invoice.payments);

  return (
    <>
      <PageHeader
        title={invoice.number}
        subtitle={`${invoice.client.name}${invoice.project ? ` · ${invoice.project.name}` : ''}`}
        action={<InvoiceActions id={invoice.id} status={invoice.status} hasPayments={paid > 0} />}
      />

      <Link href="/invoices" className="text-muted text-sm hover:underline">
        ← All invoices
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <div className="card overflow-hidden">
            <div className="border-line flex flex-wrap items-center gap-x-8 gap-y-2 border-b px-5 py-4 text-sm">
              <span>
                <StatusBadge status={invoice.status} />
              </span>
              <span className="text-muted">Issued {formatDate(invoice.issuedAt)}</span>
              <span className="text-muted">Due {formatDate(invoice.dueAt)}</span>
            </div>

            <table className="w-full text-sm">
              <thead className="text-muted border-line border-b text-left">
                <tr>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 text-right font-medium">Qty</th>
                  <th className="px-5 py-3 text-right font-medium">Unit</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">{item.description}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{item.quantity}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {formatMoney(item.unitPriceCents, ctx.currency)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {formatMoney(item.quantity * item.unitPriceCents, ctx.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-line border-t">
                <tr>
                  <td colSpan={3} className="text-muted px-5 py-2 text-right">
                    Total
                  </td>
                  <td className="px-5 py-2 text-right font-medium tabular-nums">
                    {formatMoney(total, ctx.currency)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-muted px-5 py-2 text-right">
                    Paid
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {formatMoney(paid, ctx.currency)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right font-medium">
                    Balance
                  </td>
                  <td className="px-5 py-2 text-right font-semibold tabular-nums">
                    {formatMoney(balance, ctx.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {invoice.notes && (
            <div className="card p-5">
              <h2 className="font-medium">Notes</h2>
              <p className="text-muted mt-2 text-sm whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          <div className="card p-5">
            <h2 className="font-medium">Payments</h2>
            {invoice.payments.length === 0 ? (
              <p className="text-muted mt-2 text-sm">Nothing recorded yet.</p>
            ) : (
              <ul className="divide-line mt-3 divide-y text-sm">
                {invoice.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between py-2">
                    <span className="text-muted">
                      {formatDate(payment.paidAt)} · {payment.method.replace('_', ' ').toLowerCase()}
                      {payment.reference ? ` · ${payment.reference}` : ''}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(payment.amountCents, ctx.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside>
          <div className="card p-5">
            <h2 className="font-medium">Record a payment</h2>
            {invoice.status === 'DRAFT' && (
              <p className="text-muted mt-2 text-sm">Send the invoice first.</p>
            )}
            {invoice.status === 'VOID' && (
              <p className="text-muted mt-2 text-sm">This invoice is void.</p>
            )}
            {balance <= 0 && invoice.status !== 'DRAFT' && invoice.status !== 'VOID' && (
              <p className="text-muted mt-2 text-sm">Settled in full.</p>
            )}
            {invoice.status !== 'DRAFT' && invoice.status !== 'VOID' && balance > 0 && (
              <PaymentForm invoiceId={invoice.id} outstanding={balance} currency={ctx.currency} />
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
