'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const TABS = [
  { label: 'Project pipeline', src: '/marketing/pipeline.png' },
  { label: 'Lead capture', src: '/marketing/leads.png' },
  { label: 'Client Management', src: '/marketing/clients.png' },
  { label: 'Online payments', src: '/marketing/payments.png' },
  { label: 'Automations', src: '/marketing/automations.png' },
];

const EVERY = 9000;

/**
 * The tab strip and the screenshot below it are one control: the strip walks
 * itself through the app every few seconds, and a click takes it over.
 */
export function HeroTabs() {
  const [active, setActive] = useState(0);
  // Restarting the timer on a click keeps a chosen tab up for a full turn.
  const [turn, setTurn] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive((current) => (current + 1) % TABS.length), EVERY);
    return () => clearInterval(timer);
  }, [turn]);

  return (
    <>
      <div className="bg-brand-clay">
        <div className="relative mx-auto w-full max-w-6xl px-6 pb-10">
          <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3 lg:grid-cols-5">
            {TABS.map((tab, i) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setActive(i);
                  setTurn((value) => value + 1);
                }}
                aria-pressed={i === active}
                className={`relative pt-3 text-center text-sm font-medium transition-colors ${
                  i === active ? 'text-brand-ink' : 'text-brand-ink/60 hover:text-brand-ink'
                }`}
              >
                <span aria-hidden className="bg-brand-ink/20 absolute inset-x-0 top-0 h-0.5" />
                {i === active && (
                  <span
                    aria-hidden
                    key={`${active}-${turn}`}
                    className="bg-brand-ink absolute inset-x-0 top-0 h-0.5 origin-left"
                    style={{ animation: `tab-progress ${EVERY}ms linear forwards` }}
                  />
                )}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="bg-brand-clay relative pb-px">
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-white" />
        <div className="relative mx-auto w-full max-w-6xl px-6">
          <div className="border-brand-ink/10 relative aspect-[1440/700] overflow-hidden rounded-2xl border bg-white shadow-2xl">
            {TABS.map((tab, i) => (
              <Image
                key={tab.src}
                src={tab.src}
                alt={`${tab.label} in Handled`}
                fill
                priority={i === 0}
                sizes="(max-width: 1152px) 100vw, 1152px"
                className={`object-cover object-top transition-opacity duration-700 ${
                  i === active ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
