import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, parseBody } from '@/lib/api';
import { invoiceSchema } from '@/lib/validation';
import { nextInvoiceNumber } from '@/lib/invoices';

export const GET = handler(async (ctx) => {
  const invoices = await prisma.invoice.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: { client: { select: { id: true, name: true } }, items: true, payments: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ invoices });
});

export const POST = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, invoiceSchema);

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

  // Numbering is the workspace's, not the client's: whoever it is for, this
  // is the fourth invoice you have written. Some businesses number per client
  // or per year instead, so the number can be typed over — it only has to be
  // one you have not used before.
  const chosen = data.number?.trim();
  if (chosen) {
    const clash = await prisma.invoice.findFirst({
      where: { workspaceId: ctx.workspaceId, number: chosen },
      select: { id: true },
    });
    if (clash) throw new HttpError(422, `Invoice ${chosen} already exists`);
  }

  const invoice = await prisma.$transaction(async (tx) => {
    return tx.invoice.create({
      data: {
        workspaceId: ctx.workspaceId,
        clientId: client.id,
        projectId: data.projectId ?? null,
        number: chosen || (await nextInvoiceNumber(tx, ctx.workspaceId)),
        design: data.design ?? 'classic',
        themeColor: data.themeColor ?? 'ink',
        themeFont: data.themeFont ?? 'sans',
        taxRateBp: data.taxRateBp ?? 0,
        taxLabel: data.taxLabel ?? null,
        hidden: data.hidden,
        dueAt: data.dueAt ?? null,
        notes: data.notes ?? null,
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
      include: { items: true, instalments: true },
    });
  });

  return NextResponse.json({ invoice }, { status: 201 });
});
