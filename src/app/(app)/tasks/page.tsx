import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { CreateTaskButton } from '@/components/create-new';
import { TaskTable } from '@/components/task-table';

export default async function TasksPage() {
  const ctx = await requireWorkspace();

  const [tasks, projects] = await Promise.all([
    prisma.task.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: [{ done: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.project.findMany({
      where: { workspaceId: ctx.workspaceId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Task management</h1>
        <CreateTaskButton />
      </div>

      <TaskTable
        projects={projects}
        empty={{
          title: 'Nothing on the list',
          body: 'Tasks you add here, or inside a project, all end up on this page.',
        }}
        tasks={tasks.map((task) => ({
          id: task.id,
          title: task.title,
          done: task.done,
          dueAt: task.dueAt ? task.dueAt.toISOString() : null,
          dueHasTime: task.dueHasTime,
          projectId: task.projectId,
        }))}
      />
    </>
  );
}
