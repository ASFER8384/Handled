import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { ContactsTable, type ContactRow } from './contacts-table';

export default async function ContactsPage() {
  const ctx = await requireWorkspace();
  // The table's own settings live on the workspace, so it opens the way it
  // was left rather than the way this browser remembers it.
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: ctx.workspaceId },
    select: { contactHiddenColumns: true, contactSortField: true, contactSortDir: true },
  });
  const clients = await prisma.client.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { name: 'asc' },
    include: {
      projects: { select: { id: true, name: true, leadSource: true } },
      projectContacts: {
        select: { project: { select: { id: true, name: true, leadSource: true } } },
      },
    },
  });

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

  return (
    <ContactsTable
      contacts={contacts}
      hiddenColumns={workspace.contactHiddenColumns}
      sort={{
        field: workspace.contactSortField,
        dir: workspace.contactSortDir === 'desc' ? 'desc' : 'asc',
      }}
    />
  );
}
