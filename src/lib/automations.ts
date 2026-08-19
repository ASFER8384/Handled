import { prisma } from '@/lib/prisma';
import type { AutomationAction, AutomationTrigger } from '@/generated/prisma/client';

/**
 * Automations run on a due-time sweep rather than a background worker: every
 * step is stamped with a `dueAt` when the run starts, and `sweepDueSteps` runs
 * whatever has come due. Call it from a cron ping or a page load — it is safe
 * to call often, and does nothing when nothing is due.
 */

export type TriggerContext = {
  workspaceId: string;
  projectId?: string | null;
  clientId?: string | null;
  /** For PROJECT_STAGE_CHANGED — the stage the project just entered. */
  stageId?: string | null;
};

/**
 * Starts a run of every active automation listening for this trigger.
 * Never throws into the caller: a broken automation must not fail the project
 * or invoice write that set it off.
 */
export async function fireTrigger(
  trigger: AutomationTrigger,
  context: TriggerContext,
): Promise<number> {
  try {
    const automations = await prisma.automation.findMany({
      where: {
        workspaceId: context.workspaceId,
        status: 'ACTIVE',
        trigger,
        ...(trigger === 'PROJECT_STAGE_CHANGED' && context.stageId
          ? { triggerStageId: context.stageId }
          : {}),
      },
      include: {
        steps: {
          orderBy: { position: 'asc' },
          include: { targetStage: { select: { name: true } } },
        },
      },
    });

    let started = 0;
    for (const automation of automations) {
      if (automation.steps.length === 0) continue;

      // Delays accumulate: step three waits for one plus two plus its own.
      let offsetMinutes = 0;
      const now = Date.now();
      const runSteps = automation.steps.map((step) => {
        offsetMinutes += step.delayMinutes;
        return {
          stepId: step.id,
          position: step.position,
          dueAt: new Date(now + offsetMinutes * 60_000),
          // Copied, not referenced — a later edit must not rewrite this run.
          action: step.action,
          subject: step.subject,
          body: step.body,
          targetStageId: step.targetStageId,
          targetStageName: step.targetStage?.name ?? null,
        };
      });

      await prisma.automationRun.create({
        data: {
          workspaceId: context.workspaceId,
          automationId: automation.id,
          projectId: context.projectId ?? null,
          clientId: context.clientId ?? null,
          steps: { create: runSteps },
        },
      });
      started += 1;
    }

    if (started > 0) await sweepDueSteps(context.workspaceId);
    return started;
  } catch (error) {
    console.error('[automations] trigger failed', trigger, error);
    return 0;
  }
}

/**
 * Runs every step that has come due, oldest first. A step only runs once every
 * earlier step in its run is done, so a long delay holds the rest of the line.
 */
export async function sweepDueSteps(workspaceId: string): Promise<number> {
  try {
    const due = await prisma.automationRunStep.findMany({
      where: {
        status: 'PENDING',
        dueAt: { lte: new Date() },
        run: { status: 'RUNNING', workspaceId },
      },
      orderBy: [{ runId: 'asc' }, { position: 'asc' }],
      include: { run: { select: { projectId: true } } },
      take: 200,
    });

    let executed = 0;
    for (const runStep of due) {
      // Checked live, not from a snapshot: an earlier step in this same pass may
      // have just finished, which is exactly what unblocks this one.
      const stillPending = await prisma.automationRunStep.count({
        where: { runId: runStep.runId, position: { lt: runStep.position }, status: 'PENDING' },
      });
      if (stillPending > 0) continue;

      const outcome = await runAction(runStep.action, {
        workspaceId,
        projectId: runStep.run.projectId,
        subject: runStep.subject,
        body: runStep.body,
        targetStageId: runStep.targetStageId,
        targetStageName: runStep.targetStageName,
      });

      await prisma.automationRunStep.update({
        where: { id: runStep.id },
        data: { status: outcome.ok ? 'DONE' : 'FAILED', executedAt: new Date(), detail: outcome.detail },
      });
      executed += 1;

      await settleRun(runStep.runId);
    }
    return executed;
  } catch (error) {
    console.error('[automations] sweep failed', error);
    return 0;
  }
}

type ActionContext = {
  workspaceId: string;
  projectId: string | null;
  subject: string | null;
  body: string | null;
  targetStageId: string | null;
  targetStageName: string | null;
};

async function runAction(
  action: AutomationAction,
  ctx: ActionContext,
): Promise<{ ok: boolean; detail: string }> {
  switch (action) {
    case 'SEND_EMAIL': {
      // There is no delivery yet, so the send is recorded rather than sent.
      // Swap this branch for the provider call and the rest keeps working.
      const subject = ctx.subject?.trim() || 'Untitled email';
      return { ok: true, detail: `Email recorded — “${subject}” (no delivery configured yet)` };
    }

    case 'CREATE_TASK': {
      const title = ctx.subject?.trim();
      if (!title) return { ok: false, detail: 'Step has no task title' };
      await prisma.task.create({
        data: { workspaceId: ctx.workspaceId, projectId: ctx.projectId, title },
      });
      return { ok: true, detail: `Task created — “${title}”` };
    }

    case 'MOVE_STAGE': {
      if (!ctx.targetStageId) return { ok: false, detail: 'Step has no target stage' };
      if (!ctx.projectId) return { ok: false, detail: 'Run is not attached to a project' };
      // Workspace-scoped, so an id from another tenant misses rather than leaks.
      const moved = await prisma.project.updateMany({
        where: { id: ctx.projectId, workspaceId: ctx.workspaceId },
        data: { stageId: ctx.targetStageId },
      });
      if (moved.count === 0) return { ok: false, detail: 'Project no longer exists' };
      return { ok: true, detail: `Stage moved to ${ctx.targetStageName ?? 'another stage'}` };
    }

    default:
      return { ok: false, detail: `Unknown action ${action}` };
  }
}

/** Closes a run once nothing is left pending. */
async function settleRun(runId: string): Promise<void> {
  const remaining = await prisma.automationRunStep.count({
    where: { runId, status: 'PENDING' },
  });
  if (remaining > 0) return;

  const failed = await prisma.automationRunStep.count({ where: { runId, status: 'FAILED' } });
  await prisma.automationRun.updateMany({
    where: { id: runId, status: 'RUNNING' },
    data: { status: failed > 0 ? 'FAILED' : 'COMPLETED', finishedAt: new Date() },
  });
}

/** True when an automation has a run in flight — editing is refused while so. */
export async function hasLiveRun(automationId: string, workspaceId: string): Promise<boolean> {
  const live = await prisma.automationRun.count({
    where: { automationId, workspaceId, status: 'RUNNING' },
  });
  return live > 0;
}


