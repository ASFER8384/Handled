import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, notFound } from '@/lib/api';

type Params = { params: Promise<{ id: string; contactId: string }> };

/**
 * Takes somebody off a project. The contact itself is left alone: they stay in
 * the address book and on every other project they belong to.
 */
export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id, contactId } = await params;

  const project = await prisma.project.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true, clientId: true, name: true },
  });
  if (!project) notFound('Project');

  // A project is always for somebody. Its client leaves by the project being
  // handed to another contact, not by being taken off it.
  if (project.clientId === contactId) {
    throw new HttpError(
      409,
      `They are the client ${project.name} is for, so they cannot be taken off it.`,
    );
  }

  const { count } = await prisma.projectContact.deleteMany({
    where: { projectId: id, clientId: contactId },
  });
  if (count === 0) notFound('That link');

  return NextResponse.json({ ok: true });
});
