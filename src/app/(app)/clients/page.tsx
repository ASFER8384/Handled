import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { ContactsTable, type ContactRow } from './contacts-table';

export default async function ContactsPage() {
  const ctx = await requireWorkspace();
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
    const projects = [...client.projects, ...client.projectContacts.map((row) => row.project)].filter(
      (entry, index, all) => all.findIndex((other) => other.id === entry.id) === index,
    );

    return {
      id: client.id,
      name: client.name,
      company: client.company,
      email: client.email,
      phone: client.phone,
      lastInteractionAt: client.lastInteractionAt?.toISOString() ?? null,
      tags: client.tags,
      // Where they came from is a fact about their work, so it is read off it.
      source: projects.find((entry) => entry.leadSource)?.leadSource ?? null,
      projects: projects.map((entry) => ({ id: entry.id, name: entry.name })),
    };
  });

  return <ContactsTable contacts={contacts} />;
}
