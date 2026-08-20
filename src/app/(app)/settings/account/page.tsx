import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { AccountForm } from './account-form';
import { PasswordForm } from './password-form';

/** Two, both real: who you are, and what keeps other people out. */
const SECTIONS = [
  { key: 'info', label: 'Account info' },
  { key: 'security', label: 'Security' },
];

export default async function AccountSettingsPage(props: PageProps<'/settings/account'>) {
  const ctx = await requireWorkspace();
  const params = await props.searchParams;
  const asked = typeof params.section === 'string' ? params.section : 'info';
  const section = SECTIONS.find((entry) => entry.key === asked) ?? SECTIONS[0];

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: {
      name: true,
      email: true,
      jobTitle: true,
      phoneCode: true,
      phone: true,
      address: true,
    },
  });

  return (
    <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav className="space-y-0.5">
        {SECTIONS.map((entry) => (
          <Link
            key={entry.key}
            href={`/settings/account?section=${entry.key}`}
            aria-current={entry.key === section.key ? 'page' : undefined}
            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
              entry.key === section.key
                ? 'bg-accent-soft/60 font-medium'
                : 'text-muted hover:bg-accent-soft/30'
            }`}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      <div className="min-w-0">
        {section.key === 'info' ? (
          <AccountForm
            email={user?.email ?? ctx.userEmail}
            phoneCode={user?.phoneCode ?? ''}
            values={{
              name: user?.name ?? ctx.userName,
              jobTitle: user?.jobTitle ?? '',
              phone: user?.phone ?? '',
              address: user?.address ?? '',
            }}
          />
        ) : (
          <PasswordForm />
        )}
      </div>
    </div>
  );
}
