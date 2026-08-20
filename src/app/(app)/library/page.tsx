import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { INVOICE_TEMPLATES } from '@/lib/invoice-templates';
import { companyBrand } from '@/lib/company';
import { TemplateGallery, type GalleryTemplate } from './template-gallery';

export default async function LibraryPage() {
  const ctx = await requireWorkspace();

  const brand = await companyBrand(ctx.workspaceId, ctx.userEmail);

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
        title="Library"
        subtitle="The files you send again and again, written once and kept here."
      />

      <section>
        <h2 className="text-[15px] font-semibold">Invoices</h2>
        <p className="text-muted mt-1 mb-4 text-sm">
          Lines and terms without the prices. Starting an invoice from one fills it in.
        </p>
        <TemplateGallery
          templates={templates}
          brand={{
            name: brand.name,
            contact: brand.contact,
            address: brand.address,
            logo: brand.logo,
            themeColor: brand.themeColor,
            themeFont: brand.themeFont,
            taxLabel: brand.taxLabel,
            taxRateBp: brand.taxRateBp,
            currency: ctx.currency,
          }}
        />
      </section>
    </>
  );
}
