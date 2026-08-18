'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { InvoiceStatus } from '@/generated/prisma/enums';
import { api } from '@/lib/client-fetch';

export function InvoiceActions({
  id,
  status,
  hasPayments,
}: {
  id: string;
  status: InvoiceStatus;
  hasPayments: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(body: { status: 'SENT' | 'VOID' }) {
    startTransition(async () => {
      setError(null);
      const { error: failure } = await api(`/api/invoices/${id}`, { method: 'PATCH', body });
      if (failure) setError(failure.error);
      else router.refresh();
    });
  }

  return (
    <div className="text-right">
      <div className="flex gap-2">
        {status === 'DRAFT' && (
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() => run({ status: 'SENT' })}
          >
            Mark as sent
          </button>
        )}
        {status !== 'VOID' && !hasPayments && (
          <button
            type="button"
            className="btn-ghost"
            disabled={pending}
            onClick={() => {
              if (confirm('Void this invoice? It stays on record but stops counting.')) {
                run({ status: 'VOID' });
              }
            }}
          >
            Void
          </button>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
