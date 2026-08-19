import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { projectMessageSchema } from '@/lib/validation';
import { sendEmail } from '@/lib/email';
import { storagePath } from '@/lib/uploads';

type Params = { params: Promise<{ id: string }> };

export const POST = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, projectMessageSchema);

  const project = await prisma.project.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!project) notFound('Project');

  // Only files that belong to this project can ride along with its email.
  const files = data.attachmentIds.length
    ? await prisma.projectFile.findMany({
        where: { id: { in: data.attachmentIds }, projectId: id },
      })
    : [];

  // Stored first: a failed send must still leave a record of what was written.
  const message = await prisma.projectMessage.create({
    data: {
      projectId: id,
      to: data.to.join(', '),
      subject: data.subject,
      body: data.body,
      bodyHtml: data.bodyHtml ?? null,
      attachments: files.map((file) => ({ id: file.id, name: file.name })),
      replyToId: data.replyToId ?? null,
      status: data.draft ? 'DRAFT' : 'QUEUED',
    },
  });

  if (data.draft) {
    const draft = await prisma.projectMessage.update({
      where: { id: message.id },
      data: { detail: 'Saved as a draft. Nothing has been sent.' },
    });
    return NextResponse.json({ message: draft }, { status: 201 });
  }

  // Uploaded files travel as base64; a linked one is left as a link in the body.
  const attached = [];
  for (const file of files) {
    if (!file.storageKey) continue;
    const bytes = await readFile(storagePath(file.storageKey)).catch(() => null);
    if (!bytes) continue;
    attached.push({
      filename: file.name,
      type: file.mimeType ?? 'application/octet-stream',
      content: bytes.toString('base64'),
    });
  }

  const result = await sendEmail({
    to: data.to,
    subject: data.subject,
    body: data.body,
    bodyHtml: data.bodyHtml,
    attachments: attached,
  });

  const updated = await prisma.projectMessage.update({
    where: { id: message.id },
    data: {
      status: result.delivered ? 'SENT' : 'QUEUED',
      detail: result.detail,
      sentAt: result.delivered ? new Date() : null,
    },
  });

  return NextResponse.json({ message: updated }, { status: 201 });
});
