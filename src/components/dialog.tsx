'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Centred modal with a titled header. Escape and a click on the backdrop both
 * close it; the page behind is frozen so a long form does not scroll two
 * things at once.
 *
 * It is mounted on the body rather than where it is written. A modal opened
 * from inside anything that stacks — the sticky tab header, a dropdown — would
 * otherwise be trapped in that layer and painted over by the app header.
 */
export function Dialog({
  title,
  onClose,
  footer,
  width = 500,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Panel width in px; the height is fixed so every dialog scrolls the same. */
  width?: number;
  /** Pinned below the scroll area. Buttons here reach the form by `form=` id. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  // Nothing to portal into while this is being rendered on the server.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: width }}
        className="bg-surface flex h-[600px] max-h-[calc(100vh-2rem)] w-full flex-col rounded-xl shadow-2xl"
      >
        <div className="border-line relative flex shrink-0 items-center justify-center border-b px-6 py-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-foreground absolute right-5 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">{children}</div>

        {footer && (
          <div className="border-line flex shrink-0 justify-end border-t px-8 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
