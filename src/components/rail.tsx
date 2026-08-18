'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ICONS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  projects: 'M3 7.5h18v12H3zM8 7.5V5.5h8v2',
  clients: 'M4 20c0-3.3 3.6-5 8-5s8 1.7 8 5M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  invoices: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  tasks: 'M4 7l2.5 2.5L11 5M4 17l2.5 2.5L11 15M14 7.5h6M14 17.5h6',
  automations: 'M4 7h6l4 10h6M4 17h4M16 7h4',
};

/** One icon in the dark rail. Active gets a lit background and a left marker. */
export function RailLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
        active ? 'bg-white/15 text-white' : 'text-white/55 hover:bg-white/10 hover:text-white'
      }`}
    >
      {active && (
        <span aria-hidden className="absolute -left-2.5 h-6 w-1 rounded-r-full bg-white" />
      )}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={ICONS[icon]} />
      </svg>
    </Link>
  );
}
