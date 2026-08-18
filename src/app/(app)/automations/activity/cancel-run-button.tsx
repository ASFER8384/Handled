'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';

/** Stops what is still scheduled. Steps that already ran stay on the timeline. */
export function CancelRunButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function cancel() {
    if (!window.confirm('Cancel this run? Steps that already ran are not undone.')) return;
    setBusy(true);
    const { error } = await api(`/api/automation-runs/${id}/cancel`, { method: 'POST' });
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
      onClick={cancel}
      disabled={busy}
      className="text-muted hover:bg-accent-soft rounded-md border border-line px-2 py-0.5 text-xs disabled:opacity-60"
    >
      {busy ? 'Cancelling…' : 'Cancel run'}
    </button>
  );
}
