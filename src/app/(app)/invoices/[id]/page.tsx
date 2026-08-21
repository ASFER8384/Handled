import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { balanceCents, paidCents, subtotalCents, taxCents } from '@/lib/money';
import { PageHeader, StatusBadge, formatDate } from '@/components/ui';
import { InvoiceActions } from './invoice-actions';
import { SaveAsTemplate } from './save-as-template';
import { InvoiceSheet } from '@/components/invoice-sheet';
import { companyBrand } from '@/lib/company';
import { shows } from '@/lib/invoice-parts';
import { scheduleRows } from '@/lib/invoice-schedule';
import { daysLate, isOverdue } from '@/lib/invoices';
import { PrintButton } from './print-button';
import { PaymentForm } from './payment-form';
import { PaymentList } from './payment-list';

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
      instalments: { orderBy: { position: 'asc' } },
    },
  });
  if (!invoice) notFound();

  const brand = await companyBrand(ctx.workspaceId, ctx.userEmail);

  const subtotal = subtotalCents(invoice.items);
  const tax = taxCents(invoice.items, invoice.taxRateBp);
  const paid = paidCents(invoice.payments);
  const balance = balanceCents(invoice.items, invoice.payments, invoice.taxRateBp);
  const late = isOverdue(invoice, balance);

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
            <StatusBadge status={invoice.status} overdue={late} />
            <span className="text-muted">Issued {formatDate(invoice.issuedAt)}</span>
            {late && invoice.dueAt ? (
              <span className="font-medium text-red-700">
                {daysLate(invoice.dueAt)} {daysLate(invoice.dueAt) === 1 ? 'day' : 'days'} late
              </span>
            ) : (
              <span className="text-muted">Due {formatDate(invoice.dueAt)}</span>
            )}
          </div>

          <InvoiceSheet
            number={invoice.number}
            from={brand.name || ctx.workspaceName}
            fromEmail={shows(invoice.hidden, 'contact') ? brand.contact : ''}
            fromAddress={shows(invoice.hidden, 'address') ? brand.address : null}
            logo={shows(invoice.hidden, 'logo') ? brand.logo : null}
            billTo={{
              name: invoice.client.name,
              company: invoice.client.company,
              address: invoice.client.address,
              email: invoice.client.email,
            }}
            issuedAt={invoice.issuedAt}
            dueAt={invoice.dueAt}
            items={invoice.items}
            subtotal={subtotal}
            tax={tax}
            taxLabel={invoice.taxLabel ?? brand.taxLabel}
            taxRateBp={invoice.taxRateBp}
            taxNumber={shows(invoice.hidden, 'taxNumber') ? brand.taxNumber : null}
            pay={shows(invoice.hidden, 'pay') ? brand.pay : []}
            payNotes={shows(invoice.hidden, 'pay') ? brand.payNotes : null}
            paid={paid}
            balance={balance}
            currency={ctx.currency}
            notes={shows(invoice.hidden, 'notes') ? invoice.notes : null}
            schedule={scheduleRows(invoice.instalments, paid)}
            design={invoice.design}
            themeColor={invoice.themeColor}
            themeFont={invoice.themeFont}
          />

          <div className="card p-5" data-print-hide>
            <h2 className="font-medium">Payments</h2>
            <PaymentList
              invoiceId={invoice.id}
              currency={ctx.currency}
              locked={invoice.status === 'VOID'}
              payments={invoice.payments.map((payment) => ({
                id: payment.id,
                amountCents: payment.amountCents,
                method: payment.method,
                reference: payment.reference,
                paidAt: payment.paidAt.toISOString(),
              }))}
            />
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
              <PaymentForm
                invoiceId={invoice.id}
                outstanding={balance}
                currency={ctx.currency}
                schedule={scheduleRows(invoice.instalments, paid).map((step) => ({
                  label: step.label,
                  amountCents: step.amountCents,
                  paidCents: step.paidCents,
                  dueAt: step.dueAt ? step.dueAt.toISOString() : null,
                  state: step.state,
                }))}
              />
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
