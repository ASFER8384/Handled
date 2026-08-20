import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { dayKey, type CalendarEvent } from '@/lib/calendar';
import { CalendarView } from './calendar-view';

export default async function CalendarPage() {
  const ctx = await requireWorkspace();

  const [projects, dates, tasks] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId: ctx.workspaceId, eventDate: { not: null } },
      select: {
        id: true,
        name: true,
        eventDate: true,
        endsAt: true,
        allDay: true,
        stage: { select: { group: true } },
      },
    }),
    prisma.projectDate.findMany({
      where: { project: { workspaceId: ctx.workspaceId }, startAt: { not: null } },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        allDay: true,
        projectId: true,
      },
    }),
    prisma.task.findMany({
      where: { workspaceId: ctx.workspaceId, dueAt: { not: null } },
      select: { id: true, title: true, dueAt: true, dueHasTime: true, done: true, projectId: true },
    }),
  ]);

  const at = (date: Date) =>
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const events: CalendarEvent[] = [
    // Work that is on is drawn apart from work that might be: the whole point
    // of looking at the month is telling those two apart at a glance.
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      layer: project.stage?.group === 'PROJECT' ? ('booked' as const) : ('tentative' as const),
      title: project.name,
      from: dayKey(project.eventDate!),
      to: dayKey(project.endsAt ?? project.eventDate!),
      time: project.allDay ? null : at(project.eventDate!),
      href: `/projects/${project.id}`,
    })),

    ...dates.map((date) => ({
      id: `date-${date.id}`,
      layer: 'date' as const,
      title: date.title,
      from: dayKey(date.startAt!),
      to: dayKey(date.endAt ?? date.startAt!),
      time: date.allDay ? null : at(date.startAt!),
      href: `/projects/${date.projectId}?tab=details`,
    })),

    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      layer: 'task' as const,
      title: task.title,
      from: dayKey(task.dueAt!),
      to: dayKey(task.dueAt!),
      time: task.dueHasTime ? at(task.dueAt!) : null,
      href: task.projectId ? `/projects/${task.projectId}?tab=tasks` : '/tasks',
      done: task.done,
    })),
  ];

  return <CalendarView events={events} timezone="Asia/Dubai" />;
}
