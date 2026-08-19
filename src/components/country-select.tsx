'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { COUNTRIES, SUGGESTED_ISO, findCountry, type Country } from '@/lib/countries';

/**
 * Dialling-code picker: the trigger shows the ISO code and the dial code, the
 * panel searches on country name, ISO or dial code.
 */
export function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const selected = findCountry(value);

  // The panel is portalled to the body: inside the dialog it would be clipped
  // by the scrolling form, which hides it behind the dialog's header.
  useLayoutEffect(() => {
    if (!open || !wrapper.current) return;
    const rect = wrapper.current.getBoundingClientRect();
    const above = rect.top - 16;
    const below = window.innerHeight - rect.bottom - 16;

    // Opens upward when there is room, downward when there is not, and never
    // taller than the gap it opens into.
    setAnchor(
      above >= below
        ? {
            left: rect.left,
            bottom: window.innerHeight - rect.top + 8,
            maxHeight: Math.min(380, above),
          }
        : { left: rect.left, top: rect.bottom + 8, maxHeight: Math.min(380, below) },
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
      // Stops at this listener so the surrounding dialog stays open.
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
    ? COUNTRIES.filter(
        (country) =>
          country.name.toLowerCase().includes(term) ||
          country.iso.toLowerCase().includes(term) ||
          country.dial.includes(term.replace(/^\+?/, '+')),
      )
    : null;

  const suggested = SUGGESTED_ISO.map((iso) => findCountry(iso));

  return (
    <div ref={wrapper} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setQuery('');
          setOpen((value) => !value);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input-soft flex w-[104px] items-center justify-between gap-2"
      >
        <span className="flex items-baseline gap-1.5">
          <span className="text-muted text-xs">{selected.iso}</span>
          <span>{selected.dial}</span>
        </span>
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
      </button>

      {open &&
        anchor &&
        createPortal(
          <div
            ref={panel}
            role="listbox"
            style={{
              left: anchor.left,
              top: anchor.top,
              bottom: anchor.bottom,
              maxHeight: anchor.maxHeight,
            }}
            className="bg-surface fixed z-[60] flex w-[264px] flex-col overflow-hidden rounded-lg shadow-2xl ring-1 ring-black/10"
          >
            <div className="p-3">
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                aria-label="Search countries"
                className="input-soft"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {matches === null ? (
                <>
                  <GroupLabel>Suggested</GroupLabel>
                  {suggested.map((country) => (
                    <Row
                      key={`suggested-${country.iso}`}
                      country={country}
                      selected={country.iso === selected.iso}
                      onSelect={() => {
                        onChange(country.iso);
                        setOpen(false);
                      }}
                    />
                  ))}
                  <GroupLabel>All countries</GroupLabel>
                  {COUNTRIES.map((country) => (
                    <Row
                      key={country.iso}
                      country={country}
                      selected={country.iso === selected.iso}
                      onSelect={() => {
                        onChange(country.iso);
                        setOpen(false);
                      }}
                    />
                  ))}
                </>
              ) : matches.length === 0 ? (
                <p className="text-muted px-3 py-6 text-center text-sm">No country matches that.</p>
              ) : (
                matches.map((country) => (
                  <Row
                    key={country.iso}
                    country={country}
                    selected={country.iso === selected.iso}
                    onSelect={() => {
                      onChange(country.iso);
                      setOpen(false);
                    }}
                  />
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function GroupLabel({ children }: { children: string }) {
  return <p className="text-muted px-3 pt-3 pb-1 text-sm font-semibold">{children}</p>;
}

function Row({
  country,
  selected,
  onSelect,
}: {
  country: Country;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
        selected ? 'bg-black/[0.05]' : 'hover:bg-black/[0.03]'
      }`}
    >
      <span className="text-muted w-6 shrink-0 text-xs">{country.iso}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{country.name}</span>
        <span className="text-muted block text-xs">{country.dial}</span>
      </span>
      {selected && (
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
      )}
    </button>
  );
}
