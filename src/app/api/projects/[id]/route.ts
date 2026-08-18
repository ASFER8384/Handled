import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { projectStageSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

/** Stage moves are the one edit the pipeline board makes, so they get their own verb. */
export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const { stage } = await parseBody(request, projectStageSchema);

  const { count } = await prisma.project.updateMany({
    where: { id, workspaceId: ctx.workspaceId },
    data: { stage },
  });
  if (count === 0) notFound('Project');

  return NextResponse.json({ ok: true, stage });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  const { count } = await prisma.project.deleteMany({
    where: { id, workspaceId: ctx.workspaceId },
  });
  if (count === 0) notFound('Project');
  return NextResponse.json({ ok: true });
});
