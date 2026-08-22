import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { projectDatePatchSchema } from '@/lib/validation';
import { readWhen } from '@/lib/when';

type Params = { params: Promise<{ id: string }> };

/** Ownership runs through the project, which is what a workspace holds. */
async function owned(id: string, workspaceId: string) {
  return prisma.projectDate.findFirst({
    where: { id, project: { workspaceId } },
    select: { id: true },
  });
}

export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, projectDatePatchSchema);
  if (!(await owned(id, ctx.workspaceId))) notFound('Date');

  const when = (value: string | null | undefined) =>
    value === undefined ? undefined : value ? readWhen(value) : null;

  const date = await prisma.projectDate.update({
    where: { id },
    data: {
      ...(data.title === undefined ? {} : { title: data.title }),
      ...(data.startAt === undefined ? {} : { startAt: when(data.startAt) }),
      ...(data.endAt === undefined ? {} : { endAt: when(data.endAt) }),
      ...(data.allDay === undefined ? {} : { allDay: data.allDay }),
      ...(data.availability === undefined ? {} : { availability: data.availability }),
      ...(data.location === undefined ? {} : { location: data.location || null }),
    },
  });
  return NextResponse.json({ date });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  if (!(await owned(id, ctx.workspaceId))) notFound('Date');
  await prisma.projectDate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
