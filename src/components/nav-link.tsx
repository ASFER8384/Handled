'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

function useActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Top-bar item: underlined when active, the way app chrome usually reads. */
export function TopNavLink({ href, children }: { href: string; children: ReactNode }) {
  const active = useActive(href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative shrink-0 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors ${
        active
          ? 'text-foreground font-medium'
          : 'text-muted hover:text-foreground hover:bg-accent-soft/60'
      }`}
    >
      {children}
      {active && (
        <span
          aria-hidden
          className="bg-accent absolute inset-x-3 -bottom-[11px] h-0.5 rounded-full"
        />
      )}
    </Link>
  );
}

/** Kept for any vertical nav that still wants it. */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const active = useActive(href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:bg-accent-soft/60'
      }`}
    >
      {children}
    </Link>
  );
}
