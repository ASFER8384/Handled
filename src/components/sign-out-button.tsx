'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="text-muted hover:text-foreground text-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut();
        router.push('/sign-in');
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
