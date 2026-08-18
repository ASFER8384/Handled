import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { taskToggleSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const { done } = await parseBody(request, taskToggleSchema);
  const { count } = await prisma.task.updateMany({
    where: { id, workspaceId: ctx.workspaceId },
    data: { done },
  });
  if (count === 0) notFound('Task');
  return NextResponse.json({ ok: true, done });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  const { count } = await prisma.task.deleteMany({
    where: { id, workspaceId: ctx.workspaceId },
  });
  if (count === 0) notFound('Task');
  return NextResponse.json({ ok: true });
});
