import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, notFound, parseBody } from '@/lib/api';
import { paymentSchema } from '@/lib/validation';
import { resyncInvoiceStatus } from '@/lib/invoices';
import { balanceCents } from '@/lib/money';

type Params = { params: Promise<{ id: string }> };

export const POST = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, paymentSchema);

  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: { items: true, payments: true },
  });
  if (!invoice) notFound('Invoice');
  if (invoice.status === 'VOID') throw new HttpError(409, 'This invoice is void');
  if (invoice.status === 'DRAFT') throw new HttpError(409, 'Send the invoice before recording payment');

  const outstanding = balanceCents(invoice.items, invoice.payments);
  if (data.amountCents > outstanding) {
    throw new HttpError(422, 'That is more than the outstanding balance');
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoiceId: id,
        amountCents: data.amountCents,
        method: data.method,
        reference: data.reference ?? null,
        paidAt: data.paidAt ?? new Date(),
      },
    });
    const status = await resyncInvoiceStatus(tx, id);
    return { payment, status };
  });

  return NextResponse.json(result, { status: 201 });
});
