'use client';

import { useState } from 'react';

const TABS = [
  'Project pipeline',
  'Lead capture',
  'Client Management',
  'Online payments',
  'Automations',
];

/** The underlined tab strip under the hero. Cosmetic on the real site too. */
export function HeroTabs() {
  const [active, setActive] = useState(0);

  return (
    <div className="relative mx-auto w-full max-w-6xl px-6 pb-10">
      <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3 lg:grid-cols-5">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={i === active}
            className={`border-t-2 pt-3 text-center text-sm font-medium transition-colors ${
              i === active
                ? 'border-brand-ink text-brand-ink'
                : 'border-brand-ink/20 text-brand-ink/60 hover:text-brand-ink'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
