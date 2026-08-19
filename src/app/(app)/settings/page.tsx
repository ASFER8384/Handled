import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { PageHeader } from '@/components/ui';

export default async function SettingsPage() {
  const ctx = await requireWorkspace();

  const workspace = await prisma.workspace.findFirst({
    where: { id: ctx.workspaceId },
    select: { slug: true, currency: true, createdAt: true, _count: { select: { memberships: true } } },
  });

  const rows = (entries: [string, string][]) => (
    <dl className="divide-line divide-y">
      {entries.map(([label, value]) => (
        <div key={label} className="flex flex-wrap justify-between gap-4 px-5 py-3">
          <dt className="text-muted text-sm">{label}</dt>
          <dd className="text-sm font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <>
      <PageHeader title="Settings" subtitle="Your account and this workspace." />

      <div className="max-w-2xl space-y-8">
        <section id="account" className="scroll-mt-24">
          <h2 className="mb-3 font-medium">My account</h2>
          <div className="card overflow-hidden">
            {rows([
              ['Name', ctx.userName],
              ['Email', ctx.userEmail],
            ])}
          </div>
          <p className="text-muted mt-2 text-xs">
            Editing these is not built yet. The fields are read only for now.
          </p>
        </section>

        <section id="company" className="scroll-mt-24">
          <h2 className="mb-3 font-medium">Company settings</h2>
          <div className="card overflow-hidden">
            {rows([
              ['Workspace', ctx.workspaceName],
              ['Handle', workspace?.slug ?? '—'],
              ['Currency', workspace?.currency ?? ctx.currency],
              ['Members', String(workspace?._count.memberships ?? 1)],
            ])}
          </div>
          <p className="text-muted mt-2 text-xs">
            Currency is set at workspace creation and drives every total in the app.
          </p>
        </section>
      </div>
    </>
  );
}
