'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Select } from '@/components/select';
import { api, showFailure } from '@/lib/client-fetch';
import { PHONE_CODES } from '@/lib/company-fields';

export type AccountValues = {
  name: string;
  jobTitle: string;
  phone: string;
  address: string;
};

/** You, as distinct from the business you run. */
export function AccountForm({
  values,
  email,
  phoneCode,
}: {
  values: AccountValues;
  email: string;
  phoneCode: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [code, setCode] = useState(phoneCode || '+971');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AccountValues>({ defaultValues: values });

  async function onSubmit(entered: AccountValues) {
    setFormError(null);
    setSaved(false);
    const { error } = await api('/api/settings/account', {
      method: 'PATCH',
      body: { ...entered, phoneCode: code },
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <section className="card p-6">
        <h2 className="font-medium">Manage your personal information</h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="account-name">
              Full name
            </label>
            <input id="account-name" className="input" maxLength={80} {...register('name')} />
            {errors.name && <p className="field-error">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="account-job">
              Job title
            </label>
            <input
              id="account-job"
              className="input"
              maxLength={60}
              placeholder="Photographer, owner…"
              {...register('jobTitle')}
            />
          </div>

          <div>
            <label className="label" htmlFor="account-email">
              Email address
            </label>
            <input id="account-email" className="input" value={email} disabled readOnly />
            <p className="text-muted mt-1.5 text-xs">
              What you sign in with. Changing it needs the password, under Security.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="account-phone">
              Phone number
            </label>
            <div className="flex gap-2">
              <Select
                ariaLabel="Dialling code"
                className="w-[116px] shrink-0"
                value={code}
                options={PHONE_CODES.map((entry) => ({ value: entry.code, label: entry.label }))}
                onChange={setCode}
              />
              <input id="account-phone" className="input" maxLength={40} {...register('phone')} />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="account-address">
              Personal address
            </label>
            <textarea
              id="account-address"
              rows={2}
              className="input"
              maxLength={300}
              {...register('address')}
            />
            <p className="text-muted mt-1.5 text-xs">
              Yours, not the business&rsquo;s. Nothing sent to a client prints this.
            </p>
          </div>
        </div>
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
