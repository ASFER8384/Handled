import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound } from '@/lib/api';
import { readUpload } from '@/lib/uploads';

type Params = { params: Promise<{ id: string }> };

/** Serves an uploaded file, but only to someone inside its workspace. */
export const GET = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  const file = await prisma.projectFile.findFirst({
    where: { id, project: { workspaceId: ctx.workspaceId } },
  });
  if (!file?.storageKey) notFound('File');

  const bytes = await readUpload(file.storageKey);
  if (!bytes) notFound('File');

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': file.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
});
