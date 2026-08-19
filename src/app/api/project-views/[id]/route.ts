import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, notFound, parseBody } from '@/lib/api';
import { projectViewPatchSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, projectViewPatchSchema);

  const view = await prisma.projectView.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
  });
  if (!view) notFound('View');

  // The default view holds the name every workspace expects to find.
  if (data.name !== undefined && view.isDefault) {
    throw new HttpError(422, 'This view cannot be renamed');
  }

  const updated = await prisma.projectView.update({
    where: { id },
    data: {
      ...(data.name === undefined ? {} : { name: data.name }),
      ...(data.layout === undefined ? {} : { layout: data.layout }),
      ...(data.showGroups === undefined ? {} : { showGroups: data.showGroups }),
      ...(data.hiddenProps === undefined ? {} : { hiddenProps: data.hiddenProps }),
    },
  });

  return NextResponse.json({ view: updated });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  const view = await prisma.projectView.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { isDefault: true },
  });
  if (!view) notFound('View');
  if (view.isDefault) throw new HttpError(422, 'This view cannot be deleted');

  await prisma.projectView.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
