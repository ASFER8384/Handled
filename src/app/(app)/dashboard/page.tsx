import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { formatMoneyCompact } from '@/lib/money';
import { InfoHint, formatDate } from '@/components/ui';
import Image from 'next/image';
import { BoltMark, LeadsMark } from '@/components/marks';
import { CreateNew, type CreateItem } from '@/components/create-new';

// Rows without an href open a dialog instead of navigating — the invoice
// builder and the automation editor are too big to live in a modal.
const CREATE: CreateItem[] = [
  {
    key: 'contact',
    label: 'Contact',
    icon: 'M4 20c0-3.3 3.6-5 8-5s8 1.7 8 5M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  },
  { key: 'project', label: 'Project', icon: 'M3 7.5h18v12H3zM8 7.5V5.5h8v2' },
  {
    key: 'invoice',
    label: 'Invoice',
    href: '/invoices/new',
    icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  },
  {
    key: 'task',
    label: 'Task',
    icon: 'M4 7l2.5 2.5L11 5M4 17l2.5 2.5L11 15M14 7.5h6M14 17.5h6',
  },
  {
    key: 'automation',
    label: 'Automation',
    href: '/automations',
    icon: 'M4 7h6l4 10h6M4 17h4M16 7h4',
  },
];

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export default async function DashboardPage() {
  const ctx = await requireWorkspace();

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

  const [leadCount, openTaskCount, activeCount, booked, leads, automations] = await Promise.all([
    // Opportunities are still being won; projects are being delivered.
    prisma.project.count({
      where: { workspaceId: ctx.workspaceId, stage: { group: 'OPPORTUNITY' } },
    }),
    prisma.task.count({ where: { workspaceId: ctx.workspaceId, done: false } }),
    prisma.project.count({
      where: { workspaceId: ctx.workspaceId, stage: { group: 'PROJECT', hidden: false } },
    }),
    prisma.project.aggregate({
      _sum: { valueCents: true },
      where: {
        workspaceId: ctx.workspaceId,
        stage: { group: 'PROJECT' },
        createdAt: { gte: yearStart, lt: yearEnd },
      },
    }),
    prisma.project.findMany({
      where: { workspaceId: ctx.workspaceId, stage: { group: 'OPPORTUNITY' } },
      include: { client: { select: { name: true } }, stage: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.automation.findMany({
      where: { workspaceId: ctx.workspaceId },
      select: { id: true, name: true, status: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ]);

  const stats = [
    {
      label: 'New leads',
      value: String(leadCount),
      hint: 'Projects still on the opportunity side of your pipeline. Nothing is booked yet.',
    },
    {
      label: 'Open tasks',
      value: String(openTaskCount),
      hint: 'Tasks across every project that are not ticked off.',
    },
    {
      label: 'Active projects',
      value: String(activeCount),
      hint: 'Projects that are booked or in progress, so work is owed on them.',
    },
    {
      label: `${now.getFullYear()} bookings`,
      value: formatMoneyCompact(booked._sum?.valueCents ?? 0, ctx.currency),
      hint: `Value of every project booked this calendar year, whether or not it has been invoiced.`,
    },
  ];

  return (
    <>
      <header className="flex items-start gap-4">
        <Image
          src="/head-with-match.png"
          alt=""
          width={84}
          height={84}
          priority
          className="shrink-0"
        />
        <div className="min-w-0">
          <p className="text-muted text-sm">
            {now.toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <h1 className="mt-3 text-[32px] leading-[34px] font-bold tracking-tight">
            {greeting(now.getHours())}, {ctx.userName.split(' ')[0]}
          </h1>
          <p className="text-base leading-[22px]">
            Everything your business owes you, and owes its clients, in one place.
          </p>
        </div>
      </header>

      {/* --- the four numbers ------------------------------------------- */}
      <section className="card mt-6 grid grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`hover:bg-accent-soft/25 min-w-0 px-8 py-7 transition-colors ${
              index > 0 ? 'lg:border-line lg:border-l' : ''
            }`}
          >
            <p className="flex items-center gap-1.5 text-base">
              {stat.label}
              <InfoHint text={stat.hint} />
            </p>
            <p className="mt-2 truncate text-[40px] leading-none font-light tracking-tight tabular-nums">
              {stat.value}
            </p>
          </div>
        ))}
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* --- create new ------------------------------------------------ */}
        <section className="card flex flex-col p-6">
          <h2 className="text-lg font-semibold">Create new</h2>
          <CreateNew items={CREATE} />
        </section>

        {/* --- automations ----------------------------------------------- */}
        <section className="card flex flex-col p-6">
          <h2 className="text-lg font-semibold">Automations</h2>
          {automations.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
              <BoltMark className="h-16 w-16" />
              <p className="mt-6 max-w-xs text-[15px] leading-6">
                Save time by automating tasks, emails and stage changes. Start from scratch, or
                copy one you already run.
              </p>
              <Link
                href="/automations"
                className="text-accent mt-6 inline-flex items-center gap-2 font-semibold hover:underline"
              >
                <span aria-hidden className="text-lg leading-none">
                  +
                </span>
                Start automating
              </Link>
            </div>
          ) : (
            <ul className="divide-line mt-5 divide-y">
              {automations.map((automation) => (
                <li
                  key={automation.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <Link
                    href={`/automations/${automation.id}`}
                    className="min-w-0 truncate text-sm font-medium hover:underline"
                  >
                    {automation.name}
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      automation.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-accent-soft text-muted'
                    }`}
                  >
                    {automation.status === 'ACTIVE' ? 'Active' : 'Off'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* --- leads ------------------------------------------------------ */}
        <section className="card flex flex-col overflow-hidden">
          <div className="border-line flex items-center gap-1.5 border-b px-6 py-5">
            <h2 className="text-lg font-semibold">Leads</h2>
            <InfoHint text="Projects still on the opportunity side of your pipeline — the ones deciding." />
          </div>

          {leads.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
              <LeadsMark className="h-20 w-28" />
              <p className="mt-6 max-w-xs text-[15px] leading-6">
                Nothing waiting on you. New enquiries land here the moment a project is opened.
              </p>
              <Link href="/projects" className="text-accent mt-6 font-semibold hover:underline">
                Add a lead
              </Link>
            </div>
          ) : (
            <ul className="divide-line divide-y">
              {leads.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-3 px-6 py-3.5">
                  <div className="min-w-0">
                    <Link
                      href="/projects"
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {lead.name}
                    </Link>
                    <p className="text-muted truncate text-xs">
                      {lead.client.name} · {lead.stage?.name ?? 'No stage'}
                    </p>
                  </div>
                  <span className="text-muted shrink-0 text-xs">{formatDate(lead.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
