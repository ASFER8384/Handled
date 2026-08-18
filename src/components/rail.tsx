'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { signOut } from '@/lib/auth-client';

const ICONS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  projects: 'M3 7.5h18v12H3zM8 7.5V5.5h8v2',
  clients: 'M4 20c0-3.3 3.6-5 8-5s8 1.7 8 5M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  invoices: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  tasks: 'M4 7l2.5 2.5L11 5M4 17l2.5 2.5L11 15M14 7.5h6M14 17.5h6',
  automations: 'M4 7h6l4 10h6M4 17h4M16 7h4',
};

export type RailItem = { href: string; label: string; icon: string };

/**
 * Collapsed to an icon rail, opening into a labelled drawer on hover.
 *
 * Width animates on the aside itself rather than overlaying the page, so the
 * content reflows with it instead of being covered.
 */
export function Rail({
  items,
  initials,
  name,
  workspace,
}: {
  items: RailItem[];
  initials: string;
  name: string;
  workspace: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside
      data-open={menuOpen || undefined}
      className="group bg-brand-ink sticky top-0 z-40 flex h-screen w-16 shrink-0 flex-col py-3 transition-[width] duration-200 ease-out hover:w-60 data-open:w-60"
    >
      {/* Labels are clipped here, not on the aside — the flyout has to escape. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-11 w-full items-center gap-3 pl-[22px]">
        <span className="w-5 shrink-0 text-center font-mono text-[10px] leading-[10px] font-bold text-white">
          HD
          <br />
          LD
        </span>
        <span className="text-sm font-semibold tracking-wide whitespace-nowrap text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-data-open:opacity-100">
          Handled
        </span>
      </div>

      <nav className="mt-4 flex flex-col">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex h-11 w-full items-center gap-3 pl-[22px] transition-colors ${
                active ? 'bg-white/15 text-white' : 'text-white/55 hover:bg-white/10 hover:text-white'
              }`}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 h-6 w-[3px] rounded-r-full bg-white"
                />
              )}
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={ICONS[item.icon]} />
              </svg>
              <span className="text-sm whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-data-open:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      </div>

      <div
        className="relative"
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => setMenuOpen(false)}
      >
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={`flex h-11 w-full items-center gap-2 pl-[18px] transition-colors ${
            menuOpen ? 'bg-white/15 text-white' : 'text-white/55 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span className="bg-accent flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-white">
            {initials}
          </span>
          <span className="text-sm whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-data-open:opacity-100">
            Settings
          </span>
        </button>

        {menuOpen && (
          <>
            {/* The padding is the bridge: it keeps the gap hoverable, so the
                pointer crosses from row to panel without closing the menu. */}
            <div className="absolute bottom-0 left-full z-50 pl-1">
            <div
              role="menu"
              className="bg-brand-ink w-60 overflow-hidden rounded-lg border border-white/10 shadow-2xl"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="bg-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white">
                  {initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{workspace}</span>
                  <span className="block truncate text-xs text-white/60">{name}</span>
                </span>
              </div>

              <div className="h-px bg-white/10" />

              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONS.clients} />
                </svg>
                My account
              </Link>

              <Link
                href="/settings#company"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20V6l6-3v17M4 20h16V10l-6-2M8 9h.01M8 13h.01M8 17h.01" />
                </svg>
                Company settings
              </Link>

              <div className="h-px bg-white/10" />

              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  setMenuOpen(false);
                  await signOut();
                  router.push('/sign-in');
                  router.refresh();
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white"
              >
                Log out
              </button>
            </div>
            </div>
          </>
        )}
      </div>

    </aside>
  );
}
