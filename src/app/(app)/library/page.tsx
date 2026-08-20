import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
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
      kind: 'Invoice',
      industries: ['Any business'],
      items: template.items as { description: string; quantity: number }[],
      mine: true,
    })),
  ];

  return (
    <>
      {/* Stays put while the gallery scrolls under it, so you always know
          which page you are on. Its heading sits in the same column as the
          cards, so the word starts where the first invoice starts. */}
      <div className="bg-background sticky top-14 z-20 -mx-8 -mt-8 px-8 py-5">
        <div className="mx-auto w-full max-w-[1060px]">
          <h1 className="font-display text-3xl font-bold tracking-tight">Library</h1>
        </div>
      </div>

      <section className="mx-auto mt-6 w-full max-w-[1060px]">
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
