import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { SignInForm } from './sign-in-form';

export default async function SignInPage() {
  if (await getSession()) redirect('/dashboard');

  return (
    <>
      <h1 className="text-xl font-semibold">Welcome back</h1>
      <p className="text-muted mt-1 text-sm">Sign in to your workspace.</p>
      <SignInForm />
      <p className="text-muted mt-6 text-sm">
        New here?{' '}
        <Link href="/sign-up" className="text-accent font-medium">
          Create a workspace
        </Link>
      </p>
    </>
  );
}
