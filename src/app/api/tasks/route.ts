import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, parseBody } from '@/lib/api';
import { taskSchema } from '@/lib/validation';

export const GET = handler(async (ctx) => {
  const tasks = await prisma.task.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: [{ done: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json({ tasks });
});

export const POST = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, taskSchema);

  if (data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, workspaceId: ctx.workspaceId },
      select: { id: true },
    });
    if (!project) throw new HttpError(422, 'That project is not in this workspace');
  }

  const task = await prisma.task.create({
    data: {
      workspaceId: ctx.workspaceId,
      projectId: data.projectId ?? null,
      title: data.title,
      dueAt: data.dueAt ?? null,
      dueHasTime: data.dueHasTime,
      assigneeId: data.assigneeId ?? null,
    },
  });
  return NextResponse.json({ task }, { status: 201 });
});
