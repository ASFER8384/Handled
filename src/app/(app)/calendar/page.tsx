import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { formatMoneyCompact } from '@/lib/money';
import { dayKey, type CalendarEvent, type LayerKey } from '@/lib/calendar';
import { CalendarView } from './calendar-view';

/** '14:00' as a time field wants it. */
function clock(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export default async function CalendarPage() {
  const ctx = await requireWorkspace();

  const [projects, dates, tasks, invoices, own, pickable, clients] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId: ctx.workspaceId, eventDate: { not: null } },
      select: {
        id: true,
        name: true,
        eventDate: true,
        allDay: true,
        stage: { select: { name: true, group: true, hidden: true } },
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
    prisma.invoice.findMany({
      where: { workspaceId: ctx.workspaceId, dueAt: { not: null }, status: { not: 'DRAFT' } },
      select: {
        id: true,
        number: true,
        dueAt: true,
        client: { select: { name: true } },
        items: { select: { quantity: true, unitPriceCents: true } },
      },
    }),
    // What the calendar owns: things in the diary that are not work yet.
    prisma.event.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { startAt: 'asc' },
    }),
    prisma.project.findMany({
      where: { workspaceId: ctx.workspaceId },
      select: { id: true, name: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.client.findMany({
      where: { workspaceId: ctx.workspaceId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const at = (date: Date) =>
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  /**
   * Which of the three project layers a project is drawn in.
   *
   * Put away counts twice over: a stage taken off the board is plainly put
   * away, and so is a stage called Archived that someone has chosen to keep
   * on the board. Reading only the first would have the board say Archived 1
   * and the calendar say 0 about the same project, which is the kind of
   * disagreement that makes both numbers useless.
   */
  const isArchived = (stage: { name: string; hidden: boolean }) =>
    stage.hidden || stage.name.trim().toLowerCase() === 'archived';

  const projectLayer = (stage: { name: string; group: string; hidden: boolean } | null): LayerKey =>
    stage && isArchived(stage)
      ? 'archived'
      : stage?.group === 'PROJECT'
        ? 'booked'
        : 'tentative';

  const events: CalendarEvent[] = [
    // Work that is on is drawn apart from work that might be: the whole point
    // of looking at the month is telling those two apart at a glance.
    // The day it is on, not the days it takes. A project that runs a fortnight
    // is one booking, and painting it across fourteen cells says the diary is
    // full when what is full is one job.
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      layer: projectLayer(project.stage),
      title: project.name,
      from: dayKey(project.eventDate!),
      to: dayKey(project.eventDate!),
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

    ...own.map((event) => ({
      id: `event-${event.id}`,
      layer: 'meeting' as const,
      title: event.title,
      from: dayKey(event.startAt),
      to: dayKey(event.endAt ?? event.startAt),
      time: event.allDay ? null : at(event.startAt),
      // No page of its own: it opens where it is drawn.
      href: null,
      event: {
        id: event.id,
        title: event.title,
        day: dayKey(event.startAt),
        from: event.allDay ? '09:00' : clock(event.startAt),
        to: event.endAt && !event.allDay ? clock(event.endAt) : '',
        allDay: event.allDay,
        location: event.location ?? '',
        note: event.note ?? '',
        projectId: event.projectId ?? '',
        clientId: event.clientId ?? '',
      },
    })),

    // Money owed lands on the day it is owed. Drafts are left out: nothing has
    // been asked for yet, so there is no date anybody is waiting on.
    ...invoices.map((invoice) => {
      const total = invoice.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPriceCents,
        0,
      );
      return {
        id: `invoice-${invoice.id}`,
        layer: 'payment' as const,
        title: `${formatMoneyCompact(total)} · ${invoice.client.name}`,
        from: dayKey(invoice.dueAt!),
        to: dayKey(invoice.dueAt!),
        time: null,
        href: `/invoices/${invoice.id}`,
      };
    }),
  ];

  return (
    <CalendarView events={events} timezone="Asia/Dubai" projects={pickable} clients={clients} />
  );
}
