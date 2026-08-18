import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { EmptyState, PageHeader } from '@/components/ui';
import { ClientForm } from './client-form';
import { DeleteClientButton } from './delete-client-button';

export default async function ClientsPage() {
  const ctx = await requireWorkspace();
  const clients = await prisma.client.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: { _count: { select: { projects: true, invoices: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <>
      <PageHeader title="Clients" subtitle="Everyone you work with." />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          {clients.length === 0 ? (
            <EmptyState
              title="No clients yet"
              body="Add your first client and their projects and invoices will hang off them."
            />
          ) : (
            <ul className="card divide-line divide-y">
              {clients.map((client) => (
                <li key={client.id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-medium">{client.name}</p>
                    {client.company && <p className="text-muted text-sm">{client.company}</p>}
                    <p className="text-muted mt-1 truncate text-sm">
                      {[client.email, client.phone].filter(Boolean).join(' · ') || 'No contact details'}
                    </p>
                    <p className="text-muted mt-1 text-xs">
                      {client._count.projects} projects · {client._count.invoices} invoices
                    </p>
                  </div>
                  <DeleteClientButton id={client.id} name={client.name} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside>
          <div className="card p-5">
            <h2 className="font-medium">Add a client</h2>
            <ClientForm />
          </div>
        </aside>
      </div>
    </>
  );
}
