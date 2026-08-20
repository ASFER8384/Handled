import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { projectMessageSchema } from '@/lib/validation';
import { deliver } from '@/lib/messages';

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

  const when = data.scheduledFor ? new Date(data.scheduledFor) : null;
  const held = data.draft || (when !== null && when.getTime() > Date.now());

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
      status: data.draft ? 'DRAFT' : when ? 'SCHEDULED' : 'QUEUED',
      scheduledFor: data.draft ? null : when,
      detail: data.draft
        ? 'Saved as a draft. Nothing has been sent.'
        : when
          ? `Scheduled for ${when.toLocaleString('en-GB')}.`
          : null,
    },
  });

  // An invoice that has gone out to the client is no longer a draft. Held
  // back or parked, it has not gone anywhere, so nothing changes yet.
  if (data.invoiceId && !held) {
    await prisma.invoice.updateMany({
      where: { id: data.invoiceId, workspaceId: ctx.workspaceId, status: 'DRAFT' },
      data: { status: 'SENT', issuedAt: new Date() },
    });
  }

  if (held) {
    const waiting = await prisma.projectMessage.findUnique({ where: { id: message.id } });
    return NextResponse.json({ message: waiting }, { status: 201 });
  }

  await deliver(message.id);
  const sent = await prisma.projectMessage.findUnique({ where: { id: message.id } });
  return NextResponse.json({ message: sent }, { status: 201 });
});
