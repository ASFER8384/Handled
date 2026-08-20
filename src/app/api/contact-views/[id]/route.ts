import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, notFound, parseBody } from '@/lib/api';
import { contactViewPatchSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, contactViewPatchSchema);

  const view = await prisma.contactView.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
  });
  if (!view) notFound('View');

  // The default view holds the name every workspace expects to find.
  if (data.name !== undefined && view.isDefault) {
    throw new HttpError(422, 'This view cannot be renamed');
  }

  const updated = await prisma.contactView.update({
    where: { id },
    data: {
      ...(data.name === undefined ? {} : { name: data.name }),
      ...(data.hiddenColumns === undefined ? {} : { hiddenColumns: data.hiddenColumns }),
      ...(data.sortField === undefined ? {} : { sortField: data.sortField }),
      ...(data.sortDir === undefined ? {} : { sortDir: data.sortDir }),
      ...(data.filters === undefined ? {} : { filters: data.filters }),
    },
  });

  return NextResponse.json({ view: updated });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  const view = await prisma.contactView.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { isDefault: true },
  });
  if (!view) notFound('View');
  if (view.isDefault) throw new HttpError(422, 'This view cannot be deleted');

  await prisma.contactView.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
