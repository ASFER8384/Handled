import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { SignUpForm } from './sign-up-form';

export default async function SignUpPage() {
  if (await getSession()) redirect('/dashboard');

  return (
    <>
      <h1 className="text-xl font-semibold">Create your workspace</h1>
      <p className="text-muted mt-1 text-sm">Free while you set things up.</p>
      <SignUpForm />
      <p className="text-muted mt-6 text-sm">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-accent font-medium">
          Sign in
        </Link>
      </p>
    </>
  );
}
