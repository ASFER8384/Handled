import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, parseBody } from '@/lib/api';
import { eventSchema } from '@/lib/validation';
export const GET = handler(async (ctx) => {
  const events = await prisma.event.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { startAt: 'asc' },
  });
  return NextResponse.json({ events });
});

export const POST = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, eventSchema);

  const startAt = when(data.startAt);
  if (!startAt) throw new HttpError(422, 'That start time makes no sense');
  const endAt = data.endAt ? when(data.endAt) : null;
  if (endAt && endAt < startAt) throw new HttpError(422, 'It cannot end before it starts');

  await belongsHere(ctx.workspaceId, data.projectId, data.clientId);

  const event = await prisma.event.create({
    data: {
      workspaceId: ctx.workspaceId,
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

  return NextResponse.json({ event }, { status: 201 });
});

/**
 * '2026-08-28T14:00' as it was typed, rather than shifted by a timezone
 * nobody wrote down. A date on its own is read as that day.
 */
export function when(value: string): Date | null {
  const parsed = new Date(value.length === 10 ? `${value}T00:00` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * An event can name a project and a person, but only ones that are yours:
 * an id typed into a request must not reach across workspaces.
 */
export async function belongsHere(
  workspaceId: string,
  projectId?: string | null,
  clientId?: string | null,
) {
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true },
    });
    if (!project) throw new HttpError(422, 'That project is not in this workspace');
  }
  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, workspaceId },
      select: { id: true },
    });
    if (!client) throw new HttpError(422, 'That contact is not in this workspace');
  }
}
