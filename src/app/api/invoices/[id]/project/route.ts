import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, notFound, parseBody } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  /** Empty takes it off the project and leaves it standing on its own. */
  projectId: z.string().max(40).nullable().optional(),
});

/**
 * Filing an invoice onto a project, after the fact.
 *
 * Which project an invoice belongs to is not part of the document — the client
 * never sees it — so it can be set at any point, including long after the
 * invoice has gone out. What it cannot do is move to a project belonging to
 * somebody else: the money would then be counted against work for a different
 * client.
 */
export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const { projectId } = await parseBody(request, schema);

  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true, clientId: true },
  });
  if (!invoice) notFound('Invoice');

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: ctx.workspaceId, clientId: invoice.clientId },
      select: { id: true },
    });
    if (!project) throw new HttpError(422, "That project doesn't belong to this client");
  }

  await prisma.invoice.update({ where: { id }, data: { projectId: projectId ?? null } });
  return NextResponse.json({ ok: true });
});
