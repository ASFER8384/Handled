'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

/**
 * Switching tab lands you at the top of that tab, not the top of the page: the
 * app header, the client bar and the strip stay where they are, and the new
 * tab starts at its first row underneath them.
 */
export function TabLinks({
  projectId,
  tabs,
  current,
}: {
  projectId: string;
  tabs: readonly string[];
  current: string;
}) {
  const previous = useRef(current);

  useEffect(() => {
    if (previous.current === current) return;
    previous.current = current;

    // Measured after the swap, never before: every tab is a different height,
    // so where the page has to sit is only knowable once the new one is in.
    const frame = requestAnimationFrame(() => {
      // The whole bar sticks, not just the strip: the client row rides with
      // it, so all of it has to be cleared or it lands half cut off.
      const bar = document.querySelector('[data-tab-header]');
      const content = document.querySelector('[data-tab-content]');
      if (!bar || !content) return;

      // That bar is sticky, so its own position says nothing about where the
      // page is. The content under it is the honest anchor.
      const stack = 56 + bar.getBoundingClientRect().height;
      const target = Math.max(0, window.scrollY + content.getBoundingClientRect().top - stack);
      if (window.scrollY > target) window.scrollTo({ top: target });
    });
    return () => cancelAnimationFrame(frame);
  }, [current]);

  return (
    <div data-tab-strip className="border-line flex items-center gap-8 border-b">
      {tabs.map((name) => (
        <Link
          key={name}
          href={`/projects/${projectId}?tab=${name.toLowerCase()}`}
          scroll={false}
          aria-current={name === current ? 'page' : undefined}
          className={`-mb-px border-b-2 pt-4 pb-3 text-[15px] transition-colors ${
            name === current
              ? 'border-accent font-semibold'
              : 'text-muted hover:text-foreground border-transparent'
          }`}
        >
          {name}
        </Link>
      ))}
    </div>
  );
}
