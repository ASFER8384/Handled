import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { balanceCents, formatMoney, subtotalCents } from '@/lib/money';
import { EmptyState, PageHeader, StatusBadge, formatDate } from '@/components/ui';

export default async function InvoicesPage() {
  const ctx = await requireWorkspace();
  const invoices = await prisma.invoice.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: { client: { select: { name: true } }, items: true, payments: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Raise it, send it, record what lands."
        action={
          <Link href="/invoices/new" className="btn-primary">
            New invoice
          </Link>
        }
      />

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          body="Draft one against a client, send it, then record payments as they arrive."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="text-muted border-line border-b text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 text-right font-medium">Balance</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-5 py-3">
                    <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{invoice.client.name}</td>
                  <td className="text-muted px-5 py-3">{formatDate(invoice.dueAt)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatMoney(subtotalCents(invoice.items), ctx.currency)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {invoice.status === 'VOID'
                      ? '—'
                      : formatMoney(balanceCents(invoice.items, invoice.payments), ctx.currency)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={invoice.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
