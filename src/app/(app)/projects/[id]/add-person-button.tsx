'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddContactDialog } from './add-contact-dialog';

/**
 * The one way onto a project. Whoever is added here joins it and shows up in
 * the row alongside everybody else already on it.
 */
export function AddPersonButton({ projectId, exclude }: { projectId: string; exclude: string[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAdding(true)}
        aria-label="Add contact to project"
        title="Add contact to project"
        className="border-line text-muted hover:border-accent hover:text-accent flex h-10 w-10 items-center justify-center rounded-full border text-lg transition-colors"
      >
        +
      </button>

      {adding && (
        <AddContactDialog
          projectId={projectId}
          exclude={exclude}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
