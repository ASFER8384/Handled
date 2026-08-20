'use client';

import { useState } from 'react';
import { Dialog } from '@/components/dialog';

/**
 * Asking before something is destroyed, in the app's own voice.
 *
 * The browser's confirm box says the address of the site at the top and
 * paints itself in the operating system's colours, which is the one dialog
 * here that looks like it belongs to somebody else.
 *
 * Where a mistake cannot be undone, `word` asks for it to be typed out. It is
 * not security — the button is right there — it is a half second of reading
 * what you are about to lose, which is the whole point of the question.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel = 'Delete',
  word,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  /** Typed before the button will work. Left out, the button is live. */
  word?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const ready = !word || typed.trim().toLowerCase() === word.toLowerCase();

  return (
    <Dialog
      fit
      width={420}
      title={title}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready || busy}
            onClick={onConfirm}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800 disabled:opacity-40"
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed">{body}</p>

      {word && (
        <div className="mt-5">
          <label className="label" htmlFor="confirm-word">
            Type <span className="text-foreground font-semibold">{word}</span> to confirm
          </label>
          <input
            id="confirm-word"
            autoFocus
            autoComplete="off"
            className="input"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && ready) onConfirm();
            }}
          />
        </div>
      )}
    </Dialog>
  );
}
