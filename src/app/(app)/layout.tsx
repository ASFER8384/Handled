import Link from 'next/link';
import { requireWorkspace } from '@/lib/session';
import { Rail } from '@/components/rail';

// Declared here, not in rail.tsx: a 'use client' module only exports client
// references, so a plain array imported from one is not an array on the server.
const RAIL = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/projects', label: 'Projects', icon: 'projects' },
  { href: '/clients', label: 'Clients', icon: 'clients' },
  { href: '/invoices', label: 'Invoices', icon: 'invoices' },
  { href: '/tasks', label: 'Tasks', icon: 'tasks' },
  { href: '/automations', label: 'Automations', icon: 'automations' },
] as const;

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const ctx = await requireWorkspace();

  const initials =
    ctx.userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || ctx.userEmail[0]?.toUpperCase();

  return (
    <div className="flex min-h-full flex-1">
      <Rail
        items={[...RAIL]}
        initials={initials}
        name={ctx.userName}
        workspace={ctx.workspaceName}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* --- top bar ------------------------------------------------- */}
        <header className="border-line bg-surface sticky top-0 z-30 flex h-14 items-center gap-4 border-b px-6">
          <div className="bg-accent-soft/60 text-muted flex items-center gap-2 rounded-full px-4 py-1.5 text-sm">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="6" />
              <path d="m20 20-4.5-4.5" strokeLinecap="round" />
            </svg>
            Search
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/invoices/new"
              className="text-accent bg-accent/12 hover:bg-accent/20 inline-flex h-[26px] items-center justify-center gap-1 rounded-[3px] px-2 pt-px text-sm font-semibold transition-colors duration-300"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              New
            </Link>
          </div>
        </header>

        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
