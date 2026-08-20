'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { api, showFailure } from '@/lib/client-fetch';

type Values = { name: string };

/** Your name, as it signs the things you send. */
export function AccountForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({ defaultValues: { name } });

  async function onSubmit(values: Values) {
    setFormError(null);
    setSaved(false);
    const { error } = await api('/api/settings/account', { method: 'PATCH', body: values });
    if (error) {
      showFailure(error, setError, setFormError);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card max-w-xl p-6" noValidate>
      <h2 className="font-medium">Who you are</h2>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="account-name">
            Name
          </label>
          <input id="account-name" className="input" maxLength={80} {...register('name')} />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="account-email">
            Email
          </label>
          <input id="account-email" className="input" value={email} disabled readOnly />
          <p className="text-muted mt-1.5 text-xs">
            This is what you sign in with. Changing it comes with the password.
          </p>
        </div>
      </div>

      {formError && <p className="field-error mt-4">{formError}</p>}

      <div className="mt-6 flex items-center gap-4">
        <button type="submit" className="btn-primary" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
        {saved && !isDirty && <p className="text-muted text-sm">Saved.</p>}
      </div>
    </form>
  );
}
