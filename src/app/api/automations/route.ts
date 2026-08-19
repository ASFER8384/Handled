import { NextResponse } from 'next/server';
import { handler, parseBody } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { automationSchema } from '@/lib/validation';

export const GET = handler(async (ctx) => {
  const automations = await prisma.automation.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      steps: { orderBy: { position: 'asc' } },
      _count: { select: { runs: true } },
    },
  });
  return NextResponse.json({ automations });
});

export const POST = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, automationSchema);

  const automation = await prisma.automation.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: data.name,
      trigger: data.trigger,
      triggerStageId:
        data.trigger === 'PROJECT_STAGE_CHANGED' ? (data.triggerStageId ?? null) : null,
      status: data.status,
      steps: {
        create: data.steps.map((step, index) => ({
          position: index,
          action: step.action,
          delayMinutes: step.delayMinutes,
          subject: step.subject ?? null,
          body: step.body ?? null,
          targetStageId: step.action === 'MOVE_STAGE' ? (step.targetStageId ?? null) : null,
        })),
      },
    },
    include: { steps: { orderBy: { position: 'asc' } } },
  });

  return NextResponse.json({ automation }, { status: 201 });
});
