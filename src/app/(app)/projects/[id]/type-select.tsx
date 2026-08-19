'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';

/** The project type, changed from the header it is displayed in. */
export function TypeSelect({
  id,
  type,
  types,
}: {
  id: string;
  type: string | null;
  types: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(type);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  async function pick(next: string) {
    setOpen(false);
    const previous = value;
    setValue(next);
    const { error } = await api(`/api/projects/${id}`, { method: 'PATCH', body: { type: next } });
    if (error) setValue(previous);
    else router.refresh();
  }

  return (
    <div ref={wrapper} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1 font-medium hover:underline"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        {value ?? 'Set project type'}
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute top-full left-0 z-50 mt-2 max-h-[280px] w-56 overflow-y-auto rounded-lg bg-white py-1 text-left shadow-2xl ring-1 ring-black/10"
        >
          {types.map((name) => (
            <li key={name}>
              <button
                type="button"
                role="option"
                aria-selected={name === value}
                onClick={() => void pick(name)}
                className={`flex h-10 w-full items-center justify-between px-4 text-[15px] transition-colors ${
                  name === value ? 'bg-black/[0.06] font-medium' : 'hover:bg-black/[0.04]'
                } text-foreground`}
              >
                {name}
                {name === value && (
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 13 4 4 10-10" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
