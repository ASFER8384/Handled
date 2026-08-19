import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, parseBody } from '@/lib/api';
import { customFieldSchema } from '@/lib/validation';

export const GET = handler(async (ctx) => {
  const fields = await prisma.customField.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { position: 'asc' },
  });
  return NextResponse.json({ fields });
});

export const POST = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, customFieldSchema);

  const last = await prisma.customField.findFirst({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const field = await prisma.customField.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: data.name,
      type: data.type,
      options: data.type === 'SELECT' ? data.options : [],
      visibleToClient: data.visibleToClient,
      position: (last?.position ?? -1) + 1,
    },
  });
  return NextResponse.json({ field }, { status: 201 });
});
