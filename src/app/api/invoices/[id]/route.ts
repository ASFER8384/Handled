import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, notFound, parseBody } from '@/lib/api';
import { invoiceStatusSchema } from '@/lib/validation';
import { resyncInvoiceStatus } from '@/lib/invoices';

type Params = { params: Promise<{ id: string }> };

export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const { status } = await parseBody(request, invoiceStatusSchema);

  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: { payments: true },
  });
  if (!invoice) notFound('Invoice');

  if (status === 'VOID' && invoice.payments.length > 0) {
    throw new HttpError(409, 'Refund the recorded payments before voiding this invoice');
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id },
      data: {
        status,
        // Sending is what dates an invoice; re-sending keeps the original date.
        issuedAt: status === 'SENT' ? (invoice.issuedAt ?? new Date()) : invoice.issuedAt,
      },
    });
    const settled = await resyncInvoiceStatus(tx, id);
    return settled;
  });

  return NextResponse.json({ ok: true, status: updated });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: { payments: true },
  });
  if (!invoice) notFound('Invoice');
  if (invoice.payments.length > 0) {
    throw new HttpError(409, 'Invoices with recorded payments cannot be deleted — void them');
  }

  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
