'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type SelectOption = {
  value: string;
  label: string;
  /** Second line, for when the label alone does not identify the thing. */
  hint?: string;
  disabled?: boolean;
};

/**
 * One dropdown for the whole app, so every field is the same height and every
 * panel is the same white card. The browser's own select paints its list with
 * the operating system's colours, which is the one thing here that never
 * matches the rest of the page.
 *
 * Long lists are searched from the field itself rather than from a box inside
 * the panel: you are already typing where the answer will appear.
 */
export function Select({
  id,
  value,
  options,
  placeholder = 'Select',
  ariaLabel,
  disabled,
  searchable,
  className = '',
  onChange,
  onCreate,
  createLabel = (typed) => `Create ‘${typed}’`,
}: {
  id?: string;
  value: string | null;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  /** Forced on for long lists; typing then filters from the field. */
  searchable?: boolean;
  className?: string;
  onChange: (value: string) => void;
  /** Offered when what was typed matches nothing, for pickers that can add. */
  onCreate?: (typed: string) => void;
  createLabel?: (typed: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const canType = Boolean(searchable || onCreate) || options.length >= 8;
  const chosen = options.find((option) => option.value === value) ?? null;

  // Portalled to the body: inside a dialog or a table the panel would be
  // clipped by whatever scrolls around it.
  useLayoutEffect(() => {
    if (!open || !wrapper.current) return;
    const rect = wrapper.current.getBoundingClientRect();
    const above = rect.top - 16;
    const below = window.innerHeight - rect.bottom - 16;

    setAnchor(
      above > below && below < 240
        ? {
            left: rect.left,
            width: rect.width,
            bottom: window.innerHeight - rect.top + 6,
            maxHeight: Math.min(320, above),
          }
        : {
            left: rect.left,
            width: rect.width,
            top: rect.bottom + 6,
            maxHeight: Math.min(320, below),
          },
    );
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (wrapper.current?.contains(target) || panel.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      // Stops here so a surrounding dialog is not closed along with the panel.
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const term = query.trim().toLowerCase();
  const matches = term
    ? options.filter((option) => `${option.label} ${option.hint ?? ''}`.toLowerCase().includes(term))
    : options;
  const exact = options.some((option) => option.label.toLowerCase() === term);

  function pick(option: SelectOption) {
    if (option.disabled) return;
    onChange(option.value);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={wrapper} className={`relative ${className}`}>
      {open && canType ? (
        <input
          id={id}
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={chosen?.label ?? placeholder}
          aria-label={ariaLabel ?? placeholder}
          className="input-soft"
        />
      ) : (
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => {
            setQuery('');
            setOpen((shown) => !shown);
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className="input-soft flex items-center justify-between gap-2 text-left disabled:opacity-50"
        >
          <span className={`truncate ${chosen ? '' : 'text-muted'}`}>
            {chosen?.label ?? placeholder}
          </span>
          <Caret />
        </button>
      )}

      {open &&
        anchor &&
        createPortal(
          <div
            ref={panel}
            role="listbox"
            style={{
              left: anchor.left,
              width: anchor.width,
              top: anchor.top,
              bottom: anchor.bottom,
              maxHeight: anchor.maxHeight,
            }}
            className="bg-surface fixed z-[60] flex min-w-[200px] flex-col overflow-hidden rounded-lg shadow-2xl ring-1 ring-black/10"
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
              {matches.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  disabled={option.disabled}
                  onClick={() => pick(option)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors disabled:opacity-40 ${
                    option.value === value ? 'bg-black/[0.05]' : 'hover:bg-black/[0.04]'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.hint && (
                      <span className="text-muted block truncate text-xs">{option.hint}</span>
                    )}
                  </span>
                  {option.value === value && <Tick />}
                </button>
              ))}

              {onCreate && term !== '' && !exact && (
                <button
                  type="button"
                  onClick={() => {
                    onCreate(query.trim());
                    setQuery('');
                    setOpen(false);
                  }}
                  className={`text-accent flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-black/[0.04] ${
                    matches.length > 0 ? 'border-line mt-1 border-t pt-2.5' : ''
                  }`}
                >
                  <span aria-hidden className="text-base leading-none">
                    +
                  </span>
                  {createLabel(query.trim())}
                </button>
              )}

              {matches.length === 0 && !onCreate && (
                <p className="text-muted px-3 py-6 text-center text-sm">Nothing matches that.</p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function Caret() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="text-muted h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12.5 5 5L19 7" />
    </svg>
  );
}
