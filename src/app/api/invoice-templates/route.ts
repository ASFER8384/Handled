import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, parseBody } from '@/lib/api';
import { invoiceTemplateSchema } from '@/lib/validation';

export const GET = handler(async (ctx) => {
  const templates = await prisma.invoiceTemplate.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ templates });
});

export const POST = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, invoiceTemplateSchema);

  const template = await prisma.invoiceTemplate.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: data.name,
      notes: data.notes,
      dueInDays: data.dueInDays,
      items: data.items,
    },
  });
  return NextResponse.json({ template }, { status: 201 });
});
