import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { formatDate } from '@/components/ui';
import { AccountForm } from './account-form';

export default async function AccountSettingsPage() {
  const ctx = await requireWorkspace();

  const [user, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, email: true, createdAt: true },
    }),
    prisma.membership.findFirst({
      where: { userId: ctx.userId, workspaceId: ctx.workspaceId },
      select: { role: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <AccountForm name={user?.name ?? ctx.userName} email={user?.email ?? ctx.userEmail} />

      <section className="card max-w-xl overflow-hidden">
        <h2 className="border-line border-b px-6 py-4 font-medium">This workspace</h2>
        <dl className="divide-line divide-y">
          {[
            ['Business', ctx.workspaceName],
            ['Your role', (membership?.role ?? 'OWNER').toLowerCase()],
            ['With Handled since', formatDate(user?.createdAt ?? null)],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-wrap justify-between gap-4 px-6 py-3">
              <dt className="text-muted text-sm">{label}</dt>
              <dd className="text-sm font-medium capitalize">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
