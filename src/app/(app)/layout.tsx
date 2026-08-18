import Link from 'next/link';
import { requireWorkspace } from '@/lib/session';
import { RailLink } from '@/components/rail';
import { AccountMenu } from '@/components/account-menu';

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
      {/* --- dark icon rail ------------------------------------------- */}
      <aside className="bg-brand-ink sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center gap-2 py-4">
        <Link
          href="/dashboard"
          aria-label="Handled home"
          className="mb-4 flex h-9 w-9 items-center justify-center rounded bg-white/10 font-mono text-[10px] leading-3 font-bold text-white"
        >
          HD
          <br />
          LD
        </Link>

        <nav className="flex flex-col items-center gap-1">
          {RAIL.map((item) => (
            <RailLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>

        <div className="mt-auto">
          <span
            title={ctx.userName}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-xs font-semibold text-white"
          >
            {initials}
          </span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* --- top bar ------------------------------------------------- */}
        <header className="border-line bg-surface sticky top-0 z-30 flex items-center gap-4 border-b px-6 py-2.5">
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
            <span className="text-muted hidden text-sm sm:inline">{ctx.workspaceName}</span>
            <Link href="/invoices/new" className="btn-primary px-3 py-1.5 text-sm">
              + New
            </Link>
            <AccountMenu
              initials={initials}
              name={ctx.userName}
              email={ctx.userEmail}
              workspace={ctx.workspaceName}
            />
          </div>
        </header>

        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
