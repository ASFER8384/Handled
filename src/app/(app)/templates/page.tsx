import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { INVOICE_TEMPLATES } from '@/lib/invoice-templates';
import { TemplateGallery, type GalleryTemplate } from './template-gallery';

export default async function TemplatesPage() {
  const ctx = await requireWorkspace();

  const saved = await prisma.invoiceTemplate.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { name: 'asc' },
  });

  // The three that ship with Handled first, then anything this workspace has
  // written for itself. Only the second kind can be thrown away.
  const templates: GalleryTemplate[] = [
    ...INVOICE_TEMPLATES.map((template) => ({ ...template, mine: false })),
    ...saved.map((template) => ({
      id: template.id,
      name: template.name,
      blurb: 'Saved from one of your invoices.',
      dueInDays: template.dueInDays,
      notes: template.notes,
      items: template.items as { description: string; quantity: number }[],
      mine: true,
    })),
  ];

  return (
    <>
      <PageHeader
        title="Templates"
        subtitle="An invoice worth writing once. Its lines and its terms, without the prices."
      />
      <TemplateGallery templates={templates} />
    </>
  );
}
