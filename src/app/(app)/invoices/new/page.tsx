import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { EmptyState, PageHeader } from '@/components/ui';
import { dueDateFromNow, findTemplate } from '@/lib/invoice-templates';
import { InvoiceForm } from './invoice-form';

export default async function NewInvoicePage(props: PageProps<'/invoices/new'>) {
  const ctx = await requireWorkspace();
  const params = await props.searchParams;
  const projectId = typeof params.project === 'string' ? params.project : null;
  const template = findTemplate(typeof params.start === 'string' ? params.start : null);

  const clients = await prisma.client.findMany({
    where: { workspaceId: ctx.workspaceId },
    select: {
      id: true,
      name: true,
      projects: { select: { id: true, name: true }, orderBy: { updatedAt: 'desc' } },
    },
    orderBy: { name: 'asc' },
  });

  // Coming from a project, the client is not a question: it is whoever the
  // work is for. Asked again, it is a chance to answer it wrongly.
  const owner = projectId
    ? clients.find((client) => client.projects.some((project) => project.id === projectId))
    : null;

  return (
    <>
      <PageHeader
        title={template ? `New invoice · ${template.name}` : 'New invoice'}
        subtitle={
          template
            ? 'The lines are filled in. Put your prices against them.'
            : 'It starts as a draft. Nothing is sent yet.'
        }
      />
      {clients.length === 0 ? (
        <EmptyState title="Add a client first" body="An invoice has to be addressed to someone." />
      ) : (
        <InvoiceForm
          clients={clients}
          currency={ctx.currency}
          start={{
            clientId: owner?.id ?? null,
            projectId: owner ? projectId : null,
            dueAt: template ? dueDateFromNow(template.dueInDays) : '',
            notes: template?.notes ?? '',
            items: template?.items ?? null,
          }}
        />
      )}
    </>
  );
}
