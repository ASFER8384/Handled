import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HttpError, handler } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

/**
 * Cancels a run in flight. Steps already executed stay on the timeline —
 * cancelling stops what is scheduled, it does not undo what happened.
 */
export const POST = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;

  const { count } = await prisma.automationRun.updateMany({
    where: { id, workspaceId: ctx.workspaceId, status: 'RUNNING' },
    data: { status: 'CANCELLED', finishedAt: new Date() },
  });
  if (count === 0) throw new HttpError(404, 'No run in flight with that id');

  await prisma.automationRunStep.updateMany({
    where: { runId: id, status: 'PENDING' },
    data: { detail: 'Cancelled before it ran' },
  });

  return NextResponse.json({ ok: true });
});
