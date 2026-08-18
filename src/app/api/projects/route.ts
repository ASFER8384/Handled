import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, parseBody } from '@/lib/api';
import { projectSchema } from '@/lib/validation';

export const GET = handler(async (ctx) => {
  const projects = await prisma.project.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ projects });
});

export const POST = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, projectSchema);

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
      stage: data.stage,
      description: data.description ?? null,
      eventDate: data.eventDate ?? null,
      valueCents: data.valueCents,
    },
  });
  return NextResponse.json({ project }, { status: 201 });
});
