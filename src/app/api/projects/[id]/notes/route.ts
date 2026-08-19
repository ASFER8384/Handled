import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { projectNoteSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export const POST = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, projectNoteSchema);

  const project = await prisma.project.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!project) notFound('Project');

  const note = await prisma.projectNote.create({
    data: {
      projectId: id,
      title: data.title ?? null,
      body: data.body,
      bodyHtml: data.bodyHtml ?? null,
      sharedWithClient: data.sharedWithClient,
    },
  });
  return NextResponse.json({ note }, { status: 201 });
});
