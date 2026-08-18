import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { sweepDueSteps } from '@/lib/automations';
import { ACTION_LABELS } from '@/lib/automation-labels';
import { EmptyState, PageHeader, formatDate } from '@/components/ui';
import { CancelRunButton } from './cancel-run-button';

const RUN_TONES: Record<string, string> = {
  RUNNING: 'bg-blue-50 text-blue-800',
  COMPLETED: 'bg-emerald-50 text-emerald-800',
  CANCELLED: 'bg-neutral-100 text-neutral-600',
  FAILED: 'bg-red-50 text-red-800',
};

const RUN_LABELS: Record<string, string> = {
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
};

export default async function ActivityPage() {
  const ctx = await requireWorkspace();
  await sweepDueSteps(ctx.workspaceId);

  const runs = await prisma.automationRun.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { startedAt: 'desc' },
    take: 50,
    include: {
      automation: { select: { id: true, name: true } },
      project: { select: { name: true } },
      client: { select: { name: true } },
      steps: { orderBy: { position: 'asc' } },
    },
  });

  return (
    <>
      <PageHeader
        title="Activity"
        subtitle="Every run across every automation, newest first."
        action={
          <Link href="/automations" className="btn-ghost">
            All automations
          </Link>
        }
      />

      {runs.length === 0 ? (
        <EmptyState
          title="Nothing has run yet"
          body="Activate an automation, then do the thing that sets it off."
        />
      ) : (
        <ul className="space-y-3">
          {runs.map((run) => {
            const subject = run.project?.name ?? run.client?.name ?? 'No linked record';
            return (
              <li key={run.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/automations/${run.automation.id}`}
                      className="font-medium hover:underline"
                    >
                      {run.automation.name}
                    </Link>
                    <p className="text-muted mt-1 text-sm">
                      {subject} · started {formatDate(run.startedAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RUN_TONES[run.status]}`}
                    >
                      {RUN_LABELS[run.status]}
                    </span>
                    {run.status === 'RUNNING' && <CancelRunButton id={run.id} />}
                  </div>
                </div>

                <ol className="border-line mt-4 space-y-2 border-t pt-4">
                  {run.steps.map((runStep) => (
                    <li key={runStep.id} className="flex items-start gap-3 text-sm">
                      <span
                        aria-hidden
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          runStep.status === 'DONE'
                            ? 'bg-emerald-600'
                            : runStep.status === 'FAILED'
                              ? 'bg-red-600'
                              : 'bg-neutral-300'
                        }`}
                      />
                      <div className="min-w-0">
                        <p>{ACTION_LABELS[runStep.action]}</p>
                        <p className="text-muted text-xs">
                          {runStep.detail ??
                            (runStep.status === 'PENDING'
                              ? `Scheduled for ${formatDate(runStep.dueAt)}`
                              : '—')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
