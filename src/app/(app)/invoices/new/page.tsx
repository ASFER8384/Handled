import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { EmptyState, PageHeader } from '@/components/ui';
import { InvoiceForm } from './invoice-form';

export default async function NewInvoicePage() {
  const ctx = await requireWorkspace();

  const clients = await prisma.client.findMany({
    where: { workspaceId: ctx.workspaceId },
    select: {
      id: true,
      name: true,
      projects: { select: { id: true, name: true }, orderBy: { updatedAt: 'desc' } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <>
      <PageHeader title="New invoice" subtitle="It starts as a draft — nothing is sent yet." />
      {clients.length === 0 ? (
        <EmptyState title="Add a client first" body="An invoice has to be addressed to someone." />
      ) : (
        <InvoiceForm clients={clients} currency={ctx.currency} />
      )}
    </>
  );
}
