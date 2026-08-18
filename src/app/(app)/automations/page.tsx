import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { sweepDueSteps, TRIGGER_LABELS } from '@/lib/automations';
import { EmptyState, PageHeader, STAGE_LABELS } from '@/components/ui';
import { AutomationMenu } from './automation-menu';
import { AutomationToggle } from './automation-toggle';
import { NewAutomationForm } from './new-automation-form';

export default async function AutomationsPage() {
  const ctx = await requireWorkspace();

  // Catch up anything that came due since the last visit. A cron on
  // /api/automations/tick does the same job when nobody is looking.
  await sweepDueSteps(ctx.workspaceId);

  const automations = await prisma.automation.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { steps: true, runs: true } },
      runs: { where: { status: 'RUNNING' }, select: { id: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Automations"
        subtitle="A trigger, then the steps that follow it — running whether you are here or not."
        action={
          <Link href="/automations/activity" className="btn-ghost">
            Activity
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          {automations.length === 0 ? (
            <EmptyState
              title="No automations yet"
              body="Build one on the right — say, a task for yourself every time a project is created."
            />
          ) : (
            <ul className="space-y-3">
              {automations.map((automation) => {
                const live = automation.runs.length;
                return (
                  <li key={automation.id} className="card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/automations/${automation.id}`}
                          className="font-medium hover:underline"
                        >
                          {automation.name}
                        </Link>
                        <p className="text-muted mt-1 text-sm">
                          {TRIGGER_LABELS[automation.trigger]}
                          {automation.triggerStage
                            ? ` · ${STAGE_LABELS[automation.triggerStage]}`
                            : ''}
                        </p>
                        <p className="text-muted mt-2 text-xs">
                          {automation._count.steps} step
                          {automation._count.steps === 1 ? '' : 's'} · {automation._count.runs} run
                          {automation._count.runs === 1 ? '' : 's'}
                          {live > 0 ? ` · ${live} in flight` : ''}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <AutomationToggle id={automation.id} status={automation.status} />
                        <AutomationMenu id={automation.id} name={automation.name} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside>
          <div className="card p-5">
            <h2 className="font-medium">New automation</h2>
            <NewAutomationForm />
          </div>
        </aside>
      </div>
    </>
  );
}
