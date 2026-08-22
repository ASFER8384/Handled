import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { projectPatchSchema } from '@/lib/validation';
import { fireTrigger } from '@/lib/automations';
import { readWhen } from '@/lib/when';

type Params = { params: Promise<{ id: string }> };

/** Stage moves from the pipeline board, and re-assignment to another contact. */
export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, projectPatchSchema);
  const { stageId, clientId } = data;

  // Scoped to the workspace so a foreign client id cannot be smuggled in.
  if (clientId) {
    const client = await prisma.client.count({
      where: { id: clientId, workspaceId: ctx.workspaceId },
    });
    if (client === 0) notFound('Client');
  }

  if (stageId) {
    const stage = await prisma.pipelineStage.count({
      where: { id: stageId, workspaceId: ctx.workspaceId },
    });
    if (stage === 0) notFound('Stage');
  }

  // Text clears to null when emptied, and so does a date: a date can be taken
  // off a project rather than only ever changed.
  const when = (value: string | null | undefined) =>
    value === undefined ? undefined : value ? readWhen(value) : null;

  // Somebody already on the project who becomes its client would otherwise
  // appear twice: once as the client, once in the list beside them.
  if (clientId) {
    await prisma.projectContact.deleteMany({ where: { projectId: id, clientId } });
  }

  const { count } = await prisma.project.updateMany({
    where: { id, workspaceId: ctx.workspaceId },
    data: {
      ...(stageId ? { stageId } : {}),
      ...(clientId ? { clientId } : {}),
      ...(data.type === undefined ? {} : { type: data.type || null }),
      ...(data.leadSource === undefined ? {} : { leadSource: data.leadSource || null }),
      ...(data.tags === undefined ? {} : { tags: data.tags }),
      ...(data.name === undefined ? {} : { name: data.name }),
      ...(data.description === undefined ? {} : { description: data.description || null }),
      ...(data.location === undefined ? {} : { location: data.location || null }),
      ...(data.timezone === undefined ? {} : { timezone: data.timezone || null }),
      ...(data.dateTitle === undefined ? {} : { dateTitle: data.dateTitle || null }),
      ...(data.availability === undefined ? {} : { availability: data.availability }),
      ...(data.eventDate === undefined ? {} : { eventDate: when(data.eventDate) }),
      ...(data.endsAt === undefined ? {} : { endsAt: when(data.endsAt) }),
      ...(data.allDay === undefined ? {} : { allDay: data.allDay }),
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
