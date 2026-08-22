import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';

/**
 * Where uploaded files live.
 *
 * They used to live on disk under .uploads. That works on a laptop and fails
 * silently everywhere else: a serverless deployment gives each request its own
 * machine, so the logo written during an upload is not there when the next
 * request asks for it — the upload succeeds, and the picture is broken for
 * good. They are kept in the database now, which every request can reach and
 * a deploy cannot wipe.
 *
 * The key is unchanged, so everything already pointing at a file — a
 * workspace's logo, a project's attachment — still points at it. Anything
 * written before this still on disk is read from there, once, and left alone.
 */
const ROOT = process.env.UPLOAD_DIR ?? path.join(process.cwd(), '.uploads');

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** What a project can hold: documents, spreadsheets, images, archives. */
export const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
];

/** Only for reading what an older version left behind. Nothing writes here. */
export function storagePath(key: string): string {
  // The key was generated here, never taken from the client, so it cannot walk.
  return path.join(ROOT, key);
}

export async function saveUpload(
  workspaceId: string,
  file: File,
): Promise<{ key: string; size: number }> {
  const extension = path.extname(file.name).slice(0, 12);
  // Kept in the old shape — workspace/uuid.ext — so a key says where it came
  // from at a glance, and the files already on disk are found by the same one.
  const key = `${workspaceId}/${randomUUID()}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await prisma.upload.create({
    data: {
      id: key,
      workspaceId,
      mime: file.type || 'application/octet-stream',
      size: bytes.byteLength,
      bytes,
    },
  });

  return { key, size: bytes.byteLength };
}

/**
 * The bytes behind a key, wherever they are.
 *
 * The database first, then the disk for anything uploaded before the move.
 * Missing is an answer, not a failure: a file can be gone, and the caller
 * decides what that means.
 */
export async function readUpload(key: string): Promise<Buffer | null> {
  const stored = await prisma.upload.findUnique({
    where: { id: key },
    select: { bytes: true },
  });
  if (stored) return Buffer.from(stored.bytes);

  return readFile(storagePath(key)).catch(() => null);
}

export async function deleteUpload(key: string): Promise<void> {
  // A missing file must not block deleting the record that points at it.
  await prisma.upload.deleteMany({ where: { id: key } });
  await unlink(storagePath(key)).catch(() => {});
}
