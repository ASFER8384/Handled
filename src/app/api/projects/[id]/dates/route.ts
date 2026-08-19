import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { projectDateSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export const POST = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, projectDateSchema);

  const project = await prisma.project.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!project) notFound('Project');

  const last = await prisma.projectDate.findFirst({
    where: { projectId: id },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const date = await prisma.projectDate.create({
    data: {
      projectId: id,
      title: data.title,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
      allDay: data.allDay,
      availability: data.availability,
      location: data.location || null,
      position: (last?.position ?? -1) + 1,
    },
  });
  return NextResponse.json({ date }, { status: 201 });
});
