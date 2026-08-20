'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { api, showFailure } from '@/lib/client-fetch';
import { formatMoney, formatRate } from '@/lib/money';

export type BankValues = {
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIban: string;
  bankSwift: string;
  bankNotes: string;
  taxLabel: string;
  taxNumber: string;
  /** Written as a percentage here; sent as basis points. */
  taxRate: string;
};

/**
 * Where the money goes, and what the taxman is owed on it.
 *
 * Both print on the invoice: an invoice that says what is owed but not where
 * to send it is a document the client has to come back and ask about, and a
 * rate held only in someone's head gets forgotten on the one that matters.
 */
export function BankForm({ values, currency }: { values: BankValues; currency: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BankValues>({ defaultValues: values });

  const rateBp = Math.round(Number(watch('taxRate') || 0) * 100);
  const label = watch('taxLabel') || 'VAT';

  async function onSubmit(entered: BankValues) {
    setFormError(null);
    setSaved(false);

    const { taxRate, ...rest } = entered;
    const { error } = await api('/api/settings/bank', {
      method: 'PATCH',
      body: { ...rest, taxRateBp: Math.round(Number(taxRate || 0) * 100) },
    });
    if (error) {
      showFailure(error, setError, setFormError);
      return;
    }
    reset(entered);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      <section className="card p-6">
        <h2 className="font-medium">Where the money lands</h2>
        <p className="text-muted mt-1 text-sm">
          Printed at the foot of every invoice, under how to pay it.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="bank-name">
              Bank
            </label>
            <input id="bank-name" className="input" maxLength={80} {...register('bankName')} />
          </div>

          <div>
            <label className="label" htmlFor="bank-account-name">
              Account name
            </label>
            <input
              id="bank-account-name"
              className="input"
              maxLength={80}
              {...register('bankAccountName')}
            />
          </div>

          <div>
            <label className="label" htmlFor="bank-account-number">
              Account number
            </label>
            <input
              id="bank-account-number"
              className="input"
              maxLength={40}
              {...register('bankAccountNumber')}
            />
          </div>

          <div>
            <label className="label" htmlFor="bank-iban">
              IBAN
            </label>
            <input
              id="bank-iban"
              className="input uppercase"
              maxLength={40}
              placeholder="AE07 0331 2345 6789 0123 456"
              {...register('bankIban')}
            />
          </div>

          <div>
            <label className="label" htmlFor="bank-swift">
              SWIFT / BIC
            </label>
            <input
              id="bank-swift"
              className="input uppercase"
              maxLength={20}
              {...register('bankSwift')}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="bank-notes">
              Anything else a payer needs
            </label>
            <textarea
              id="bank-notes"
              rows={2}
              className="input"
              maxLength={600}
              placeholder="Quote the invoice number as the reference."
              {...register('bankNotes')}
            />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-medium">Tax</h2>
        <p className="text-muted mt-1 text-sm">
          Charged on the subtotal of every invoice written from now on. A rate of nothing means no
          tax line at all.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="tax-label">
              What it is called
            </label>
            <input
              id="tax-label"
              className="input"
              maxLength={20}
              placeholder="VAT"
              {...register('taxLabel')}
            />
          </div>

          <div>
            <label className="label" htmlFor="tax-rate">
              Rate
            </label>
            <div className="flex items-center gap-2">
              <input
                id="tax-rate"
                className="input"
                inputMode="decimal"
                placeholder="5"
                {...register('taxRate')}
              />
              <span className="text-muted">%</span>
            </div>
            {errors.taxRate && <p className="field-error">{errors.taxRate.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="tax-number">
              Registration number
            </label>
            <input
              id="tax-number"
              className="input"
              maxLength={40}
              placeholder="TRN"
              {...register('taxNumber')}
            />
          </div>
        </div>

        {/* What it does to a number, rather than what it means. */}
        <div className="border-line mt-6 max-w-sm rounded-xl border p-4 text-sm">
          <p className="text-muted text-xs tracking-widest uppercase">On a 1,000 invoice</p>
          <dl className="mt-3 space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(100000, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">
                {label} {rateBp > 0 ? formatRate(rateBp) : '—'}
              </dt>
              <dd className="tabular-nums">{formatMoney((100000 * rateBp) / 10000, currency)}</dd>
            </div>
            <div className="border-line flex justify-between border-t pt-2 font-medium">
              <dt>Total</dt>
              <dd className="tabular-nums">
                {formatMoney(100000 + (100000 * rateBp) / 10000, currency)}
              </dd>
            </div>
          </dl>
        </div>

        <p className="text-muted mt-4 text-xs leading-relaxed">
          Drafts pick up a changed rate. Anything already sent keeps the rate it went out with —
          each invoice carries its own copy, so last year&rsquo;s paperwork stays as it was.
        </p>
      </section>

      {formError && <p className="field-error">{formError}</p>}

      <div className="flex items-center gap-4">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
        {saved && <p className="text-muted text-sm">Saved.</p>}
      </div>
    </form>
  );
}
