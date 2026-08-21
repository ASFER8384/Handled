'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/components/ui';
import { ConfirmDialog } from '@/components/confirm';
import { Tip } from '@/components/ui';
import { api } from '@/lib/client-fetch';

export type RecordedPayment = {
  id: string;
  amountCents: number;
  method: string;
  reference: string | null;
  paidAt: string;
};

/**
 * What has come in against this invoice, and a way to unsay it.
 *
 * Recording a payment is typing, and typing goes wrong: 6,000 where 600 was
 * meant leaves an invoice claiming to be paid. Taking one off is not a refund
 * — no money moves — so the wording asks about the record, not the money, and
 * the invoice works out its own status again afterwards.
 */
export function PaymentList({
  invoiceId,
  payments,
  currency,
  locked,
}: {
  invoiceId: string;
  payments: RecordedPayment[];
  currency: string;
  /** A void invoice is closed, and its history stays as it was. */
  locked?: boolean;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState<RecordedPayment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!removing) return;
    setBusy(true);
    const { error: failure } = await api(`/api/invoices/${invoiceId}/payments/${removing.id}`, {
      method: 'DELETE',
    });
    setBusy(false);
    if (failure) {
      setError(failure.error);
      return;
    }
    setRemoving(null);
    router.refresh();
  }

  if (payments.length === 0) {
    return <p className="text-muted mt-2 text-sm">Nothing recorded yet.</p>;
  }

  return (
    <>
      <ul className="divide-line mt-3 divide-y text-sm">
        {payments.map((payment) => (
          <li key={payment.id} className="flex items-center justify-between gap-4 py-2">
            <span className="text-muted">
              {formatDate(new Date(payment.paidAt))} ·{' '}
              {payment.method.replace('_', ' ').toLowerCase()}
              {payment.reference ? ` · ${payment.reference}` : ''}
            </span>
            <span className="flex items-center gap-3">
              <span className="tabular-nums">{formatMoney(payment.amountCents, currency)}</span>
              {!locked && (
                <Tip label="Take this off the record">
                  <button
                    type="button"
                    aria-label={`Remove the payment of ${formatMoney(payment.amountCents, currency)}`}
                    onClick={() => {
                      setError(null);
                      setRemoving(payment);
                    }}
                    className="text-muted text-sm hover:text-red-700"
                  >
                    ✕
                  </button>
                </Tip>
              )}
            </span>
          </li>
        ))}
      </ul>

      {error && <p className="field-error mt-3">{error}</p>}

      {removing && (
        <ConfirmDialog
          title="Take this payment off?"
          body={`${formatMoney(removing.amountCents, currency)} recorded on ${formatDate(
            new Date(removing.paidAt),
          )} will be removed from this invoice, and the balance will go back up. No money moves — this only corrects the record.`}
          confirmLabel="Remove it"
          busyLabel="Removing…"
          word="remove"
          busy={busy}
          onConfirm={remove}
          onClose={() => setRemoving(null)}
        />
      )}
    </>
  );
}
