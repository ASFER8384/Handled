import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { EmptyState, PageHeader } from '@/components/ui';
import { dueDateFromNow, findTemplate } from '@/lib/invoice-templates';
import { InvoiceForm } from './invoice-form';

export default async function NewInvoicePage(props: PageProps<'/invoices/new'>) {
  const ctx = await requireWorkspace();
  const params = await props.searchParams;
  const projectId = typeof params.project === 'string' ? params.project : null;
  const start = typeof params.start === 'string' ? params.start : null;

  // Either one of the three that ship with Handled, or one this workspace
  // saved. The link looks the same, so nothing downstream has to care which.
  const saved = start
    ? await prisma.invoiceTemplate.findFirst({ where: { id: start, workspaceId: ctx.workspaceId } })
    : null;
  const template =
    findTemplate(start) ??
    (saved
      ? {
          id: saved.id,
          name: saved.name,
          blurb: '',
          dueInDays: saved.dueInDays,
          notes: saved.notes,
          items: saved.items as { description: string; quantity: number }[],
        }
      : null);

  const clients = await prisma.client.findMany({
    where: { workspaceId: ctx.workspaceId },
    select: {
      id: true,
      name: true,
      email: true,
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
          from={ctx.workspaceName}
          fromEmail={ctx.userEmail}
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
