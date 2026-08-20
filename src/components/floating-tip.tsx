'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * The dark label of `Tip`, drawn on the page rather than beside what it
 * names, so a box that scrolls cannot cut it off. Reach for it through
 * `<Tip floating>` rather than directly.
 */
export function FloatingTip({
  label,
  side,
  className = '',
  children,
}: {
  label: string;
  side: 'top' | 'right';
  className?: string;
  children: React.ReactNode;
}) {
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);

  function show(event: React.SyntheticEvent<HTMLElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setAt(
      side === 'right'
        ? { left: box.right + 8, top: box.top + box.height / 2 }
        : { left: box.left + box.width / 2, top: box.top - 8 },
    );
  }

  return (
    <span
      className={`inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={() => setAt(null)}
      onFocus={show}
      onBlur={() => setAt(null)}
    >
      {children}
      {at &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            role="tooltip"
            style={{ left: at.left, top: at.top }}
            className={`bg-brand-ink pointer-events-none fixed z-50 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white ${
              side === 'right' ? '-translate-y-1/2' : '-translate-x-1/2 -translate-y-full'
            }`}
          >
            {label}
            <span
              aria-hidden
              className={`bg-brand-ink absolute h-2 w-2 rotate-45 rounded-[1px] ${
                side === 'right'
                  ? 'top-1/2 right-full translate-x-1 -translate-y-1/2'
                  : 'top-full left-1/2 -translate-x-1/2 -translate-y-1'
              }`}
            />
          </span>,
          document.body,
        )}
    </span>
  );
}
