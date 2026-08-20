import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { EmptyState } from '@/components/ui';
import { dueDateFromNow, findTemplate } from '@/lib/invoice-templates';
import { companyBrand } from '@/lib/company';
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

  const brand = await companyBrand(ctx.workspaceId, ctx.userEmail);

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
      {clients.length === 0 ? (
        <EmptyState title="Add a client first" body="An invoice has to be addressed to someone." />
      ) : (
        <InvoiceForm
          title={template ? `New invoice · ${template.name}` : 'New invoice'}
          subtitle={
            template
              ? 'The lines are filled in. Put your prices against them.'
              : 'It starts as a draft. Nothing is sent yet.'
          }
          clients={clients}
          currency={ctx.currency}
          from={brand.name || ctx.workspaceName}
          fromEmail={brand.contact}
          fromAddress={brand.address}
          logo={brand.logo}
          tax={{
            rateBp: brand.taxRateBp,
            label: brand.taxLabel,
            number: brand.taxNumber,
            pay: brand.pay,
            payNotes: brand.payNotes,
          }}
          start={{
            clientId: owner?.id ?? null,
            projectId: owner ? projectId : null,
            dueAt: template ? dueDateFromNow(template.dueInDays) : '',
            notes: template?.notes ?? '',
            items: template?.items ?? null,
            themeColor: brand.themeColor,
            themeFont: brand.themeFont,
          }}
        />
      )}
    </>
  );
}
