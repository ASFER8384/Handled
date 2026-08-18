import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { formatMoney, paidCents, subtotalCents } from '@/lib/money';
import { EmptyState, Stat, StatusBadge, STAGE_LABELS, formatDate } from '@/components/ui';

export default async function DashboardPage() {
  const ctx = await requireWorkspace();

  const [openProjects, invoices, openTasks, clientCount, projectCount, automations, paymentCount] =
    await Promise.all([
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
      prisma.project.count({ where: { workspaceId: ctx.workspaceId } }),
      prisma.automation.findMany({
        where: { workspaceId: ctx.workspaceId },
        select: { id: true, status: true },
      }),
      prisma.payment.count({ where: { invoice: { workspaceId: ctx.workspaceId } } }),
    ]);

  const collected = invoices.reduce((sum, invoice) => sum + paidCents(invoice.payments), 0);
  const outstanding = invoices
    .filter((invoice) => invoice.status !== 'DRAFT')
    .reduce((sum, invoice) => sum + subtotalCents(invoice.items) - paidCents(invoice.payments), 0);

  // The checklist reads real state rather than storing "dismissed" flags —
  // a step is done because the thing exists, so it can never drift.
  const steps = [
    {
      title: 'Add your first client',
      body: 'Everything else hangs off a client — projects, invoices, payments.',
      href: '/clients',
      minutes: 1,
      done: clientCount > 0,
    },
    {
      title: 'Open a project',
      body: 'Track an enquiry from first hello through to delivery.',
      href: '/projects',
      minutes: 2,
      done: projectCount > 0,
    },
    {
      title: 'Raise an invoice',
      body: 'Line items, totals and due date. Money stays in exact minor units.',
      href: '/invoices/new',
      minutes: 3,
      done: invoices.length > 0,
    },
    {
      title: 'Send it',
      body: 'Sending is what dates an invoice and starts the clock.',
      href: '/invoices',
      minutes: 1,
      done: invoices.some((invoice) => invoice.status !== 'DRAFT'),
    },
    {
      title: 'Record a payment',
      body: 'Status settles itself — part paid and paid are derived, never typed.',
      href: '/invoices',
      minutes: 1,
      done: paymentCount > 0,
    },
    {
      title: 'Build an automation',
      body: 'A trigger, then the steps that follow it on their own clock.',
      href: '/automations',
      minutes: 3,
      done: automations.length > 0,
    },
    {
      title: 'Turn it on',
      body: 'An inactive automation never fires. Flip it to active when ready.',
      href: '/automations',
      minutes: 1,
      done: automations.some((automation) => automation.status === 'ACTIVE'),
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done);
  const setupDone = completed === steps.length;

  return (
    <>
      <h1 className="text-4xl font-semibold tracking-tight">
        Welcome to Handled, {ctx.userName.split(' ')[0]}!
      </h1>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {/* --- setup checklist -------------------------------------- */}
          <section className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">
                {setupDone ? 'You are all set up' : "Let's start step-by-step"}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-muted text-sm whitespace-nowrap">
                  {completed}/{steps.length} completed
                </span>
                <div
                  role="progressbar"
                  aria-valuenow={completed}
                  aria-valuemin={0}
                  aria-valuemax={steps.length}
                  className="bg-accent-soft h-1.5 w-40 overflow-hidden rounded-full"
                >
                  <div
                    className="bg-accent h-full rounded-full transition-all"
                    style={{ width: `${(completed / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <ul className="mt-5 space-y-3">
              {steps.map((step) => (
                <li key={step.title}>
                  <Link
                    href={step.href}
                    className={`border-line hover:border-accent/50 flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                      step.done ? 'bg-accent-soft/30' : 'hover:bg-accent-soft/20'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                        step.done
                          ? 'border-transparent bg-emerald-600 text-white'
                          : 'border-line text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`font-medium ${step.done ? 'text-muted line-through' : ''}`}>
                          {step.title}
                        </span>
                        <span className="bg-accent-soft text-muted rounded px-1.5 py-0.5 text-[11px]">
                          {step.minutes} min
                        </span>
                      </span>
                      <span className="text-muted mt-1 block text-sm">{step.body}</span>
                    </span>
                    <span aria-hidden className="text-muted mt-0.5 shrink-0">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* --- the numbers ------------------------------------------ */}
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

          <div className="grid gap-6 lg:grid-cols-2">
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
                    <li
                      key={project.id}
                      className="flex items-center justify-between gap-4 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <Link href="/projects" className="truncate font-medium hover:underline">
                          {project.name}
                        </Link>
                        <p className="text-muted truncate text-sm">
                          {project.client.name} · {STAGE_LABELS[project.stage]}
                        </p>
                      </div>
                      <span className="text-muted shrink-0 text-sm">
                        {formatDate(project.eventDate)}
                      </span>
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
                    <li
                      key={invoice.id}
                      className="flex items-center justify-between gap-4 px-5 py-3"
                    >
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
        </div>

        {/* --- right column ------------------------------------------- */}
        <aside className="space-y-6">
          <section className="card overflow-hidden">
            <div className="border-line flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-semibold">Up next</h2>
            </div>
            <div className="px-5 py-4">
              {nextStep ? (
                <>
                  <p className="font-medium">{nextStep.title}</p>
                  <p className="text-muted mt-1 text-sm">{nextStep.body}</p>
                  <Link href={nextStep.href} className="btn-primary mt-4 w-full">
                    Do it now
                  </Link>
                </>
              ) : (
                <p className="text-muted text-sm">
                  Setup is complete. Everything below is your live business.
                </p>
              )}
            </div>
          </section>

          <section className="card overflow-hidden">
            <Link
              href="/tasks"
              className="border-line hover:bg-accent-soft/30 flex items-center justify-between border-b px-5 py-4"
            >
              <h2 className="font-semibold">Open tasks</h2>
              <span aria-hidden className="text-muted">
                ›
              </span>
            </Link>
            {openTasks.length === 0 ? (
              <p className="text-muted px-5 py-4 text-sm">Nothing outstanding.</p>
            ) : (
              <ul className="divide-line divide-y">
                {openTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="min-w-0 truncate text-sm">{task.title}</span>
                    <span className="text-muted shrink-0 text-xs">{formatDate(task.dueAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card overflow-hidden">
            <Link
              href="/automations"
              className="border-line hover:bg-accent-soft/30 flex items-center justify-between border-b px-5 py-4"
            >
              <h2 className="font-semibold">Automations</h2>
              <span aria-hidden className="text-muted">
                ›
              </span>
            </Link>
            <p className="text-muted px-5 py-4 text-sm">
              {automations.length === 0
                ? 'None yet — build one and it runs whether you are here or not.'
                : `${automations.filter((a) => a.status === 'ACTIVE').length} active of ${automations.length}.`}
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
