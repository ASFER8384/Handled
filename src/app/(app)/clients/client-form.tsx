'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientSchema, type ClientInput } from '@/lib/validation';
import { api } from '@/lib/client-fetch';

export function ClientForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({ resolver: zodResolver(clientSchema) });

  async function onSubmit(values: ClientInput) {
    setFormError(null);
    const { error } = await api('/api/clients', { method: 'POST', body: values });
    if (error) {
      setFormError(error.error);
      return;
    }
    reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3" noValidate>
      <div>
        <label className="label" htmlFor="client-name">
          Name
        </label>
        <input id="client-name" className="input" {...register('name')} />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>

      <div>
        <label className="label" htmlFor="client-company">
          Company
        </label>
        <input id="client-company" className="input" {...register('company')} />
      </div>

      <div>
        <label className="label" htmlFor="client-email">
          Email
        </label>
        <input id="client-email" type="email" className="input" {...register('email')} />
        {errors.email && <p className="field-error">Enter a valid email</p>}
      </div>

      <div>
        <label className="label" htmlFor="client-phone">
          Phone
        </label>
        <input id="client-phone" className="input" {...register('phone')} />
      </div>

      <div>
        <label className="label" htmlFor="client-notes">
          Notes
        </label>
        <textarea id="client-notes" rows={3} className="input" {...register('notes')} />
      </div>

      {formError && <p className="field-error">{formError}</p>}

      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Add client'}
      </button>
    </form>
  );
}
