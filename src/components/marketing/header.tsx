import Link from 'next/link';

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-ink/5 bg-white">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-brand-ink">
          HANDLED
        </Link>

        <div className="flex items-center gap-5">
          <Link
            href="/sign-in"
            className="hidden text-sm font-medium underline underline-offset-8 sm:inline"
          >
            Log in
          </Link>
          <Link href="/sign-up" className="pill-dark px-5 py-2.5 text-sm">
            Get started for free
          </Link>
        </div>
      </div>
    </header>
  );
}
