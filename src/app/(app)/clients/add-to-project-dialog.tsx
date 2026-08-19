'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { api } from '@/lib/client-fetch';

type ProjectOption = { id: string; name: string };

/** Puts a contact you already have onto another piece of work. */
export function AddToProjectDialog({
  contactId,
  contactName,
  already,
  onClose,
}: {
  contactId: string;
  contactName: string;
  /** Projects they are on, which cannot be picked twice. */
  already: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOption[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stop = new AbortController();
    fetch('/api/projects', { signal: stop.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('projects'))))
      .then((payload: { projects?: ProjectOption[] }) => setProjects(payload.projects ?? []))
      .catch(() => setProjects([]));
    return () => stop.abort();
  }, []);

  async function add() {
    if (!picked) return;
    setBusy(true);
    const { error: failure } = await api(`/api/projects/${picked}/contacts`, {
      method: 'POST',
      body: { clientId: contactId },
    });
    setBusy(false);
    if (failure) {
      setError(failure.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <Dialog
      title={`Add ${contactName} to a project`}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy || !picked}
          className="btn-primary px-5 disabled:opacity-40"
        >
          {busy ? 'Adding…' : 'Add to project'}
        </button>
      }
    >
      <ul className="space-y-2.5">
        {projects === null && <li className="text-muted text-sm">Looking them up…</li>}
        {projects?.length === 0 && (
          <li className="text-muted text-sm">There are no projects to add them to yet.</li>
        )}
        {projects?.map((project) => {
          const on = already.includes(project.id);
          return (
            <li key={project.id}>
              <button
                type="button"
                disabled={on}
                onClick={() => setPicked(project.id)}
                aria-pressed={picked === project.id}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                  picked === project.id
                    ? 'border-accent bg-accent-soft/40'
                    : 'border-line hover:border-accent'
                } ${on ? 'opacity-45' : ''}`}
              >
                <span className="font-medium">{project.name}</span>
                {on && <span className="text-muted text-xs">Already on it</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {error && <p className="field-error mt-3">{error}</p>}
    </Dialog>
  );
}
