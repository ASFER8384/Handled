'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

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
