import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, notFound, parseBody, refuseDuplicateContact } from '@/lib/api';
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
    await refuseDuplicateContact(ctx.workspaceId, { email: data.email, phone: data.phone });
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

/**
 * The workspace address book, read against one project: every contact carries
 * where it stands in relation to this project, so the list can say "the client
 * here" or name the project someone else belongs to instead of labelling every
 * row the same way.
 */
export const GET = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true, clientId: true },
  });
  if (!project) notFound('Project');

  const clients = await prisma.client.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      projects: { select: { id: true, name: true }, orderBy: { createdAt: 'desc' }, take: 3 },
      projectContacts: {
        select: { project: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
  });

  const linked = new Set(
    (
      await prisma.projectContact.findMany({
        where: { projectId: id },
        select: { clientId: true },
      })
    ).map((row) => row.clientId),
  );

  const contacts = clients.map((client) => {
    // Being the client of a project and being added to one both count as
    // belonging, and neither should be listed twice.
    const belongsTo = [...client.projects, ...client.projectContacts.map((row) => row.project)]
      .filter((entry, index, all) => all.findIndex((other) => other.id === entry.id) === index)
      // The project being looked at leads, since it is the one in question.
      .sort((a, b) => Number(b.id === id) - Number(a.id === id));

    return {
      id: client.id,
      name: client.name,
      email: client.email,
      relation:
        client.id === project.clientId ? 'client' : linked.has(client.id) ? 'linked' : 'other',
      projects: belongsTo.map((entry) => ({ name: entry.name, here: entry.id === id })),
    };
  });

  return NextResponse.json({ contacts });
});
