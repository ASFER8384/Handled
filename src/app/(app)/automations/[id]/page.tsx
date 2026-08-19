import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { hasLiveRun } from '@/lib/automations';
import { PageHeader } from '@/components/ui';
import { AutomationBuilder } from './automation-builder';

export default async function AutomationPage({ params }: PageProps<'/automations/[id]'>) {
  const ctx = await requireWorkspace();
  const { id } = await params;

  const automation = await prisma.automation.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: { steps: { orderBy: { position: 'asc' } } },
  });
  if (!automation) notFound();

  const [locked, stages] = await Promise.all([
    hasLiveRun(automation.id, ctx.workspaceId),
    prisma.pipelineStage.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { position: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title={automation.name}
        subtitle="Steps run top to bottom, each waiting its own delay after the one before."
        action={
          <Link href="/automations" className="btn-ghost">
            All automations
          </Link>
        }
      />

      {locked && (
        <p className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This automation has a run in flight, so it cannot be edited. Cancel the run from{' '}
          <Link href="/automations/activity" className="underline">
            Activity
          </Link>{' '}
          first. Turning it off does not stop a run that has already started.
        </p>
      )}

      <AutomationBuilder
        id={automation.id}
        locked={locked}
        stages={stages}
        initial={{
          name: automation.name,
          trigger: automation.trigger,
          triggerStageId: automation.triggerStageId ?? stages[0]?.id ?? '',
          status: automation.status,
          steps: automation.steps.map((step) => ({
            action: step.action,
            delayMinutes: step.delayMinutes,
            subject: step.subject ?? '',
            body: step.body ?? '',
            targetStageId: step.targetStageId ?? stages[0]?.id ?? '',
          })),
        }}
      />
    </>
  );
}
