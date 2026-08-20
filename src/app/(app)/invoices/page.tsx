import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { balanceCents, totalCents } from '@/lib/money';
import { EmptyState, PageHeader } from '@/components/ui';
import { InvoicesTable, type InvoiceRow } from './invoices-table';

export default async function InvoicesPage() {
  const ctx = await requireWorkspace();
  const invoices = await prisma.invoice.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: {
      client: { select: { name: true, email: true } },
      project: { select: { name: true } },
      items: true,
      payments: true,
      messages: { where: { status: { not: 'DRAFT' } }, select: { id: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const rows: InvoiceRow[] = invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    client: invoice.client.name,
    project: invoice.project?.name ?? null,
    projectId: invoice.projectId,
    clientEmail: invoice.client.email,
    updatedAt: invoice.updatedAt.toISOString(),
    dueAt: invoice.dueAt ? invoice.dueAt.toISOString() : null,
    totalCents: totalCents(invoice.items, invoice.taxRateBp),
    balanceCents: balanceCents(invoice.items, invoice.payments, invoice.taxRateBp),
    hasPayments: invoice.payments.length > 0,
    emailed: invoice.messages.length > 0,
  }));

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

      {rows.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          body="Draft one against a client, send it, then record payments as they arrive."
        />
      ) : (
        <InvoicesTable rows={rows} currency={ctx.currency} />
      )}
    </>
  );
}
