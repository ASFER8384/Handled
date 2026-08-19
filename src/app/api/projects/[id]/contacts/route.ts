import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, notFound, parseBody } from '@/lib/api';
import { projectContactSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

/** Adds someone to a project: an existing contact, or one made on the spot. */
export const POST = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, projectContactSchema);

  const project = await prisma.project.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true, clientId: true },
  });
  if (!project) notFound('Project');

  let clientId: string;
  if (data.clientId) {
    const existing = await prisma.client.findFirst({
      where: { id: data.clientId, workspaceId: ctx.workspaceId },
      select: { id: true },
    });
    if (!existing) notFound('Contact');
    clientId = existing.id;
  } else {
    if (!data.name || !data.email) throw new HttpError(422, 'A name and email are both needed');
    const created = await prisma.client.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        lastInteractionAt: data.lastInteractionAt ?? null,
      },
    });
    clientId = created.id;
  }

  // Already on the project is not a failure, it is just nothing to do.
  const link = await prisma.projectContact.upsert({
    where: { projectId_clientId: { projectId: id, clientId } },
    create: { projectId: id, clientId },
    update: {},
    include: { client: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ contact: link.client }, { status: 201 });
});
