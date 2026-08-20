import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { taskPatchSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, taskPatchSchema);

  // Only a member of this workspace can be handed a task in it.
  if (data.assigneeId) {
    const member = await prisma.membership.findFirst({
      where: { userId: data.assigneeId, workspaceId: ctx.workspaceId },
      select: { id: true },
    });
    if (!member) notFound('That person');
  }

  // A task can only be moved to a project in the same workspace.
  if (data.projectId) {
    const project = await prisma.project.count({
      where: { id: data.projectId, workspaceId: ctx.workspaceId },
    });
    if (project === 0) notFound('Project');
  }

  const { count } = await prisma.task.updateMany({
    where: { id, workspaceId: ctx.workspaceId },
    data: {
      ...(data.done === undefined ? {} : { done: data.done }),
      ...(data.title === undefined ? {} : { title: data.title }),
      ...(data.dueAt === undefined ? {} : { dueAt: data.dueAt ? new Date(data.dueAt) : null }),
      ...(data.dueHasTime === undefined ? {} : { dueHasTime: data.dueHasTime }),
      ...(data.assigneeId === undefined ? {} : { assigneeId: data.assigneeId }),
      ...(data.projectId === undefined ? {} : { projectId: data.projectId }),
    },
  });
  if (count === 0) notFound('Task');

  const task = await prisma.task.findUnique({ where: { id } });
  return NextResponse.json({ ok: true, task });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  const { count } = await prisma.task.deleteMany({
    where: { id, workspaceId: ctx.workspaceId },
  });
  if (count === 0) notFound('Task');
  return NextResponse.json({ ok: true });
});
