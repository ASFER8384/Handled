import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { customFieldPatchSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

/** The type is fixed once made: an answer already given has to stay readable. */
export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, customFieldPatchSchema);

  const { count } = await prisma.customField.updateMany({
    where: { id, workspaceId: ctx.workspaceId },
    data: {
      ...(data.name === undefined ? {} : { name: data.name }),
      ...(data.options === undefined ? {} : { options: data.options }),
      ...(data.visibleToClient === undefined ? {} : { visibleToClient: data.visibleToClient }),
    },
  });
  if (count === 0) notFound('Field');

  const field = await prisma.customField.findUnique({ where: { id } });
  return NextResponse.json({ field });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  const { count } = await prisma.customField.deleteMany({
    where: { id, workspaceId: ctx.workspaceId },
  });
  if (count === 0) notFound('Field');
  return NextResponse.json({ ok: true });
});
