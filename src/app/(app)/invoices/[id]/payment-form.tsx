'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { FormSelect } from '@/components/form-select';
import { formatMoney, parseMoneyToCents } from '@/lib/money';
import { formatDate } from '@/components/ui';
import { api } from '@/lib/client-fetch';

type Values = { amount: string; method: string; reference: string; paidAt: string };

const METHODS = [
  ['BANK_TRANSFER', 'Bank transfer'],
  ['CARD', 'Card'],
  ['CASH', 'Cash'],
  ['CHEQUE', 'Cheque'],
  ['OTHER', 'Other'],
] as const;

/** A step of the schedule, as the form needs to offer it. */
export type PayableStep = {
  label: string;
  amountCents: number;
  paidCents: number;
  dueAt: string | null;
  state: string;
};

export function PaymentForm({
  invoiceId,
  outstanding,
  currency,
  schedule = [],
}: {
  invoiceId: string;
  outstanding: number;
  currency: string;
  /** Steps still owed, oldest first. Empty is an invoice paid in one go. */
  schedule?: PayableStep[];
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  // With a schedule, what turned up is almost always the next step, so the
  // form opens on it. Without one, the whole balance: "paid in full" should be
  // a single click.
  const owed = schedule.filter((step) => step.paidCents < step.amountCents);
  const next = owed[0] ?? null;
  const [step, setStep] = useState<string | null>(next?.label ?? null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<Values>({
    defaultValues: {
      amount: ((next ? next.amountCents - next.paidCents : outstanding) / 100).toFixed(2),
      method: 'BANK_TRANSFER',
      reference: next?.label ?? '',
    },
  });

  function pick(label: string | null) {
    setStep(label);
    const chosen = owed.find((entry) => entry.label === label);
    setValue(
      'amount',
      ((chosen ? chosen.amountCents - chosen.paidCents : outstanding) / 100).toFixed(2),
    );
    setValue('reference', chosen ? chosen.label : '');
  }

  async function onSubmit(values: Values) {
    setFormError(null);
    const amountCents = parseMoneyToCents(values.amount);
    if (amountCents === null || amountCents <= 0) {
      setFormError('Enter an amount');
      return;
    }

    const { error } = await api(`/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: {
        amountCents,
        method: values.method,
        reference: values.reference,
        paidAt: values.paidAt,
      },
    });
    if (error) {
      setFormError(error.error);
      return;
    }
    reset({ amount: '', method: values.method, reference: '', paidAt: '' });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3" noValidate>
      <p className="text-muted text-sm">
        Outstanding <span className="tabular-nums">{formatMoney(outstanding, currency)}</span>
      </p>

      {owed.length > 1 && (
        <fieldset>
          <legend className="label">Which step is this?</legend>
          {/* Only worth asking when there is a choice: one step left, or no
              schedule at all, and the amount is already the answer. The money
              lands on the invoice as a whole and the steps fill from the top,
              so this fills in the amount rather than tying a payment to a row. */}
          <div className="space-y-1.5">
            {owed.map((entry) => {
              const left = entry.amountCents - entry.paidCents;
              const chosen = step === entry.label;
              return (
                <button
                  key={entry.label}
                  type="button"
                  onClick={() => pick(entry.label)}
                  aria-pressed={chosen}
                  className={`border-line flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    chosen ? 'border-accent bg-accent-soft/40' : 'hover:border-accent'
                  }`}
                >
                  <span>
                    <span className="font-medium">{entry.label}</span>
                    <span className="text-muted block text-xs">
                      {entry.dueAt ? `Due ${formatDate(entry.dueAt)}` : 'No date'}
                      {entry.state === 'OVERDUE' ? ' · overdue' : ''}
                    </span>
                  </span>
                  <span className="tabular-nums">{formatMoney(left, currency)}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => pick(null)}
              aria-pressed={step === null}
              className={`border-line block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                step === null ? 'border-accent bg-accent-soft/40' : 'hover:border-accent'
              }`}
            >
              Some other amount
            </button>
          </div>
        </fieldset>
      )}

      <div>
        <label className="label" htmlFor="payment-amount">
          Amount
        </label>
        <input id="payment-amount" inputMode="decimal" className="input" {...register('amount')} />
      </div>

      <div>
        <label className="label" htmlFor="payment-method">
          Method
        </label>
        <FormSelect
          id="payment-method"
          control={control}
          name="method"
          options={METHODS.map(([value, label]) => ({ value, label }))}
        />
      </div>

      <div>
        <label className="label" htmlFor="payment-date">
          Date received
        </label>
        <input id="payment-date" type="date" className="input" {...register('paidAt')} />
      </div>

      <div>
        <label className="label" htmlFor="payment-reference">
          Reference
        </label>
        <input id="payment-reference" className="input" {...register('reference')} />
      </div>

      {formError && <p className="field-error">{formError}</p>}

      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Recording…' : 'Record payment'}
      </button>
    </form>
  );
}
