import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { balanceCents, formatMoney, paidCents, subtotalCents } from '@/lib/money';
import { EmptyState, StatusBadge, formatDate } from '@/components/ui';
import { PROJECT_TYPES } from '@/lib/stages';
import { TypeSelect } from './type-select';
import { NotesTab } from './notes-tab';
import { FilesTab } from './files-tab';
import { ActivityTab } from './activity-tab';
import { TasksTab } from './tasks-tab';

const TABS = ['Activity', 'Files', 'Tasks', 'Financials', 'Notes', 'Details'] as const;
type Tab = (typeof TABS)[number];

export default async function ProjectDetailPage(props: PageProps<'/projects/[id]'>) {
  const ctx = await requireWorkspace();
  const { id } = await props.params;
  const params = await props.searchParams;
  const tab: Tab =
    TABS.find((name) => name.toLowerCase() === String(params.tab ?? '').toLowerCase()) ??
    'Activity';

  const [project, usedTypes, members] = await Promise.all([
    prisma.project.findFirst({
      where: { id, workspaceId: ctx.workspaceId },
      include: {
        client: true,
        stage: true,
        tasks: { orderBy: [{ done: 'asc' }, { dueAt: 'asc' }] },
        invoices: {
          orderBy: { createdAt: 'desc' },
          include: { items: true, payments: true },
        },
        contacts: { include: { client: true }, orderBy: { createdAt: 'asc' } },
        notes: { orderBy: { updatedAt: 'desc' } },
        messages: { orderBy: { createdAt: 'desc' } },
        files: { orderBy: { createdAt: 'desc' } },
        automationRuns: {
          orderBy: { startedAt: 'desc' },
          include: {
            automation: { select: { name: true } },
            steps: { orderBy: { position: 'asc' } },
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { workspaceId: ctx.workspaceId, type: { not: null } },
      distinct: ['type'],
      select: { type: true },
    }),
    prisma.membership.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);
  if (!project) notFound();

  // The starting list plus anything this workspace has typed in before.
  const types = [
    ...new Set([...PROJECT_TYPES, ...usedTypes.map((row) => row.type as string)]),
  ].sort();

  const invoiced = project.invoices.reduce((sum, invoice) => sum + subtotalCents(invoice.items), 0);
  const paid = project.invoices.reduce((sum, invoice) => sum + paidCents(invoice.payments), 0);

  return (
    <>
      {/* ---- header ---------------------------------------------------- */}
      <div className="bg-brand-ink -mx-8 -mt-8 px-8 pt-6 pb-8 text-white">
        <p className="text-sm text-white/70">
          <Link href="/projects" className="hover:underline">
            Projects
          </Link>
          <span aria-hidden> › </span>
          <span className="font-medium text-white">{project.name}</span>
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{project.name}</h1>
        <div className="mt-2 flex items-center gap-3 text-white/90">
          <TypeSelect id={project.id} type={project.type} types={types} />
          <span className="font-medium">{formatDate(project.eventDate)}</span>
        </div>
      </div>

      {/* ---- who and where it stands ------------------------------------ */}
      <div className="border-line flex flex-wrap items-center justify-between gap-4 border-b py-5">
        <div className="flex items-center gap-3">
          <span className="bg-accent-soft text-accent flex h-10 w-10 items-center justify-center rounded-full font-semibold">
            {project.client.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <Link href={`/clients/${project.client.id}`} className="font-medium hover:underline">
              {project.client.name}
            </Link>
            <p className="text-muted text-sm">{project.client.email ?? 'No email on file'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={`/projects/${project.id}?tab=tasks`}
            className="hover:text-accent flex items-center gap-2 font-medium transition-colors"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3.5" y="5" width="17" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3.5 10h17M12 14v4M10 16h4" />
            </svg>
            Schedule
          </Link>

          <span aria-hidden className="bg-line h-6 w-px" />

          <Link
            href={`/projects/${project.id}?tab=files&attach=1`}
            className="hover:text-accent flex items-center gap-2 font-medium transition-colors"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 12.5 12.2 20a4.5 4.5 0 0 1-6.4-6.4l8-7.8a3 3 0 1 1 4.2 4.3l-8 7.8a1.5 1.5 0 0 1-2.1-2.1l7.4-7.3" />
            </svg>
            Attach
          </Link>

          <Link href={`/invoices/new?project=${project.id}`} className="btn-primary px-5 py-2.5">
            Create file
          </Link>
        </div>
      </div>

      {/* ---- tabs -------------------------------------------------------- */}
      <div className="border-line flex items-center gap-8 border-b">
        {TABS.map((name) => (
          <Link
            key={name}
            href={`/projects/${project.id}?tab=${name.toLowerCase()}`}
            aria-current={name === tab ? 'page' : undefined}
            className={`-mb-px border-b-2 pt-4 pb-3 text-[15px] transition-colors ${
              name === tab
                ? 'border-accent font-semibold'
                : 'text-muted hover:text-foreground border-transparent'
            }`}
          >
            {name}
          </Link>
        ))}
      </div>

      {tab === 'Details' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="card lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">About the project</h2>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <Detail label="Project name" value={project.name} />
              <Detail label="Project type" value={project.type} />
              <Detail label="Stage" value={project.stage?.name} />
              <Detail label="Lead source" value={project.leadSource} />
              <Detail label="Start" value={formatDate(project.eventDate)} />
              <Detail label="End" value={project.endsAt ? formatDate(project.endsAt) : null} />
              <Detail label="Location" value={project.location} />
              <Detail label="Timezone" value={project.timezone} />
            </dl>

            <h3 className="mt-8 mb-2 font-semibold">Description</h3>
            <p className="text-muted whitespace-pre-line">
              {project.description || 'Nothing written down yet.'}
            </p>
          </section>

          <section className="card h-fit">
            <h2 className="mb-4 text-lg font-semibold">Money</h2>
            <dl className="space-y-3 text-sm">
              <Money label="Project value" cents={project.valueCents} currency={ctx.currency} />
              <Money label="Invoiced" cents={invoiced} currency={ctx.currency} />
              <Money label="Paid" cents={paid} currency={ctx.currency} />
              <Money label="Outstanding" cents={invoiced - paid} currency={ctx.currency} strong />
            </dl>
          </section>
        </div>
      )}

      {tab === 'Files' && (
        <FilesTab
          projectId={project.id}
          files={project.files.map((file) => ({
            id: file.id,
            name: file.name,
            url: file.url,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            uploaded: file.storageKey !== null,
            createdAt: file.createdAt.toISOString(),
          }))}
        />
      )}

      {tab === 'Notes' && (
        <NotesTab
          projectId={project.id}
          notes={project.notes.map((note) => ({
            id: note.id,
            title: note.title,
            body: note.body,
            bodyHtml: note.bodyHtml,
            sharedWithClient: note.sharedWithClient,
            createdAt: note.createdAt.toISOString(),
            updatedAt: note.updatedAt.toISOString(),
          }))}
        />
      )}

      {tab === 'Tasks' && (
        <TasksTab
          projectId={project.id}
          me={ctx.userId}
          members={members.map((member) => ({ id: member.user.id, name: member.user.name }))}
          tasks={project.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            done: task.done,
            dueAt: task.dueAt ? task.dueAt.toISOString() : null,
            dueHasTime: task.dueHasTime,
            assigneeId: task.assigneeId,
          }))}
        />
      )}

      {tab === 'Financials' && (
        <div className="mt-6">
          {project.invoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              body="Invoices raised against this project appear here."
            />
          ) : (
            <ul className="card divide-line divide-y p-0">
              {project.invoices.map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                      {invoice.number}
                    </Link>
                    <p className="text-muted text-sm">
                      Balance{' '}
                      {formatMoney(balanceCents(invoice.items, invoice.payments), ctx.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={invoice.status} />
                    <span className="font-medium tabular-nums">
                      {formatMoney(subtotalCents(invoice.items), ctx.currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'Activity' && (
        <ActivityTab
          projectId={project.id}
          recipients={[project.client, ...project.contacts.map((entry) => entry.client)]
            .filter((person) => person.email)
            .map((person) => ({
              id: person.id,
              name: person.name,
              email: person.email as string,
            }))}
          variables={[
            { token: '{{client_name}}', label: 'Client name', value: project.client.name },
            { token: '{{project_name}}', label: 'Project name', value: project.name },
            { token: '{{project_type}}', label: 'Project type', value: project.type ?? 'project' },
            {
              token: '{{event_date}}',
              label: 'Project date',
              value: formatDate(project.eventDate),
            },
            { token: '{{business_name}}', label: 'Your business', value: ctx.workspaceName },
            { token: '{{my_name}}', label: 'Your name', value: ctx.userName },
          ]}
          signature={ctx.userName}
          messages={project.messages.map((message) => ({
            id: message.id,
            to: message.to,
            subject: message.subject,
            body: message.body,
            bodyHtml: message.bodyHtml,
            attachments: Array.isArray(message.attachments)
              ? (message.attachments as { id: string; name: string }[])
              : [],
            status: message.status,
            detail: message.detail,
            createdAt: message.createdAt.toISOString(),
          }))}
          runs={project.automationRuns.map((run) => ({
            id: run.id,
            name: run.automation.name,
            startedAt: run.startedAt.toISOString(),
            steps: run.steps.map((step) => ({
              id: step.id,
              label: step.subject ?? step.action,
              detail: step.detail ?? step.status,
            })),
          }))}
        />
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-muted text-sm">{label}</dt>
      <dd className="mt-0.5">{value || 'Not set'}</dd>
    </div>
  );
}

function Money({
  label,
  cents,
  currency,
  strong,
}: {
  label: string;
  cents: number;
  currency: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={`tabular-nums ${strong ? 'font-semibold' : ''}`}>
        {formatMoney(cents, currency)}
      </dd>
    </div>
  );
}
