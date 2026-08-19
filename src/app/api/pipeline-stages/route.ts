import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, parseBody } from '@/lib/api';
import { pipelineStagesSchema } from '@/lib/validation';

export const GET = handler(async (ctx) => {
  const stages = await prisma.pipelineStage.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { position: 'asc' },
  });
  return NextResponse.json({ stages });
});

/**
 * The whole pipeline is saved at once: order is the array order, and anything
 * missing from it is deleted. Projects sitting in a deleted stage survive —
 * their stageId goes null and they show up as unstaged rather than vanishing.
 */
export const PUT = handler(async (ctx, request: Request) => {
  const { stages } = await parseBody(request, pipelineStagesSchema);

  const existing = await prisma.pipelineStage.findMany({
    where: { workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  const keep = new Set(stages.map((stage) => stage.id).filter(Boolean));
  const remove = existing.filter((stage) => !keep.has(stage.id)).map((stage) => stage.id);

  const saved = await prisma.$transaction(async (tx) => {
    if (remove.length > 0) {
      await tx.pipelineStage.deleteMany({
        where: { id: { in: remove }, workspaceId: ctx.workspaceId },
      });
    }

    for (const [position, stage] of stages.entries()) {
      if (stage.id) {
        // updateMany, so a stage id from another workspace matches nothing.
        await tx.pipelineStage.updateMany({
          where: { id: stage.id, workspaceId: ctx.workspaceId },
          data: { name: stage.name, group: stage.group, hidden: stage.hidden, position },
        });
      } else {
        await tx.pipelineStage.create({
          data: {
            workspaceId: ctx.workspaceId,
            name: stage.name,
            group: stage.group,
            hidden: stage.hidden,
            position,
          },
        });
      }
    }

    return tx.pipelineStage.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { position: 'asc' },
    });
  });

  return NextResponse.json({ stages: saved });
});
