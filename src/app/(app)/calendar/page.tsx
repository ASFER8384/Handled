import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { formatMoneyCompact } from '@/lib/money';
import { dayKey, type CalendarEvent, type LayerKey } from '@/lib/calendar';
import { CalendarView } from './calendar-view';

export default async function CalendarPage() {
  const ctx = await requireWorkspace();

  const [projects, dates, tasks, invoices] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId: ctx.workspaceId, eventDate: { not: null } },
      select: {
        id: true,
        name: true,
        eventDate: true,
        endsAt: true,
        allDay: true,
        stage: { select: { group: true, hidden: true } },
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
  ]);

  const at = (date: Date) =>
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // A project sitting in a hidden stage is put away rather than deleted, so it
  // is still drawn — just in the layer people turn off first.
  const projectLayer = (stage: { group: string; hidden: boolean } | null): LayerKey =>
    stage?.hidden ? 'archived' : stage?.group === 'PROJECT' ? 'booked' : 'tentative';

  const events: CalendarEvent[] = [
    // Work that is on is drawn apart from work that might be: the whole point
    // of looking at the month is telling those two apart at a glance.
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      layer: projectLayer(project.stage),
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

  return <CalendarView events={events} timezone="Asia/Dubai" />;
}
