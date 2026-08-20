import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { balanceCents, formatMoney, paidCents, subtotalCents } from '@/lib/money';
import { PageHeader, StatusBadge, formatDate } from '@/components/ui';
import { InvoiceActions } from './invoice-actions';
import { SaveAsTemplate } from './save-as-template';
import { InvoiceSheet } from '@/components/invoice-sheet';
import { companyBrand } from '@/lib/company';
import { PrintButton } from './print-button';
import { PaymentForm } from './payment-form';

export default async function InvoiceDetailPage({ params }: PageProps<'/invoices/[id]'>) {
  const ctx = await requireWorkspace();
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: {
      client: true,
      project: { select: { id: true, name: true } },
      items: { orderBy: { position: 'asc' } },
      payments: { orderBy: { paidAt: 'desc' } },
    },
  });
  if (!invoice) notFound();

  const brand = await companyBrand(ctx.workspaceId, ctx.userEmail);

  const total = subtotalCents(invoice.items);
  const paid = paidCents(invoice.payments);
  const balance = balanceCents(invoice.items, invoice.payments);

  return (
    <>
      <PageHeader
        title={invoice.number}
        subtitle={`${invoice.client.name}${invoice.project ? ` · ${invoice.project.name}` : ''}`}
        action={
          <div className="flex flex-wrap items-start justify-end gap-2">
            {invoice.status === 'DRAFT' && (
              <Link href={`/invoices/${invoice.id}/edit`} className="btn-ghost">
                Edit
              </Link>
            )}
            <PrintButton />
            <SaveAsTemplate
              suggestedName={invoice.project?.name ?? invoice.client.name}
              notes={invoice.notes ?? ''}
              items={invoice.items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
              }))}
            />
            <InvoiceActions id={invoice.id} status={invoice.status} hasPayments={paid > 0} />
          </div>
        }
      />

      <Link href="/invoices" className="text-muted text-sm hover:underline" data-print-hide>
        ← All invoices
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <div
            className="border-line flex flex-wrap items-center gap-x-8 gap-y-2 text-sm"
            data-print-hide
          >
            <StatusBadge status={invoice.status} />
            <span className="text-muted">Issued {formatDate(invoice.issuedAt)}</span>
            <span className="text-muted">Due {formatDate(invoice.dueAt)}</span>
          </div>

          <InvoiceSheet
            number={invoice.number}
            from={brand.name || ctx.workspaceName}
            fromEmail={brand.contact}
            fromAddress={brand.address}
            billTo={{
              name: invoice.client.name,
              company: invoice.client.company,
              address: invoice.client.address,
              email: invoice.client.email,
            }}
            issuedAt={invoice.issuedAt}
            dueAt={invoice.dueAt}
            items={invoice.items}
            subtotal={total}
            paid={paid}
            balance={balance}
            currency={ctx.currency}
            notes={invoice.notes}
            themeColor={invoice.themeColor}
            themeFont={invoice.themeFont}
          />

          <div className="card p-5" data-print-hide>
            <h2 className="font-medium">Payments</h2>
            {invoice.payments.length === 0 ? (
              <p className="text-muted mt-2 text-sm">Nothing recorded yet.</p>
            ) : (
              <ul className="divide-line mt-3 divide-y text-sm">
                {invoice.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between py-2">
                    <span className="text-muted">
                      {formatDate(payment.paidAt)} ·{' '}
                      {payment.method.replace('_', ' ').toLowerCase()}
                      {payment.reference ? ` · ${payment.reference}` : ''}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(payment.amountCents, ctx.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside>
          <div className="card p-5">
            <h2 className="font-medium">Record a payment</h2>
            {invoice.status === 'DRAFT' && (
              <p className="text-muted mt-2 text-sm">Send the invoice first.</p>
            )}
            {invoice.status === 'VOID' && (
              <p className="text-muted mt-2 text-sm">This invoice is void.</p>
            )}
            {balance <= 0 && invoice.status !== 'DRAFT' && invoice.status !== 'VOID' && (
              <p className="text-muted mt-2 text-sm">Settled in full.</p>
            )}
            {invoice.status !== 'DRAFT' && invoice.status !== 'VOID' && balance > 0 && (
              <PaymentForm invoiceId={invoice.id} outstanding={balance} currency={ctx.currency} />
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
