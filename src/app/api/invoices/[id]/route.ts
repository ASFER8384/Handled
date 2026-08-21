import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, notFound, parseBody } from '@/lib/api';
import { invoiceEditSchema, invoiceStatusSchema } from '@/lib/validation';
import { resyncInvoiceStatus } from '@/lib/invoices';
import { fireTrigger } from '@/lib/automations';

type Params = { params: Promise<{ id: string }> };

/**
 * A whole invoice, rewritten. The lines are replaced rather than reconciled:
 * an invoice is one document, and half-updating it is how the paper and the
 * total stop agreeing.
 *
 * A sent invoice is not editable here. What the client has is what they have.
 */
export const PUT = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, invoiceEditSchema);

  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true, status: true, number: true },
  });
  if (!invoice) notFound('Invoice');
  if (invoice.status !== 'DRAFT') {
    throw new HttpError(409, 'This invoice has been sent. Void it and write another.');
  }

  const client = await prisma.client.findFirst({
    where: { id: data.clientId, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!client) throw new HttpError(422, 'That client is not in this workspace');

  if (data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, workspaceId: ctx.workspaceId, clientId: client.id },
      select: { id: true },
    });
    if (!project) throw new HttpError(422, "That project doesn't belong to this client");
  }

  // Renumbering a draft is allowed; landing on a number already in use is
  // not, or two invoices would answer to the same name.
  const chosen = data.number?.trim();
  if (chosen && chosen !== invoice.number) {
    const clash = await prisma.invoice.findFirst({
      where: { workspaceId: ctx.workspaceId, number: chosen, id: { not: id } },
      select: { id: true },
    });
    if (clash) throw new HttpError(422, `Invoice ${chosen} already exists`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    // The schedule is rewritten with the lines: it is part of the same
    // document, and half of an old one left behind would not add up.
    await tx.invoiceInstalment.deleteMany({ where: { invoiceId: id } });
    await tx.invoice.update({
      where: { id },
      data: {
        number: chosen || invoice.number,
        clientId: client.id,
        projectId: data.projectId ?? null,
        dueAt: data.dueAt ?? null,
        notes: data.notes ?? null,
        design: data.design ?? 'classic',
        themeColor: data.themeColor ?? 'ink',
        themeFont: data.themeFont ?? 'sans',
        taxRateBp: data.taxRateBp ?? 0,
        taxLabel: data.taxLabel ?? null,
        hidden: data.hidden,
        items: {
          create: data.items.map((item, position) => ({
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            position,
          })),
        },
        instalments: {
          create: data.schedule.map((step, position) => ({
            label: step.label,
            amountCents: step.amountCents,
            dueAt: step.dueAt ?? null,
            position,
          })),
        },
      },
    });
  });

  return NextResponse.json({ invoice: { id } });
});

export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const { status } = await parseBody(request, invoiceStatusSchema);

  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: {
      payments: true,
      // Anything that actually left, or is on its way. A draft message was
      // written but never handed to anybody.
      messages: { where: { status: { not: 'DRAFT' } }, select: { id: true } },
    },
  });
  if (!invoice) notFound('Invoice');

  if (status === 'VOID' && invoice.payments.length > 0) {
    throw new HttpError(409, 'Refund the recorded payments before voiding this invoice');
  }

  // Marking an invoice sent by hand is a click, and a click can be a mistake.
  // Taking it back is allowed right up until it stops being only ours: once
  // it has been emailed, or once money has been recorded against it, the
  // client's copy is out there and the record has to match it.
  if (status === 'DRAFT') {
    if (invoice.payments.length > 0) {
      throw new HttpError(409, 'A payment has been recorded against this invoice');
    }
    if (invoice.messages.length > 0) {
      throw new HttpError(409, 'This invoice has been emailed to the client');
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id },
      data: {
        status,
        // Sending is what dates an invoice; re-sending keeps the original
        // date, and taking it back to a draft means it was never issued.
        issuedAt:
          status === 'SENT'
            ? (invoice.issuedAt ?? new Date())
            : status === 'DRAFT'
              ? null
              : invoice.issuedAt,
      },
    });
    const settled = await resyncInvoiceStatus(tx, id);
    return settled;
  });

  if (status === 'SENT') {
    await fireTrigger('INVOICE_SENT', {
      workspaceId: ctx.workspaceId,
      projectId: invoice.projectId,
      clientId: invoice.clientId,
    });
  }

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
