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

  const invoice = await prisma.$transaction(async (tx) => {
    return tx.invoice.create({
      data: {
        workspaceId: ctx.workspaceId,
        clientId: client.id,
        projectId: data.projectId ?? null,
        number: await nextInvoiceNumber(tx, ctx.workspaceId),
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
      },
      include: { items: true },
    });
  });

  return NextResponse.json({ invoice }, { status: 201 });
});
