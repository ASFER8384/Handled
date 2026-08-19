import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { EmptyState, PageHeader, formatDate } from '@/components/ui';
import { TaskForm } from './task-form';
import { TaskRow } from './task-row';

export default async function TasksPage() {
  const ctx = await requireWorkspace();

  const [tasks, projects] = await Promise.all([
    prisma.task.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: { project: { select: { name: true } } },
      orderBy: [{ done: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.project.findMany({
      where: { workspaceId: ctx.workspaceId, stage: { hidden: false } },
      select: { id: true, name: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return (
    <>
      <PageHeader title="Tasks" subtitle="The small things that keep projects moving." />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          {tasks.length === 0 ? (
            <EmptyState title="Nothing on the list" body="Add a task and it shows up here." />
          ) : (
            <ul className="card divide-line divide-y">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  done={task.done}
                  meta={[task.project?.name, task.dueAt ? formatDate(task.dueAt) : null]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ))}
            </ul>
          )}
        </div>

        <aside>
          <div className="card p-5">
            <h2 className="font-medium">Add a task</h2>
            <TaskForm projects={projects} />
          </div>
        </aside>
      </div>
    </>
  );
}
