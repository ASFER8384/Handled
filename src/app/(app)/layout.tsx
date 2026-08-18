import Link from 'next/link';
import { requireWorkspace } from '@/lib/session';
import { NavLink } from '@/components/nav-link';
import { SignOutButton } from '@/components/sign-out-button';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/projects', label: 'Projects' },
  { href: '/clients', label: 'Clients' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/tasks', label: 'Tasks' },
] as const;

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const ctx = await requireWorkspace();

  return (
    <div className="flex flex-1">
      <aside className="border-line bg-surface hidden w-60 shrink-0 border-r p-5 md:block">
        <Link href="/dashboard" className="text-sm font-semibold tracking-widest text-accent uppercase">
          Handled
        </Link>
        <p className="text-muted mt-1 truncate text-sm">{ctx.workspaceName}</p>

        <nav className="mt-8 space-y-1">
          {NAV.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-line bg-surface flex items-center justify-between border-b px-6 py-3">
          <nav className="flex gap-3 md:hidden">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-muted text-sm">
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="text-muted hidden text-sm md:inline">{ctx.userEmail}</span>
          <SignOutButton />
        </header>

        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
