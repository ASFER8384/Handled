import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { projectPatchSchema } from '@/lib/validation';
import { fireTrigger } from '@/lib/automations';

type Params = { params: Promise<{ id: string }> };

/** Stage moves from the pipeline board, and re-assignment to another contact. */
export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const { stageId, clientId, type } = await parseBody(request, projectPatchSchema);

  // Scoped to the workspace so a foreign client id cannot be smuggled in.
  if (clientId) {
    const client = await prisma.client.count({ where: { id: clientId, workspaceId: ctx.workspaceId } });
    if (client === 0) notFound('Client');
  }

  if (stageId) {
    const stage = await prisma.pipelineStage.count({
      where: { id: stageId, workspaceId: ctx.workspaceId },
    });
    if (stage === 0) notFound('Stage');
  }

  const { count } = await prisma.project.updateMany({
    where: { id, workspaceId: ctx.workspaceId },
    data: {
      ...(stageId ? { stageId } : {}),
      ...(clientId ? { clientId } : {}),
      ...(type === undefined ? {} : { type: type || null }),
    },
  });
  if (count === 0) notFound('Project');

  if (stageId) {
    await fireTrigger('PROJECT_STAGE_CHANGED', {
      workspaceId: ctx.workspaceId,
      projectId: id,
      stageId,
    });
  }

  return NextResponse.json({ ok: true, stageId });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  const { count } = await prisma.project.deleteMany({
    where: { id, workspaceId: ctx.workspaceId },
  });
  if (count === 0) notFound('Project');
  return NextResponse.json({ ok: true });
});
