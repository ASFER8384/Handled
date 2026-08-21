import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, notFound, parseBody } from '@/lib/api';
import { eventSchema } from '@/lib/validation';
import { belongsHere, when } from '../route';

type Params = { params: Promise<{ id: string }> };

/** The whole event, rewritten. It is four fields; reconciling them is worse. */
export const PUT = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, eventSchema);

  const existing = await prisma.event.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!existing) notFound('Event');

  const startAt = when(data.startAt);
  if (!startAt) throw new HttpError(422, 'That start time makes no sense');
  const endAt = data.endAt ? when(data.endAt) : null;
  if (endAt && endAt < startAt) throw new HttpError(422, 'It cannot end before it starts');

  await belongsHere(ctx.workspaceId, data.projectId, data.clientId);

  const event = await prisma.event.update({
    where: { id },
    data: {
      title: data.title,
      startAt,
      endAt,
      allDay: data.allDay,
      location: data.location ?? null,
      note: data.note ?? null,
      projectId: data.projectId ?? null,
      clientId: data.clientId ?? null,
    },
  });

  return NextResponse.json({ event });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;

  const existing = await prisma.event.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!existing) notFound('Event');

  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
