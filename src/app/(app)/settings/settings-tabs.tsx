'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/settings/account', label: 'My account' },
  { href: '/settings/company', label: 'Company' },
];

export function SettingsTabs() {
  const path = usePathname();

  return (
    <nav className="border-line mt-5 flex gap-8 border-b">
      {TABS.map((tab) => {
        const active = path.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px border-b-2 px-1 pb-3 text-[15px] transition-colors ${
              active
                ? 'border-accent font-medium'
                : 'text-muted hover:text-foreground border-transparent'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
