import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, notFound } from '@/lib/api';
import { resyncInvoiceStatus } from '@/lib/invoices';

type Params = { params: Promise<{ id: string; paymentId: string }> };

/**
 * A payment recorded by mistake, taken back off.
 *
 * Typing 6,000 where 600 was meant is a keystroke, and until now the only way
 * back was the database. Removing one is not a refund — no money moves — it is
 * correcting the record of what came in, so the invoice's status is worked out
 * again afterwards and can fall back from paid to partly paid.
 *
 * A void invoice is left alone: it is closed, and its history with it.
 */
export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id, paymentId } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true, status: true },
  });
  if (!invoice) notFound('Invoice');
  if (invoice.status === 'VOID') throw new HttpError(409, 'This invoice is void');

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, invoiceId: id },
    select: { id: true },
  });
  if (!payment) notFound('Payment');

  const status = await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: payment.id } });
    return resyncInvoiceStatus(tx, id);
  });

  return NextResponse.json({ status });
});
