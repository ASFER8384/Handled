import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { contactViewCreateSchema } from '@/lib/validation';
import { DEFAULT_HIDDEN_CONTACT_COLUMNS } from '@/lib/contact-columns';

/** Creates a view of the Contacts table, either blank or as a copy of one. */
export const POST = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, contactViewCreateSchema);

  const source = data.duplicateOf
    ? await prisma.contactView.findFirst({
        where: { id: data.duplicateOf, workspaceId: ctx.workspaceId },
      })
    : null;
  if (data.duplicateOf && !source) notFound('View');

  const last = await prisma.contactView.aggregate({
    _max: { position: true },
    where: { workspaceId: ctx.workspaceId },
  });

  const view = await prisma.contactView.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: data.name ?? (source ? `${source.name} (copy)`.slice(0, 60) : 'New view'),
      position: (last._max?.position ?? -1) + 1,
      hiddenColumns: source?.hiddenColumns ?? DEFAULT_HIDDEN_CONTACT_COLUMNS,
      sortField: source?.sortField ?? null,
      sortDir: source?.sortDir ?? 'asc',
      filters: source?.filters ?? [],
    },
  });

  return NextResponse.json({ view }, { status: 201 });
});
