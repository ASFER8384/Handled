'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import type { AutomationStatus } from '@/generated/prisma/enums';

/** Active/inactive is the one change allowed while a run is in flight. */
export function AutomationToggle({ id, status }: { id: string; status: AutomationStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const active = status === 'ACTIVE';

  async function toggle() {
    setBusy(true);
    const { error } = await api(`/api/automations/${id}`, {
      method: 'PATCH',
      body: { status: active ? 'INACTIVE' : 'ACTIVE' },
    });
    setBusy(false);
    if (error) {
      window.alert(error.error);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
        active
          ? 'border-transparent bg-emerald-50 text-emerald-800'
          : 'border-line text-muted bg-surface'
      }`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-600' : 'bg-neutral-400'}`}
      />
      {active ? 'Active' : 'Inactive'}
    </button>
  );
}
