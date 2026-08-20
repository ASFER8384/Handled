import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { DEFAULT_HIDDEN_CONTACT_COLUMNS } from '@/lib/contact-columns';
import { ViewTabs } from '@/components/view-tabs';
import { ContactsTable, type ContactRow } from './contacts-table';

export default async function ContactsPage(props: PageProps<'/clients'>) {
  const ctx = await requireWorkspace();
  const params = await props.searchParams;
  const requestedView = typeof params.view === 'string' ? params.view : null;

  const [clients, savedViews] = await Promise.all([
    prisma.client.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { name: 'asc' },
      include: {
        projects: { select: { id: true, name: true, leadSource: true } },
        projectContacts: {
          select: { project: { select: { id: true, name: true, leadSource: true } } },
        },
      },
    }),
    prisma.contactView.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { position: 'asc' },
    }),
  ]);

  // A workspace that predates views, or lost its last one, gets one back.
  const views =
    savedViews.length > 0
      ? savedViews
      : [
          await prisma.contactView.create({
            data: {
              workspaceId: ctx.workspaceId,
              name: 'Main view',
              position: 0,
              isDefault: true,
              hiddenColumns: DEFAULT_HIDDEN_CONTACT_COLUMNS,
            },
          }),
        ];

  const active = views.find((item) => item.id === requestedView) ?? views[0];
  // Filters are stored as JSON, so they are read back defensively.
  const filters = Array.isArray(active.filters)
    ? (active.filters as { field?: unknown; value?: unknown }[])
        .filter((entry) => typeof entry?.field === 'string' && typeof entry?.value === 'string')
        .map((entry) => ({ field: entry.field as string, value: entry.value as string }))
    : [];

  const contacts: ContactRow[] = clients.map((client) => {
    // Being a project's client and being added to one both count, and the
    // same project must not appear twice.
    const projects = [
      // Their own projects first: being the client is the stronger tie, and
      // it is the one that cannot simply be undone.
      ...client.projects.map((entry) => ({ ...entry, role: 'client' as const })),
      ...client.projectContacts.map((row) => ({ ...row.project, role: 'contact' as const })),
    ].filter((entry, index, all) => all.findIndex((other) => other.id === entry.id) === index);

    return {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      lastInteractionAt: client.lastInteractionAt?.toISOString() ?? null,
      website: client.website,
      jobTitle: client.jobTitle,
      address: client.address,
      notes: client.notes,
      tags: client.tags,
      projects: projects.map((entry) => ({ id: entry.id, name: entry.name, role: entry.role })),
    };
  });

  // A filter can only offer what the contacts actually hold.
  const unique = (values: string[]) => [...new Set(values)].sort();
  const filterFields = [
    {
      key: 'project',
      label: 'Project',
      values: unique(contacts.flatMap((contact) => contact.projects.map((entry) => entry.name))),
    },
    { key: 'tag', label: 'Tag', values: unique(contacts.flatMap((contact) => contact.tags)) },
  ];

  return (
    <ContactsTable
      // A different view is a different set of settings, so the table starts
      // again rather than carrying the last one's state across.
      key={active.id}
      contacts={contacts}
      filterFields={filterFields}
      // The tabs are handed in rather than drawn here, so the header, the
      // tabs and the toolbar under them stay one piece of layout.
      tabs={
        <ViewTabs
          views={views.map((item) => ({
            id: item.id,
            name: item.name,
            isDefault: item.isDefault,
          }))}
          activeId={active.id}
          basePath="/clients"
          endpoint="/api/contact-views"
        />
      }
      view={{
        id: active.id,
        hiddenColumns: active.hiddenColumns,
        sortField: active.sortField,
        sortDir: active.sortDir === 'desc' ? 'desc' : 'asc',
        filters,
      }}
    />
  );
}
