import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, parseBody } from '@/lib/api';
import { projectSchema } from '@/lib/validation';
import { fireTrigger } from '@/lib/automations';

export const GET = handler(async (ctx) => {
  const projects = await prisma.project.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: {
      client: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true, group: true, position: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ projects });
});

export const POST = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, projectSchema);

  // A project always lands somewhere: the first stage of the pipeline.
  const firstStage = data.stageId
    ? null
    : await prisma.pipelineStage.findFirst({
        where: { workspaceId: ctx.workspaceId, hidden: false },
        orderBy: { position: 'asc' },
        select: { id: true },
      });

  const client = await prisma.client.findFirst({
    where: { id: data.clientId, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!client) throw new HttpError(422, 'That client is not in this workspace');

  const project = await prisma.project.create({
    data: {
      workspaceId: ctx.workspaceId,
      clientId: client.id,
      name: data.name,
      stageId: data.stageId ?? firstStage?.id ?? null,
      description: data.description ?? null,
      type: data.type ?? null,
      leadSource: data.leadSource ?? null,
      location: data.location ?? null,
      eventDate: data.eventDate ?? null,
      endsAt: data.endsAt ?? null,
      allDay: data.allDay,
      timezone: data.timezone ?? null,
      valueCents: data.valueCents,
    },
  });
  await fireTrigger('PROJECT_CREATED', {
    workspaceId: ctx.workspaceId,
    projectId: project.id,
    clientId: client.id,
  });

  return NextResponse.json({ project }, { status: 201 });
});
