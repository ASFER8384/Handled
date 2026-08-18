import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import { projectStages } from '@/lib/validation';
import { EmptyState, PageHeader, STAGE_LABELS, formatDate } from '@/components/ui';
import { ProjectForm } from './project-form';
import { StageSelect } from './stage-select';

export default async function ProjectsPage() {
  const ctx = await requireWorkspace();

  const [projects, clients] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ eventDate: 'asc' }, { updatedAt: 'desc' }],
    }),
    prisma.client.findMany({
      where: { workspaceId: ctx.workspaceId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Archived work stays out of the board; it is reachable through the client.
  const board = projectStages.filter((stage) => stage !== 'ARCHIVED');

  return (
    <>
      <PageHeader title="Projects" subtitle="Your pipeline, enquiry through delivery." />

      {clients.length === 0 ? (
        <EmptyState
          title="Add a client first"
          body="Projects belong to a client, so start there and come back."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-6">
            {board.map((stage) => {
              const inStage = projects.filter((project) => project.stage === stage);
              return (
                <section key={stage}>
                  <h2 className="text-muted mb-2 text-sm font-medium tracking-wide uppercase">
                    {STAGE_LABELS[stage]} · {inStage.length}
                  </h2>
                  {inStage.length === 0 ? (
                    <p className="border-line text-muted rounded-xl border border-dashed px-5 py-4 text-sm">
                      Nothing here.
                    </p>
                  ) : (
                    <ul className="card divide-line divide-y">
                      {inStage.map((project) => (
                        <li
                          key={project.id}
                          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{project.name}</p>
                            <p className="text-muted truncate text-sm">
                              {project.client.name} · {formatDate(project.eventDate)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm tabular-nums">
                              {formatMoney(project.valueCents, ctx.currency)}
                            </span>
                            <StageSelect id={project.id} stage={project.stage} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          <aside>
            <div className="card p-5">
              <h2 className="font-medium">New project</h2>
              <ProjectForm clients={clients} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
