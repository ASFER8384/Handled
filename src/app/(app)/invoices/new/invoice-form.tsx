'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { FormSelect } from '@/components/form-select';
import { formatMoney, parseMoneyToCents } from '@/lib/money';
import { api } from '@/lib/client-fetch';

type ClientOption = {
  id: string;
  name: string;
  email: string | null;
  projects: { id: string; name: string }[];
};

type Values = {
  clientId: string;
  projectId: string;
  dueAt: string;
  notes: string;
  items: { description: string; quantity: number; unitPrice: string }[];
};

const BLANK_ITEM = { description: '', quantity: 1, unitPrice: '' };

/** What the form opens with, when it was opened from somewhere in particular. */
export type InvoiceStart = {
  clientId: string | null;
  projectId: string | null;
  dueAt: string;
  notes: string;
  /** The template's lines, priced by whoever is filling this in. */
  items: { description: string; quantity: number }[] | null;
};

/**
 * The invoice, written on the invoice.
 *
 * Every field sits where the thing it says will be printed, so what you are
 * filling in and what the client will read are the same page. A form of
 * labelled boxes beside a preview asks you to hold two documents in your head
 * and trust that they match.
 */
export function InvoiceForm({
  clients,
  currency,
  from,
  fromEmail,
  start,
}: {
  clients: ClientOption[];
  currency: string;
  /** The workspace, as it will appear at the top of the invoice. */
  from: string;
  fromEmail: string;
  start?: InvoiceStart;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: {
      clientId: start?.clientId ?? clients[0]?.id ?? '',
      projectId: start?.projectId ?? '',
      dueAt: start?.dueAt ?? '',
      notes: start?.notes ?? '',
      items: start?.items?.length
        ? start.items.map((item) => ({ ...BLANK_ITEM, ...item }))
        : [{ ...BLANK_ITEM }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watched = useWatch({ control, name: 'items' }) ?? [];
  const selectedClientId = useWatch({ control, name: 'clientId' });
  const client = clients.find((entry) => entry.id === selectedClientId);
  const projects = client?.projects ?? [];

  const lineTotal = (index: number) =>
    (parseMoneyToCents(watched[index]?.unitPrice ?? '') ?? 0) *
    Number(watched[index]?.quantity || 0);

  const total = watched.reduce((sum, _item, index) => sum + lineTotal(index), 0);

  async function onSubmit(values: Values) {
    setFormError(null);

    const items = [];
    for (const item of values.items) {
      const unitPriceCents = parseMoneyToCents(item.unitPrice);
      if (unitPriceCents === null || unitPriceCents < 0) {
        setFormError(`Enter a valid price for "${item.description || 'a line item'}"`);
        return;
      }
      items.push({
        description: item.description,
        quantity: Number(item.quantity),
        unitPriceCents,
      });
    }

    const { data, error } = await api<{ invoice: { id: string } }>('/api/invoices', {
      method: 'POST',
      body: {
        clientId: values.clientId,
        projectId: values.projectId || undefined,
        dueAt: values.dueAt,
        notes: values.notes,
        items,
      },
    });
    if (error) {
      setFormError(error.error);
      return;
    }
    router.push(`/invoices/${data.invoice.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl" noValidate>
      <article className="invoice-sheet card p-8 sm:p-10">
        {/* who it is from */}
        <header>
          <p className="text-lg font-semibold">{from}</p>
          <p className="text-muted mt-0.5 text-sm">{fromEmail}</p>
        </header>

        <h2 className="mt-8 bg-black/[0.05] px-4 py-3 text-2xl font-bold tracking-tight">
          INVOICE
        </h2>

        {/* who it is to, and when it falls due */}
        <div className="mt-8 grid gap-8 sm:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <label className="text-muted text-sm" htmlFor="invoice-client">
              Bill to
            </label>
            <div className="mt-1.5">
              <FormSelect
                id="invoice-client"
                control={control}
                name="clientId"
                placeholder="Pick a contact"
                options={clients.map((entry) => ({ value: entry.id, label: entry.name }))}
              />
            </div>

            {client?.email && <p className="text-muted mt-1.5 text-sm">{client.email}</p>}

            <label className="text-muted mt-4 block text-sm" htmlFor="invoice-project">
              For
            </label>
            <div className="mt-1.5">
              <FormSelect
                id="invoice-project"
                control={control}
                name="projectId"
                placeholder="No project"
                options={projects.map((project) => ({ value: project.id, label: project.name }))}
              />
            </div>
          </div>

          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Invoice #</dt>
              <dd className="text-muted">Given when saved</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Date issued</dt>
              <dd className="text-muted">When you send it</dd>
            </div>
            <div>
              <label className="text-muted block" htmlFor="invoice-due">
                Payment due
              </label>
              <input id="invoice-due" type="date" className="input mt-1.5" {...register('dueAt')} />
            </div>
            <div className="border-line flex items-center justify-between gap-4 border-t pt-4">
              <dt className="font-medium">Balance due</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(total, currency)}</dd>
            </div>
          </dl>
        </div>

        {/* what is being billed, typed straight into the table */}
        <table className="mt-10 w-full text-sm">
          <thead>
            <tr className="text-muted border-line border-b text-xs tracking-widest uppercase">
              <th className="py-3 text-left font-medium">Service info</th>
              <th className="w-20 py-3 text-right font-medium">Qty</th>
              <th className="w-36 py-3 text-right font-medium">Unit price</th>
              <th className="w-32 py-3 text-right font-medium">Total</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {fields.map((field, index) => (
              <tr key={field.id} className="align-top">
                <td className="py-2 pr-3">
                  <input
                    aria-label={`Line ${index + 1} description`}
                    placeholder="What this line is for"
                    className="input-plain"
                    {...register(`items.${index}.description`, { required: 'Describe this line' })}
                  />
                  {errors.items?.[index]?.description && (
                    <p className="field-error">{errors.items[index]?.description?.message}</p>
                  )}
                </td>
                <td className="py-2">
                  <input
                    aria-label={`Line ${index + 1} quantity`}
                    type="number"
                    min={1}
                    className="input-plain text-right"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                  />
                </td>
                <td className="py-2">
                  <input
                    aria-label={`Line ${index + 1} unit price`}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="input-plain text-right"
                    {...register(`items.${index}.unitPrice`)}
                  />
                </td>
                <td className="py-4 text-right tabular-nums">
                  {formatMoney(lineTotal(index), currency)}
                </td>
                <td className="py-4 text-right">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove line ${index + 1}`}
                      className="text-muted text-sm hover:text-red-700"
                      onClick={() => remove(index)}
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex items-start justify-between gap-6">
          <button type="button" className="btn-ghost" onClick={() => append({ ...BLANK_ITEM })}>
            Add line
          </button>

          <dl className="w-full max-w-[280px] text-sm">
            <div className="flex justify-between py-1.5">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(total, currency)}</dd>
            </div>
            <div className="border-line mt-1.5 flex justify-between border-t pt-3 text-base">
              <dt className="font-medium">Balance due</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(total, currency)}</dd>
            </div>
          </dl>
        </div>

        <footer className="border-line mt-10 border-t pt-5">
          <label className="text-muted text-xs tracking-widest uppercase" htmlFor="invoice-notes">
            Notes
          </label>
          <textarea
            id="invoice-notes"
            rows={2}
            placeholder="Terms, or anything the client should read."
            className="input-plain mt-2"
            {...register('notes')}
          />
        </footer>
      </article>

      {formError && <p className="field-error mt-4">{formError}</p>}

      <div className="mt-6 flex items-center gap-4">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save draft'}
        </button>
        <p className="text-muted text-sm">Nothing is sent until you send it.</p>
      </div>
    </form>
  );
}
