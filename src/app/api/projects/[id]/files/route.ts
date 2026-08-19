import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, notFound, parseBody } from '@/lib/api';
import { projectFileSchema } from '@/lib/validation';
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, saveUpload } from '@/lib/uploads';

type Params = { params: Promise<{ id: string }> };

export const POST = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!project) notFound('Project');

  // Two ways in: an uploaded file, or a link to one kept elsewhere.
  if (request.headers.get('content-type')?.includes('multipart/form-data')) {
    const form = await request.formData();
    const uploads = form.getAll('files').filter((entry): entry is File => entry instanceof File);
    if (uploads.length === 0) throw new HttpError(422, 'Choose a file first');

    const files = [];
    for (const upload of uploads) {
      if (upload.size > MAX_UPLOAD_BYTES) {
        throw new HttpError(422, `${upload.name} is larger than 20MB`);
      }
      if (upload.type && !ALLOWED_MIME.includes(upload.type)) {
        throw new HttpError(422, `${upload.name} is not a file type we take`);
      }
      const { key, size } = await saveUpload(ctx.workspaceId, upload);
      files.push(
        await prisma.projectFile.create({
          data: {
            projectId: id,
            name: upload.name,
            storageKey: key,
            mimeType: upload.type || 'application/octet-stream',
            sizeBytes: size,
          },
        }),
      );
    }
    return NextResponse.json({ files }, { status: 201 });
  }

  const data = await parseBody(request, projectFileSchema);
  const file = await prisma.projectFile.create({
    data: { projectId: id, name: data.name, url: data.url },
  });
  return NextResponse.json({ files: [file] }, { status: 201 });
});
