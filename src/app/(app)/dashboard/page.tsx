import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { formatMoney, paidCents, subtotalCents } from '@/lib/money';
import { EmptyState, PageHeader, Stat, StatusBadge, STAGE_LABELS, formatDate } from '@/components/ui';

export default async function DashboardPage() {
  const ctx = await requireWorkspace();

  const [openProjects, invoices, openTasks, clientCount] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId: ctx.workspaceId, stage: { notIn: ['COMPLETED', 'ARCHIVED'] } },
      include: { client: { select: { name: true } } },
      orderBy: [{ eventDate: 'asc' }, { updatedAt: 'desc' }],
      take: 6,
    }),
    prisma.invoice.findMany({
      where: { workspaceId: ctx.workspaceId, status: { not: 'VOID' } },
      include: { items: true, payments: true, client: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.findMany({
      where: { workspaceId: ctx.workspaceId, done: false },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 6,
    }),
    prisma.client.count({ where: { workspaceId: ctx.workspaceId } }),
  ]);

  const collected = invoices.reduce((sum, invoice) => sum + paidCents(invoice.payments), 0);
  const outstanding = invoices
    .filter((invoice) => invoice.status !== 'DRAFT')
    .reduce((sum, invoice) => sum + subtotalCents(invoice.items) - paidCents(invoice.payments), 0);

  return (
    <>
      <PageHeader
        title={`Good to see you, ${ctx.userName.split(' ')[0]}`}
        subtitle="Where your business stands today."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Collected" value={formatMoney(collected, ctx.currency)} hint="All time" />
        <Stat
          label="Outstanding"
          value={formatMoney(outstanding, ctx.currency)}
          hint="Sent, not yet paid"
        />
        <Stat label="Active projects" value={String(openProjects.length)} />
        <Stat label="Clients" value={String(clientCount)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-medium">Projects in flight</h2>
          {openProjects.length === 0 ? (
            <EmptyState
              title="Nothing in the pipeline"
              body="Add a client, then open a project for their enquiry."
            />
          ) : (
            <ul className="card divide-line divide-y">
              {openProjects.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <Link href="/projects" className="truncate font-medium hover:underline">
                      {project.name}
                    </Link>
                    <p className="text-muted truncate text-sm">
                      {project.client.name} · {STAGE_LABELS[project.stage]}
                    </p>
                  </div>
                  <span className="text-muted shrink-0 text-sm">{formatDate(project.eventDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-medium">Recent invoices</h2>
          {invoices.length === 0 ? (
            <EmptyState title="No invoices yet" body="Raise one from the Invoices tab." />
          ) : (
            <ul className="card divide-line divide-y">
              {invoices.slice(0, 6).map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {invoice.number}
                    </Link>
                    <p className="text-muted truncate text-sm">{invoice.client.name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm tabular-nums">
                      {formatMoney(subtotalCents(invoice.items), ctx.currency)}
                    </p>
                    <StatusBadge status={invoice.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-medium">Open tasks</h2>
        {openTasks.length === 0 ? (
          <EmptyState title="All clear" body="Nothing outstanding on your list." />
        ) : (
          <ul className="card divide-line divide-y">
            {openTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="truncate">{task.title}</span>
                <span className="text-muted shrink-0 text-sm">{formatDate(task.dueAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
