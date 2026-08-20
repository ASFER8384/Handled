'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { Select } from '@/components/select';
import { api } from '@/lib/client-fetch';

type ProjectOption = { id: string; name: string };

/**
 * Puts a contact on a piece of work: one that exists, or one opened under a
 * name typed here. Which of the two it is chosen outright rather than inferred
 * from what was typed, so a name close to an existing project cannot quietly
 * open a second one beside it.
 */
export function AddToProjectDialog({
  contactId,
  contactName,
  already,
  onAdded,
  onClose,
}: {
  contactId: string;
  contactName: string;
  /** Projects they are on, which cannot be picked twice. */
  already: string[];
  /**
   * The project they were just put on, so the row can show it at once. The
   * page behind this is rendered on the server and takes a moment to catch
   * up; without this the chip is simply missing until it does, which reads
   * as nothing having happened.
   */
  onAdded?: (project: { id: string; name: string; role: 'client' | 'contact' }) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [name, setName] = useState('');
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

  const open = (projects ?? []).filter((project) => !already.includes(project.id));

  async function add() {
    setBusy(true);
    setError(null);

    if (mode === 'existing') {
      const { error: failure } = await api(`/api/projects/${picked}/contacts`, {
        method: 'POST',
        body: { clientId: contactId },
      });
      setBusy(false);
      if (failure) {
        setError(failure.error);
        return;
      }
      // They join a project that already has a client, so they are on it.
      const project = open.find((entry) => entry.id === picked);
      if (project) onAdded?.({ ...project, role: 'contact' });
    } else {
      const { data, error: failure } = await api<{ project: { id: string; name: string } }>(
        '/api/projects',
        { method: 'POST', body: { name: name.trim(), clientId: contactId } },
      );
      setBusy(false);
      if (failure || !data) {
        setError(failure?.error ?? 'Could not open that project');
        return;
      }
      // A project opened here is opened for them: they are its client.
      onAdded?.({ id: data.project.id, name: data.project.name, role: 'client' });
    }

    router.refresh();
    onClose();
  }

  const ready = mode === 'existing' ? Boolean(picked) : name.trim() !== '';

  return (
    <Dialog
      title={`Add ${contactName} to project`}
      fit
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy || !ready}
          className="btn-primary px-5 disabled:opacity-40"
        >
          {busy ? 'Adding…' : 'Add to project'}
        </button>
      }
    >
      <div className="flex items-center gap-10">
        {(
          [
            ['new', 'New project'],
            ['existing', 'Existing project'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2.5 text-sm">
            <input
              type="radio"
              name="add-to-project-mode"
              checked={mode === value}
              onChange={() => setMode(value)}
              className="accent-brand-ink h-[18px] w-[18px]"
            />
            {label}
          </label>
        ))}
      </div>

      <div className="mt-6">
        {mode === 'new' ? (
          <>
            <label className="sr-only" htmlFor="add-project-name">
              Project name
            </label>
            <input
              id="add-project-name"
              autoFocus
              value={name}
              maxLength={140}
              onChange={(event) => setName(event.target.value)}
              placeholder="Project name"
              className="input-soft"
            />
            <p className="text-muted mt-1.5 text-sm">
              A new project will be created with this contact as its client.
            </p>
          </>
        ) : (
          <>
            <Select
              id="add-project-existing"
              ariaLabel="Existing project"
              placeholder={projects === null ? 'Loading your projects…' : 'Pick a project'}
              disabled={projects === null}
              searchable
              value={picked}
              options={open.map((project) => ({ value: project.id, label: project.name }))}
              onChange={setPicked}
            />
            <p className="text-muted mt-1.5 text-sm">
              {projects === null
                ? 'Fetching what you have open.'
                : open.length === 0
                  ? `${contactName} is already on every project you have.`
                  : 'They join the project alongside whoever is already on it.'}
            </p>
          </>
        )}
      </div>

      <p className="text-muted mt-6 flex items-start gap-2.5 text-sm">
        <BulbIcon />
        Projects are where the emails, files and money for a piece of work live.
      </p>

      {error && <p className="field-error mt-4">{error}</p>}
    </Dialog>
  );
}

function BulbIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="mt-0.5 h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.3.3.5.7.5 1.1v1h6v-1c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3Z" />
    </svg>
  );
}
