'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, showFailure } from '@/lib/client-fetch';

type Values = { currentPassword: string; newPassword: string; confirm: string };

/**
 * The one thing on this page that proves it is still you before it changes
 * anything: the old password has to be right, whatever else is typed.
 */
export function PasswordForm() {
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });

  async function onSubmit(values: Values) {
    setFormError(null);
    setDone(false);
    const { error } = await api('/api/settings/password', { method: 'POST', body: values });
    if (error) {
      showFailure(error, setError, setFormError);
      return;
    }
    reset({ currentPassword: '', newPassword: '', confirm: '' });
    setDone(true);
  }

  return (
    // The card runs the width of the page; the fields do not. A password box
    // as wide as a desk is harder to read back, not easier.
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2 className="text-[17px] font-semibold">Secure your account</h2>
      <div className="card mt-4 p-6">
        <p className="flex items-center gap-2.5 font-medium">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
          </svg>
          Change password
        </p>

        <div className="mt-5 max-w-md space-y-4">
          <div>
            <label className="label" htmlFor="current-password">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              className="input"
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <p className="field-error">{errors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className="input"
              {...register('newPassword')}
            />
            {errors.newPassword ? (
              <p className="field-error">{errors.newPassword.message}</p>
            ) : (
              <p className="text-muted mt-1.5 text-xs">Ten characters or more.</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="confirm-password">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className="input"
              {...register('confirm')}
            />
            {errors.confirm && <p className="field-error">{errors.confirm.message}</p>}
          </div>
        </div>

        {formError && <p className="field-error mt-4">{formError}</p>}

        <div className="mt-6 flex max-w-md items-center gap-4">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Changing…' : 'Change password'}
          </button>
          {done && <p className="text-muted text-sm">Changed.</p>}
        </div>

        <p className="text-muted mt-4 max-w-md text-xs leading-relaxed">
          Your other signed-in browsers stay signed in. This is a change, not a break-in.
        </p>
      </div>
    </form>
  );
}
