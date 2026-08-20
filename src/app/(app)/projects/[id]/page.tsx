import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { sweepDueEmails } from '@/lib/messages';
import { balanceCents, formatMoney, paidCents, totalCents } from '@/lib/money';
import { EmptyState, formatDate } from '@/components/ui';
import { LEAD_SOURCES, PROJECT_TYPES } from '@/lib/stages';
import { TypeSelect } from './type-select';
import { ProjectInvoices } from './project-invoices';
import { MoneySummary } from './money-summary';
import { companyBrand } from '@/lib/company';
import { invoiceEmailHtml, invoiceEmailSubject } from '@/lib/invoice-email';
import { NotesTab } from './notes-tab';
import { FilesTab } from './files-tab';
import { ActivityTab } from './activity-tab';
import { AddPersonButton } from './add-person-button';
import { TaskTable } from '@/components/task-table';
import { AboutPanel } from './about-panel';
import { DetailsTab } from './details-tab';
import { CreateFileButton } from './create-file-button';
import { TabLinks } from './tab-links';

const TABS = ['Email', 'Files', 'Tasks', 'Financials', 'Notes', 'Details'] as const;
type Tab = (typeof TABS)[number];

export default async function ProjectDetailPage(props: PageProps<'/projects/[id]'>) {
  const ctx = await requireWorkspace();
  // Scheduled mail catches up here, the same way automations do.
  await sweepDueEmails(ctx.workspaceId);
  const { id } = await props.params;
  const params = await props.searchParams;
  const tab: Tab =
    TABS.find((name) => name.toLowerCase() === String(params.tab ?? '').toLowerCase()) ?? 'Email';

  const [project, usedTypes, members, stages, usedSources, customFields, contacts] =
    await Promise.all([
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
          dates: { orderBy: { position: 'asc' } },
          fieldValues: true,
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
      prisma.pipelineStage.findMany({
        where: { workspaceId: ctx.workspaceId, hidden: false },
        orderBy: { position: 'asc' },
        select: { id: true, name: true },
      }),
      prisma.project.findMany({
        where: { workspaceId: ctx.workspaceId, leadSource: { not: null } },
        distinct: ['leadSource'],
        select: { leadSource: true },
      }),
      prisma.customField.findMany({
        where: { workspaceId: ctx.workspaceId },
        orderBy: { position: 'asc' },
      }),
      // Everyone in the address book, so the project can be handed to any of them.
      prisma.client.findMany({
        where: { workspaceId: ctx.workspaceId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, email: true },
      }),
    ]);
  if (!project) notFound();

  // The starting list plus anything this workspace has typed in before.
  const sources = [
    ...new Set([...LEAD_SOURCES, ...usedSources.map((row) => row.leadSource as string)]),
  ].sort();

  const types = [
    ...new Set([...PROJECT_TYPES, ...usedTypes.map((row) => row.type as string)]),
  ].sort();

  // Opened from an invoice: the Email tab starts with a covering note for it
  // already written. Anything else in the parameter is simply ignored.
  const asked = String(params.compose ?? '');
  const composing = asked.startsWith('invoice:')
    ? project.invoices.find((invoice) => invoice.id === asked.slice('invoice:'.length))
    : undefined;

  const brand = composing ? await companyBrand(ctx.workspaceId, ctx.userEmail) : null;
  const prefill =
    composing && brand
      ? {
          to: project.client.email,
          invoiceId: composing.id,
          subject: invoiceEmailSubject({
            number: composing.number,
            business: brand.name,
            clientName: project.client.name,
            balanceCents: balanceCents(composing.items, composing.payments, composing.taxRateBp),
            currency: ctx.currency,
            dueAt: composing.dueAt,
            pay: brand.pay,
            payNotes: brand.payNotes,
          }),
          bodyHtml: invoiceEmailHtml({
            number: composing.number,
            business: brand.name,
            clientName: project.client.name,
            balanceCents: balanceCents(composing.items, composing.payments, composing.taxRateBp),
            currency: ctx.currency,
            dueAt: composing.dueAt,
            pay: brand.pay,
            payNotes: brand.payNotes,
          }),
        }
      : null;

  const invoiced = project.invoices.reduce(
    (sum, invoice) => sum + totalCents(invoice.items, invoice.taxRateBp),
    0,
  );
  const paid = project.invoices.reduce((sum, invoice) => sum + paidCents(invoice.payments), 0);

  return (
    <>
      {/* ---- header ---------------------------------------------------- */}
      <div className="border-line -mx-8 -mt-8 flex flex-wrap items-end justify-between gap-6 border-b px-8 pt-6 pb-8">
        <div>
          <p className="text-muted text-sm">
            <Link href="/projects" className="hover:underline">
              Projects
            </Link>
            <span aria-hidden> › </span>
            <span className="text-foreground font-medium">{project.name}</span>
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight">{project.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <TypeSelect id={project.id} type={project.type} types={types} />
            <span className="font-medium">{formatDate(project.eventDate)}</span>
          </div>
        </div>

        {/* Where the project stands, without leaving the page it is on. */}
        <dl className="divide-line flex items-center divide-x">
          <Stat label="Stage" value={project.stage?.name ?? 'Not set'} />
          <Stat
            label="Outstanding"
            value={formatMoney(invoiced - paid, ctx.currency)}
            strong={invoiced - paid > 0}
          />
          <Stat
            label="Open tasks"
            value={String(project.tasks.filter((task) => !task.done).length)}
          />
        </dl>
      </div>

      {/* ---- who it is for, and the tabs: both stay put while the tab's own
              content scrolls under them --------------------------------- */}
      <div data-tab-header className="bg-background sticky top-14 z-20 -mx-8 px-8">
        <div className="border-line flex flex-wrap items-center justify-between gap-4 border-b py-5">
          {/* Everyone on the project. They are all the same kind of thing —
              people this job involves — so they all read the same way. */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {[project.client, ...project.contacts.map((entry) => entry.client)].map((person) => (
              <div key={person.id} className="flex items-center gap-3">
                <span className="bg-accent-soft text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold">
                  {person.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/clients/${person.id}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {person.name}
                  </Link>
                  <p className="text-muted truncate text-sm">
                    {person.email ?? 'No email on file'}
                  </p>
                </div>
              </div>
            ))}

            <AddPersonButton
              projectId={project.id}
              exclude={[project.client.id, ...project.contacts.map((entry) => entry.clientId)]}
            />
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

            <CreateFileButton projectId={project.id} />
          </div>
        </div>

        {/* ---- tabs -------------------------------------------------------- */}
        <TabLinks projectId={project.id} tabs={TABS} current={tab} />
      </div>

      {/* ---- the tab, with the project's own details always beside it ---- */}
      <div
        data-tab-content
        className="grid min-h-[calc(100vh-11rem)] gap-8 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="min-w-0">
          {tab === 'Details' && (
            <DetailsTab
              project={{
                id: project.id,
                name: project.name,
                type: project.type,
                description: project.description,
                location: project.location,
                timezone: project.timezone,
                dateTitle: project.dateTitle,
                availability: project.availability,
                eventDate: project.eventDate ? project.eventDate.toISOString() : null,
                endsAt: project.endsAt ? project.endsAt.toISOString() : null,
                allDay: project.allDay,
              }}
              types={types}
              dates={project.dates.map((date) => ({
                id: date.id,
                title: date.title,
                startAt: date.startAt ? date.startAt.toISOString() : null,
                endAt: date.endAt ? date.endAt.toISOString() : null,
                allDay: date.allDay,
                availability: date.availability,
                location: date.location,
              }))}
              fields={customFields.map((field) => ({
                id: field.id,
                name: field.name,
                type: field.type,
                options: field.options,
                visibleToClient: field.visibleToClient,
              }))}
              values={project.fieldValues.map((entry) => ({
                fieldId: entry.fieldId,
                value: entry.value,
              }))}
            />
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
            <TaskTable
              projectId={project.id}
              tasks={project.tasks.map((task) => ({
                id: task.id,
                title: task.title,
                done: task.done,
                dueAt: task.dueAt ? task.dueAt.toISOString() : null,
                dueHasTime: task.dueHasTime,
              }))}
            />
          )}

          {tab === 'Financials' && (
            <div className="mt-6">
              <div className="mb-6">
                <MoneySummary
                  valueCents={project.valueCents}
                  invoicedCents={invoiced}
                  paidCents={paid}
                  currency={ctx.currency}
                />
              </div>

              {project.invoices.length === 0 ? (
                <EmptyState
                  title="No invoices yet"
                  body="Invoices raised against this project appear here."
                />
              ) : (
                <ProjectInvoices
                  currency={ctx.currency}
                  invoices={project.invoices.map((invoice) => ({
                    id: invoice.id,
                    number: invoice.number,
                    status: invoice.status,
                    issuedAt: invoice.issuedAt ? invoice.issuedAt.toISOString() : null,
                    dueAt: invoice.dueAt ? invoice.dueAt.toISOString() : null,
                    totalCents: totalCents(invoice.items, invoice.taxRateBp),
                    balanceCents: balanceCents(invoice.items, invoice.payments, invoice.taxRateBp),
                    hasPayments: invoice.payments.length > 0,
                  }))}
                />
              )}
            </div>
          )}

          {tab === 'Email' && (
            <ActivityTab
              prefill={prefill}
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
                {
                  token: '{{project_type}}',
                  label: 'Project type',
                  value: project.type ?? 'project',
                },
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
                scheduledFor: message.scheduledFor ? message.scheduledFor.toISOString() : null,
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
        </div>

        <aside className="py-6">
          <AboutPanel
            projectId={project.id}
            clientId={project.clientId}
            contacts={contacts}
            stageId={project.stageId}
            stages={stages}
            leadSource={project.leadSource}
            leadSources={sources}
            tags={project.tags}
          />
        </aside>
      </div>
    </>
  );
}

/** One figure in the hero: quiet label, the number itself carrying the weight. */
function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="px-6 first:pl-0 last:pr-0">
      <dt className="text-muted text-xs tracking-widest uppercase">{label}</dt>
      <dd className={`mt-1.5 text-lg ${strong ? 'text-accent font-semibold' : 'font-medium'}`}>
        {value}
      </dd>
    </div>
  );
}
