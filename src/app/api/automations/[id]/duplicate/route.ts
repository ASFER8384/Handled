import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

/** Copies an automation and its steps. The copy always starts inactive. */
export const POST = handler(async (ctx, _request: Request, { params }: Params) => {
  const { id } = await params;

  const source = await prisma.automation.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: { steps: { orderBy: { position: 'asc' } } },
  });
  if (!source) notFound('Automation');

  const automation = await prisma.automation.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: `${source.name} (copy)`.slice(0, 140),
      trigger: source.trigger,
      triggerStageId: source.triggerStageId,
      status: 'INACTIVE',
      steps: {
        create: source.steps.map((step) => ({
          position: step.position,
          action: step.action,
          delayMinutes: step.delayMinutes,
          subject: step.subject,
          body: step.body,
          targetStageId: step.targetStageId,
        })),
      },
    },
    include: { steps: { orderBy: { position: 'asc' } } },
  });

  return NextResponse.json({ automation }, { status: 201 });
});
