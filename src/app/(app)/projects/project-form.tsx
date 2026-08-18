'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { parseMoneyToCents } from '@/lib/money';
import { api } from '@/lib/client-fetch';

type Values = {
  name: string;
  clientId: string;
  eventDate: string;
  value: string;
  description: string;
};

export function ProjectForm({ clients }: { clients: { id: string; name: string }[] }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues: { clientId: clients[0]?.id ?? '' } });

  async function onSubmit(values: Values) {
    setFormError(null);
    // The user types "2,500"; the wire only ever carries integer minor units.
    const valueCents = values.value.trim() === '' ? 0 : parseMoneyToCents(values.value);
    if (valueCents === null) {
      setFormError('Enter the project value as a number');
      return;
    }

    const { error } = await api('/api/projects', {
      method: 'POST',
      body: {
        name: values.name,
        clientId: values.clientId,
        eventDate: values.eventDate,
        description: values.description,
        valueCents,
      },
    });
    if (error) {
      setFormError(error.error);
      return;
    }
    reset({ clientId: values.clientId, name: '', eventDate: '', value: '', description: '' });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3" noValidate>
      <div>
        <label className="label" htmlFor="project-name">
          Project name
        </label>
        <input
          id="project-name"
          className="input"
          {...register('name', { required: 'Name this project' })}
        />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>

      <div>
        <label className="label" htmlFor="project-client">
          Client
        </label>
        <select id="project-client" className="input" {...register('clientId', { required: true })}>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="project-date">
          Event date
        </label>
        <input id="project-date" type="date" className="input" {...register('eventDate')} />
      </div>

      <div>
        <label className="label" htmlFor="project-value">
          Value
        </label>
        <input id="project-value" inputMode="decimal" className="input" {...register('value')} />
      </div>

      <div>
        <label className="label" htmlFor="project-description">
          Description
        </label>
        <textarea id="project-description" rows={3} className="input" {...register('description')} />
      </div>

      {formError && <p className="field-error">{formError}</p>}

      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Create project'}
      </button>
    </form>
  );
}
