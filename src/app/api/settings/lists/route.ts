import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, parseBody } from '@/lib/api';
import { workspaceListsSchema } from '@/lib/validation';
import { LEAD_SOURCES, PROJECT_TYPES, listOrDefault } from '@/lib/stages';

/**
 * The lists a workspace fills in for itself: what kinds of work it does, and
 * where the work comes from.
 *
 * Left empty they fall back to what Handled ships with, rather than leaving a
 * dropdown with nothing in it — the answer to "I deleted them all" is the
 * defaults, not a dead end.
 */
export const GET = handler(async (ctx) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: ctx.workspaceId },
    select: { projectTypes: true, leadSources: true },
  });

  return NextResponse.json({
    projectTypes: listOrDefault(workspace?.projectTypes ?? [], PROJECT_TYPES),
    leadSources: listOrDefault(workspace?.leadSources ?? [], LEAD_SOURCES),
  });
});

export const PUT = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, workspaceListsSchema);

  await prisma.workspace.update({
    where: { id: ctx.workspaceId },
    data: {
      projectTypes: data.projectTypes ?? undefined,
      leadSources: data.leadSources ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
});
