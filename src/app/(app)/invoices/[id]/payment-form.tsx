'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { FormSelect } from '@/components/form-select';
import { formatMoney, parseMoneyToCents } from '@/lib/money';
import { api } from '@/lib/client-fetch';

type Values = { amount: string; method: string; reference: string; paidAt: string };

const METHODS = [
  ['BANK_TRANSFER', 'Bank transfer'],
  ['CARD', 'Card'],
  ['CASH', 'Cash'],
  ['CHEQUE', 'Cheque'],
  ['OTHER', 'Other'],
] as const;

export function PaymentForm({
  invoiceId,
  outstanding,
  currency,
}: {
  invoiceId: string;
  outstanding: number;
  currency: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<Values>({
    // Pre-filling the balance makes "paid in full" a single click.
    defaultValues: { amount: (outstanding / 100).toFixed(2), method: 'BANK_TRANSFER' },
  });

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
