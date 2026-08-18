'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';

/** The three-dot menu: duplicate into a fresh draft, or delete outright. */
export function AutomationMenu({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function duplicate() {
    setBusy(true);
    const { data, error } = await api<{ automation: { id: string } }>(
      `/api/automations/${id}/duplicate`,
      { method: 'POST' },
    );
    setBusy(false);
    setOpen(false);
    if (error) {
      window.alert(error.error);
      return;
    }
    router.push(`/automations/${data.automation.id}`);
  }

  async function remove() {
    if (!window.confirm(`Delete “${name}”? Its run history goes too.`)) return;
    setBusy(true);
    const { error } = await api(`/api/automations/${id}`, { method: 'DELETE' });
    setBusy(false);
    setOpen(false);
    if (error) {
      window.alert(error.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${name}`}
        className="text-muted hover:bg-accent-soft rounded-md px-2 py-1 leading-none"
      >
        ⋯
      </button>

      {open && (
        <>
          {/* Click-away layer, so the menu closes like a real one. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="card absolute right-0 z-20 mt-1 w-40 overflow-hidden p-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={duplicate}
              className="hover:bg-accent-soft w-full rounded px-3 py-2 text-left text-sm"
            >
              Duplicate
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={remove}
              className="w-full rounded px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
