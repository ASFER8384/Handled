'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { signIn } from '@/lib/auth-client';
import { signInSchema } from '@/lib/validation';

type Values = z.infer<typeof signInSchema>;

export function SignInForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(signInSchema) });

  async function onSubmit(values: Values) {
    setFormError(null);
    const { error } = await signIn.email({ email: values.email, password: values.password });
    if (error) {
      // Deliberately vague: never confirm whether an address has an account.
      setFormError('That email and password do not match');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      className="mt-6 space-y-4"
      noValidate
    >
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="input"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && <p className="field-error">{errors.email.message}</p>}
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="input"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password && <p className="field-error">{errors.password.message}</p>}
      </div>

      {formError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
