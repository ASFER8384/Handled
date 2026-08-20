import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { INVOICE_TEMPLATES } from '@/lib/invoice-templates';
import { TemplateGallery, type GalleryTemplate } from './template-gallery';

/**
 * What each kind of file will hold, in the order the work usually happens.
 *
 * The empty ones are listed rather than hidden: knowing what is coming, and
 * that it is not here yet, beats finding out by looking for it.
 */
const COMING = [
  {
    kind: 'Contracts',
    body: 'The terms you send to be signed, with the names and dates filled in from the project.',
  },
  {
    kind: 'Questionnaires',
    body: 'What you ask before a job — the run of the day, who is who, where to be.',
  },
  {
    kind: 'Brochures',
    body: 'What you offer and what it costs, sent as one page rather than an email of prices.',
  },
];

export default async function LibraryPage() {
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
        title="Library"
        subtitle="The files you send again and again, written once and kept here."
      />

      <section>
        <h2 className="text-[15px] font-semibold">Invoices</h2>
        <p className="text-muted mt-1 mb-4 text-sm">
          Lines and terms without the prices. Starting an invoice from one fills it in.
        </p>
        <TemplateGallery templates={templates} />
      </section>

      <section className="mt-10">
        <h2 className="text-[15px] font-semibold">Still to come</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {COMING.map((entry) => (
            <div key={entry.kind} className="border-line rounded-xl border border-dashed p-5">
              <p className="text-muted font-semibold">{entry.kind}</p>
              <p className="text-muted mt-1 text-sm">{entry.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
