'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-fetch';
import { Dialog } from '@/components/dialog';
import type { ContactRow } from './contacts-table';

/**
 * Asks before a contact goes, and refuses outright while they are on a
 * project: their projects are set to go with them, so this is not a thing to
 * do by mistake. The way out is named rather than described — the projects
 * themselves are links.
 */
export function DeleteContactDialog({
  contact,
  onClose,
  onDeleted,
}: {
  contact: ContactRow;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const held = contact.projects;

  async function remove() {
    setBusy(true);
    const { error: failure } = await api(`/api/clients/${contact.id}`, { method: 'DELETE' });
    setBusy(false);
    if (failure) {
      setError(failure.error);
      return;
    }
    onDeleted();
  }

  return (
    <Dialog
      title={held.length > 0 ? 'This contact is on a project' : `Delete ${contact.name}?`}
      fit
      onClose={onClose}
      footer={
        held.length > 0 ? (
          <button type="button" onClick={onClose} className="btn-primary px-5">
            Close
          </button>
        ) : (
          <span className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="px-3 font-medium">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className="btn-primary bg-accent px-5 disabled:opacity-40"
            >
              {busy ? 'Deleting…' : 'Delete contact'}
            </button>
          </span>
        )
      }
    >
      {held.length > 0 ? (
        <div className="space-y-4">
          <p>
            <span className="font-medium">{contact.name}</span> is on{' '}
            {held.length === 1 ? 'a project' : `${held.length} projects`}, and deleting them would
            take that work with them.
          </p>

          <ul className="space-y-2">
            {held.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="border-line hover:border-accent flex items-center justify-between rounded-lg border px-4 py-3 transition-colors"
                >
                  <span className="font-medium">{project.name}</span>
                  <span className="text-muted text-xs">
                    {project.role === 'client' ? 'They are the client' : 'On the project'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="text-muted text-sm">
            Take them off any project they were added to, and hand over or delete the ones they are
            the client of. Then they can go.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p>
            <span className="font-medium">{contact.name}</span> will be removed from your contacts.
            This cannot be undone.
          </p>
          <p className="text-muted text-sm">
            They are on no projects, so nothing else goes with them.
          </p>
        </div>
      )}

      {error && <p className="field-error mt-4">{error}</p>}
    </Dialog>
  );
}
