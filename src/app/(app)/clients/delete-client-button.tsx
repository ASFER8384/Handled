'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';

export function DeleteClientButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        className="text-muted text-sm hover:text-red-700"
        disabled={pending}
        onClick={() => {
          // Deleting a client takes their projects and invoices with it.
          if (!confirm(`Delete ${name}, along with their projects and invoices?`)) return;
          startTransition(async () => {
            const { error: failure } = await api(`/api/clients/${id}`, { method: 'DELETE' });
            if (failure) setError(failure.error);
            else router.refresh();
          });
        }}
      >
        Delete
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
