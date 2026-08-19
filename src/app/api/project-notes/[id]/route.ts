import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { projectNotePatchSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

/** Ownership always runs through the project, which is what a workspace holds. */
async function ownedBy(id: string, workspaceId: string) {
  return prisma.projectNote.findFirst({
    where: { id, project: { workspaceId } },
    select: { id: true },
  });
}

export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, projectNotePatchSchema);

  const note = await ownedBy(id, ctx.workspaceId);
  if (!note) notFound('Note');

  const saved = await prisma.projectNote.update({
    where: { id },
    data: {
      ...(data.title === undefined ? {} : { title: data.title || null }),
      ...(data.body === undefined ? {} : { body: data.body }),
      ...(data.bodyHtml === undefined ? {} : { bodyHtml: data.bodyHtml || null }),
      ...(data.sharedWithClient === undefined
        ? {}
        : { sharedWithClient: data.sharedWithClient }),
    },
  });
  return NextResponse.json({ note: saved });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  const note = await ownedBy(id, ctx.workspaceId);
  if (!note) notFound('Note');

  await prisma.projectNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
