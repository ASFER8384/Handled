import Link from 'next/link';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-sm font-semibold tracking-widest text-accent uppercase">
          Handled
        </Link>
        <div className="card mt-6 p-6">{children}</div>
      </div>
    </main>
  );
}
