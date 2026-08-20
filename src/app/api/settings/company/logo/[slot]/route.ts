import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, notFound } from '@/lib/api';
import { MAX_UPLOAD_BYTES, deleteUpload, saveUpload, storagePath } from '@/lib/uploads';

type Params = { params: Promise<{ slot: string }> };

/** A logo is a picture; nothing else is taken here. */
const IMAGES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

/** Which pair of columns a slot writes to. Never built from the URL directly. */
function columnsFor(slot: string) {
  if (slot === 'main') return { key: 'logoKey', mime: 'logoMime' } as const;
  if (slot === 'alt') return { key: 'logoAltKey', mime: 'logoAltMime' } as const;
  throw new HttpError(404, 'No such logo');
}

export const GET = handler(async (ctx, _request: Request, { params }: Params) => {
  const { slot } = await params;
  const columns = columnsFor(slot);

  const workspace = await prisma.workspace.findUnique({ where: { id: ctx.workspaceId } });
  const key = workspace?.[columns.key];
  if (!key) notFound('Logo');

  const bytes = await readFile(storagePath(key)).catch(() => null);
  if (!bytes) notFound('Logo');

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': workspace?.[columns.mime] ?? 'application/octet-stream',
      // Never cached: a replaced logo at the same address must not keep
      // showing the old one back.
      'Cache-Control': 'private, no-store',
    },
  });
});

export const POST = handler(async (ctx, request: Request, { params }: Params) => {
  const { slot } = await params;
  const columns = columnsFor(slot);

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw new HttpError(422, 'Choose an image first');
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(422, 'That image is larger than 20MB');
  if (file.type && !IMAGES.includes(file.type)) {
    throw new HttpError(422, 'A logo has to be a PNG, JPEG, WebP or SVG');
  }

  const existing = await prisma.workspace.findUnique({ where: { id: ctx.workspaceId } });
  const { key } = await saveUpload(ctx.workspaceId, file);

  await prisma.workspace.update({
    where: { id: ctx.workspaceId },
    data: { [columns.key]: key, [columns.mime]: file.type || 'application/octet-stream' },
  });

  // Only once the new one is safely in place.
  const old = existing?.[columns.key];
  if (old) await deleteUpload(old);

  return NextResponse.json({ ok: true });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { slot } = await params;
  const columns = columnsFor(slot);

  const workspace = await prisma.workspace.findUnique({ where: { id: ctx.workspaceId } });
  const key = workspace?.[columns.key];

  await prisma.workspace.update({
    where: { id: ctx.workspaceId },
    data: { [columns.key]: null, [columns.mime]: null },
  });
  if (key) await deleteUpload(key);

  return NextResponse.json({ ok: true });
});
