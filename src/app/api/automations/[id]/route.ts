import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HttpError, handler, notFound } from '@/lib/api';
import { hasLiveRun } from '@/lib/automations';
import { automationSchema, automationStatusSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

/** Turning an automation on or off is allowed even mid-run; editing is not. */
export const PATCH = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const raw: unknown = await request.json().catch(() => {
    throw new HttpError(400, 'Expected a JSON body');
  });

  const owned = await prisma.automation.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!owned) notFound('Automation');

  // A body of just { status } is the on/off toggle.
  const toggle = automationStatusSchema.safeParse(raw);
  if (toggle.success) {
    await prisma.automation.updateMany({
      where: { id, workspaceId: ctx.workspaceId },
      data: { status: toggle.data.status },
    });
    return NextResponse.json({ ok: true, status: toggle.data.status });
  }

  if (await hasLiveRun(id, ctx.workspaceId)) {
    throw new HttpError(
      409,
      'This automation has a run in flight. Cancel the run from Activity, then edit it.',
    );
  }

  const data = automationSchema.parse(raw);

  // Steps are replaced wholesale. Runs already scheduled keep their own rows,
  // so past and in-flight work is unaffected by an edit.
  const automation = await prisma.$transaction(async (tx) => {
    await tx.automationStep.deleteMany({ where: { automationId: id } });
    return tx.automation.update({
      where: { id },
      data: {
        name: data.name,
        trigger: data.trigger,
        triggerStage: data.trigger === 'PROJECT_STAGE_CHANGED' ? (data.triggerStage ?? null) : null,
        status: data.status,
        steps: {
          create: data.steps.map((step, index) => ({
            position: index,
            action: step.action,
            delayMinutes: step.delayMinutes,
            subject: step.subject ?? null,
            body: step.body ?? null,
            targetStage: step.action === 'MOVE_STAGE' ? (step.targetStage ?? null) : null,
          })),
        },
      },
      include: { steps: { orderBy: { position: 'asc' } } },
    });
  });

  return NextResponse.json({ automation });
});

export const DELETE = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;
  const { count } = await prisma.automation.deleteMany({
    where: { id, workspaceId: ctx.workspaceId },
  });
  if (count === 0) notFound('Automation');
  return NextResponse.json({ ok: true });
});
