'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { FormSelect } from '@/components/form-select';
import { formatMoney, parseMoneyToCents } from '@/lib/money';
import { api } from '@/lib/client-fetch';

type ClientOption = { id: string; name: string; projects: { id: string; name: string }[] };

type Values = {
  clientId: string;
  projectId: string;
  dueAt: string;
  notes: string;
  items: { description: string; quantity: number; unitPrice: string }[];
};

const BLANK_ITEM = { description: '', quantity: 1, unitPrice: '' };

export function InvoiceForm({
  clients,
  currency,
}: {
  clients: ClientOption[];
  currency: string;
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
      clientId: clients[0]?.id ?? '',
      projectId: '',
      dueAt: '',
      notes: '',
      items: [{ ...BLANK_ITEM }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watched = useWatch({ control, name: 'items' }) ?? [];
  const selectedClientId = useWatch({ control, name: 'clientId' });
  const projects = clients.find((client) => client.id === selectedClientId)?.projects ?? [];

  const total = watched.reduce((sum, item) => {
    const cents = parseMoneyToCents(item?.unitPrice ?? '') ?? 0;
    return sum + cents * Number(item?.quantity || 0);
  }, 0);

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
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6" noValidate>
      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="invoice-client">
            Client
          </label>
          <FormSelect
            id="invoice-client"
            control={control}
            name="clientId"
            placeholder="Pick a contact"
            options={clients.map((client) => ({ value: client.id, label: client.name }))}
          />
        </div>

        <div>
          <label className="label" htmlFor="invoice-project">
            Project
          </label>
          <FormSelect
            id="invoice-project"
            control={control}
            name="projectId"
            placeholder="No project"
            options={projects.map((project) => ({ value: project.id, label: project.name }))}
          />
        </div>

        <div>
          <label className="label" htmlFor="invoice-due">
            Due date
          </label>
          <input id="invoice-due" type="date" className="input" {...register('dueAt')} />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="invoice-notes">
            Notes
          </label>
          <textarea id="invoice-notes" rows={2} className="input" {...register('notes')} />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-medium">Line items</h2>

        <div className="mt-4 space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 items-start gap-2">
              <div className="col-span-6">
                <input
                  aria-label={`Line ${index + 1} description`}
                  placeholder="Description"
                  className="input"
                  {...register(`items.${index}.description`, { required: 'Describe this line' })}
                />
                {errors.items?.[index]?.description && (
                  <p className="field-error">{errors.items[index]?.description?.message}</p>
                )}
              </div>
              <div className="col-span-2">
                <input
                  aria-label={`Line ${index + 1} quantity`}
                  type="number"
                  min={1}
                  className="input"
                  {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                />
              </div>
              <div className="col-span-3">
                <input
                  aria-label={`Line ${index + 1} unit price`}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="input"
                  {...register(`items.${index}.unitPrice`)}
                />
              </div>
              <div className="col-span-1 pt-2 text-right">
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
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button type="button" className="btn-ghost" onClick={() => append({ ...BLANK_ITEM })}>
            Add line
          </button>
          <p className="text-sm">
            Total <span className="font-semibold tabular-nums">{formatMoney(total, currency)}</span>
          </p>
        </div>
      </div>

      {formError && <p className="field-error">{formError}</p>}

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Save draft'}
      </button>
    </form>
  );
}
