import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { companyBrand } from '@/lib/company';
import { InvoiceForm } from '../../new/invoice-form';

/**
 * The invoice, opened again on the same page it was written on.
 *
 * Only while it is a draft. Once it has been sent, what the client has is what
 * they have, and quietly rewriting it underneath them is how two people end up
 * holding different invoices with the same number.
 */
export default async function EditInvoicePage({ params }: PageProps<'/invoices/[id]/edit'>) {
  const ctx = await requireWorkspace();
  const { id } = await params;

  const [invoice, clients] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, workspaceId: ctx.workspaceId },
      include: { items: { orderBy: { position: 'asc' } } },
    }),
    prisma.client.findMany({
      where: { workspaceId: ctx.workspaceId },
      select: {
        id: true,
        name: true,
        email: true,
        projects: { select: { id: true, name: true }, orderBy: { updatedAt: 'desc' } },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!invoice) notFound();
  if (invoice.status !== 'DRAFT') redirect(`/invoices/${id}`);

  const brand = await companyBrand(ctx.workspaceId, ctx.userEmail);

  return (
    <>
      <Link href={`/invoices/${id}`} className="text-muted text-sm hover:underline">
        ← Back to the invoice
      </Link>

      <div className="mt-6">
        <InvoiceForm
          title={`Editing ${invoice.number}`}
          subtitle="Still a draft. Nothing has been sent."
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
          invoiceId={invoice.id}
          number={invoice.number}
          start={{
            clientId: invoice.clientId,
            projectId: invoice.projectId,
            dueAt: invoice.dueAt ? invoice.dueAt.toLocaleDateString('en-CA') : '',
            notes: invoice.notes ?? '',
            hidden: invoice.hidden,
            themeColor: invoice.themeColor,
            themeFont: invoice.themeFont,
            items: invoice.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: (item.unitPriceCents / 100).toFixed(2),
            })),
          }}
        />
      </div>
    </>
  );
}
