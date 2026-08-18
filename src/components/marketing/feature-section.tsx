'use client';

import { useState, type ReactNode } from 'react';

type Props = {
  eyebrow: string;
  title: string;
  body: string;
  chips: string[];
  /** Tailwind background class for the panel behind the product shot. */
  tint: string;
  /** Put the copy on the right instead of the left. */
  flip?: boolean;
  children: ReactNode;
};

export function FeatureSection({ eyebrow, title, body, chips, tint, flip, children }: Props) {
  const [active, setActive] = useState(0);

  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <div className={flip ? 'lg:order-2' : undefined}>
        <p className="eyebrow text-brand-ink/70">{eyebrow}</p>
        <h3 className="mt-4 max-w-md text-4xl leading-tight font-semibold tracking-tight">
          {title}
        </h3>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-brand-ink/80">{body}</p>

        <div className="mt-8 flex flex-wrap gap-2">
          {chips.map((chip, i) => (
            <button
              key={chip}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={`chip ${i === active ? 'chip-active' : 'hover:bg-brand-ink/5'}`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className={flip ? 'lg:order-1' : undefined}>
        <div className={`rounded-3xl p-6 sm:p-10 ${tint}`}>{children}</div>
      </div>
    </div>
  );
}
