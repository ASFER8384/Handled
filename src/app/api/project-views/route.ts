import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { projectViewCreateSchema } from '@/lib/validation';

/** Creates a view, either blank or as a copy of one that already exists. */
export const POST = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, projectViewCreateSchema);

  const source = data.duplicateOf
    ? await prisma.projectView.findFirst({
        where: { id: data.duplicateOf, workspaceId: ctx.workspaceId },
      })
    : null;
  if (data.duplicateOf && !source) notFound('View');

  const last = await prisma.projectView.aggregate({
    _max: { position: true },
    where: { workspaceId: ctx.workspaceId },
  });

  const view = await prisma.projectView.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: data.name ?? (source ? `${source.name} (copy)`.slice(0, 60) : 'New view'),
      position: (last._max?.position ?? -1) + 1,
      layout: source?.layout ?? 'BOARD',
      showGroups: source?.showGroups ?? true,
      hiddenProps: source?.hiddenProps ?? [],
      sortField: source?.sortField ?? null,
      sortDir: source?.sortDir ?? 'asc',
      filters: source?.filters ?? [],
    },
  });

  return NextResponse.json({ view }, { status: 201 });
});
