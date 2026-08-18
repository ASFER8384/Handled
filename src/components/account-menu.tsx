'use client';

import { useState } from 'react';
import { SignOutButton } from '@/components/sign-out-button';

/** Avatar in the top bar; the workspace and sign-out live behind it. */
export function AccountMenu({
  initials,
  name,
  email,
  workspace,
}: {
  initials: string;
  name: string;
  email: string;
  workspace: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        className="bg-accent-soft text-accent border-line flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold"
      >
        {initials}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div role="menu" className="card absolute right-0 z-20 mt-2 w-60 p-4 shadow-lg">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-muted truncate text-xs">{email}</p>
            <p className="border-line text-muted mt-3 truncate border-t pt-3 text-xs">
              {workspace}
            </p>
            <div className="mt-3">
              <SignOutButton />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
