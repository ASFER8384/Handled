import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound } from '@/lib/api';
import { deleteUpload } from '@/lib/uploads';

type Params = { params: Promise<{ id: string }> };

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  const file = await prisma.projectFile.findFirst({
    where: { id, project: { workspaceId: ctx.workspaceId } },
    select: { id: true, storageKey: true },
  });
  if (!file) notFound('File');

  await prisma.projectFile.delete({ where: { id } });
  if (file.storageKey) await deleteUpload(file.storageKey);
  return NextResponse.json({ ok: true });
});
