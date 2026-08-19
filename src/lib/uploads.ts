import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Files live on disk under .uploads, outside public/, so every read goes
 * through a route that checks the workspace first. Swapping this for S3 later
 * means replacing these three functions, nothing else.
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

export function storagePath(key: string): string {
  // The key is generated here, never taken from the client, so it cannot walk.
  return path.join(ROOT, key);
}

export async function saveUpload(
  workspaceId: string,
  file: File,
): Promise<{ key: string; size: number }> {
  const extension = path.extname(file.name).slice(0, 12);
  const key = path.join(workspaceId, `${randomUUID()}${extension}`);
  const target = storagePath(key);
  await mkdir(path.dirname(target), { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(target, bytes);
  return { key, size: bytes.byteLength };
}

export async function deleteUpload(key: string): Promise<void> {
  // A missing file must not block deleting the record that points at it.
  await unlink(storagePath(key)).catch(() => {});
}
