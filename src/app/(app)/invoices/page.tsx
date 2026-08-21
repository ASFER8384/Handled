import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { balanceCents, paidCents, totalCents } from '@/lib/money';
import { scheduleRows } from '@/lib/invoice-schedule';
import { EmptyState, PageHeader } from '@/components/ui';
import { CreateFileButton } from '../projects/[id]/create-file-button';
import { InvoicesTable, type InvoiceRow } from './invoices-table';

export default async function InvoicesPage() {
  const ctx = await requireWorkspace();
  const invoices = await prisma.invoice.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: {
      client: {
        select: {
          name: true,
          email: true,
          // Offered in the list, so an invoice with no project can be filed
          // without opening it.
          projects: { select: { id: true, name: true }, orderBy: { updatedAt: 'desc' } },
        },
      },
      project: { select: { name: true } },
      items: true,
      payments: true,
      instalments: { orderBy: { position: 'asc' } },
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
    clientProjects: invoice.client.projects,
    updatedAt: invoice.updatedAt.toISOString(),
    dueAt: invoice.dueAt ? invoice.dueAt.toISOString() : null,
    totalCents: totalCents(invoice.items, invoice.taxRateBp),
    balanceCents: balanceCents(invoice.items, invoice.payments, invoice.taxRateBp),
    hasPayments: invoice.payments.length > 0,
    emailed: invoice.messages.length > 0,
    issuedAt: invoice.issuedAt ? invoice.issuedAt.toISOString() : null,
    payments: invoice.payments.length,
    // The schedule as the list needs it: how many steps are behind you, and
    // when the next one is wanted.
    schedule: (() => {
      const steps = scheduleRows(invoice.instalments, paidCents(invoice.payments));
      if (steps.length === 0) return null;
      const next = steps.find((step) => step.state !== 'PAID') ?? null;
      return {
        done: steps.filter((step) => step.state === 'PAID').length,
        total: steps.length,
        nextAt: next?.dueAt ? next.dueAt.toISOString() : null,
        nextLabel: next?.label ?? null,
      };
    })(),
  }));

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Raise it, send it, record what lands."
        action={<CreateFileButton label="New invoice" className="btn-primary" />}
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
