import type { CSSProperties } from 'react';

export type Placement = { style: CSSProperties };

/**
 * Puts a panel under the button that opened it, or over it when what it wants
 * does not fit below and there is more room above.
 *
 * `wanted` is roughly how tall the panel would like to be — it decides which
 * way round, not how tall it ends up. Either way it is capped at the room it
 * has and scrolls inside that, so the last row stays reachable on a short
 * window.
 */
export function placeUnder(button: DOMRect, wanted: number): Placement {
  const gap = 8;
  const margin = 12;
  // Measured off the document element, not the window: `window.innerWidth`
  // counts the scrollbar, which a fixed panel does not sit under, and the
  // difference is exactly how far off the button it would land.
  const view = document.documentElement;
  const right = Math.max(margin, view.clientWidth - button.right);
  const below = view.clientHeight - button.bottom - gap - margin;
  const above = button.top - gap - margin;

  if (below < wanted && above > below) {
    return { style: { bottom: view.clientHeight - button.top + gap, right, maxHeight: above } };
  }
  return { style: { top: button.bottom + gap, right, maxHeight: below } };
}
