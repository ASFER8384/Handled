import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody, refuseDuplicateEmail } from '@/lib/api';
import { clientSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, clientSchema);
  await refuseDuplicateEmail(ctx.workspaceId, data.email, id);

  // Scope the update by workspace so an id from another tenant simply misses.
  const { count } = await prisma.client.updateMany({
    where: { id, workspaceId: ctx.workspaceId },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone ?? null,
      company: data.company ?? null,
      notes: data.notes ?? null,
    },
  });
  if (count === 0) notFound('Client');

  const client = await prisma.client.findUnique({ where: { id } });
  return NextResponse.json({ client });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  const { count } = await prisma.client.deleteMany({
    where: { id, workspaceId: ctx.workspaceId },
  });
  if (count === 0) notFound('Client');
  return NextResponse.json({ ok: true });
});
