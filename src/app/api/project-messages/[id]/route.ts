import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, notFound, parseBody } from '@/lib/api';
import { messageActionSchema } from '@/lib/validation';
import { deliver } from '@/lib/messages';

type Params = { params: Promise<{ id: string }> };

/** Send it now, hold it for a time, or put it back to being a draft. */
export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, messageActionSchema);

  const message = await prisma.projectMessage.findFirst({
    where: { id, project: { workspaceId: ctx.workspaceId } },
    select: { id: true, status: true },
  });
  if (!message) notFound('Message');
  if (message.status === 'SENT') throw new HttpError(422, 'That one has already gone out');

  if (data.action === 'send') {
    const result = await deliver(id);
    const sent = await prisma.projectMessage.findUnique({ where: { id } });
    return NextResponse.json({ message: sent, delivered: result.delivered });
  }

  if (data.action === 'schedule') {
    if (!data.scheduledFor) throw new HttpError(422, 'Pick a time to send it');
    const when = new Date(data.scheduledFor);
    if (Number.isNaN(when.getTime())) throw new HttpError(422, 'That is not a time');

    const scheduled = await prisma.projectMessage.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        scheduledFor: when,
        detail: `Scheduled for ${when.toLocaleString('en-GB')}.`,
      },
    });
    return NextResponse.json({ message: scheduled });
  }

  const held = await prisma.projectMessage.update({
    where: { id },
    data: { status: 'DRAFT', scheduledFor: null, detail: 'Held as a draft. Nothing was sent.' },
  });
  return NextResponse.json({ message: held });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  const message = await prisma.projectMessage.findFirst({
    where: { id, project: { workspaceId: ctx.workspaceId } },
    select: { id: true },
  });
  if (!message) notFound('Message');

  await prisma.projectMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
