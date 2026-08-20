'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { CountrySelect } from '@/components/country-select';
import { api } from '@/lib/client-fetch';
import { DEFAULT_ISO, findCountry } from '@/lib/countries';

type ProjectOption = { id: string; name: string };

/**
 * A contact, optionally landing on a project as it is made: an existing one,
 * or a new one opened in the same breath. Somebody can just as well be in the
 * book with no work attached to them yet.
 */
export function NewContactDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryIso, setCountryIso] = useState(DEFAULT_ISO);
  const [phone, setPhone] = useState('');
  const [lastInteraction, setLastInteraction] = useState('');
  // null while the list is still coming: nothing can be chosen until it is
  // here, so a new project is never opened by mistake in place of an existing
  // one that had simply not loaded yet.
  const [projects, setProjects] = useState<ProjectOption[] | null>(null);
  const [projectId, setProjectId] = useState('');
  const [newProject, setNewProject] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faults, setFaults] = useState<Record<string, string>>({});

  useEffect(() => {
    const stop = new AbortController();
    fetch('/api/projects', { signal: stop.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('projects'))))
      .then((payload: { projects?: ProjectOption[] }) => setProjects(payload.projects ?? []))
      .catch(() => setProjects([]));
    return () => stop.abort();
  }, []);

  function clearFault(field: string) {
    setFaults((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => key !== field)),
    );
  }

  async function create() {
    setBusy(true);
    setError(null);
    setFaults({});

    const { data, error: failure } = await api<{ client: { id: string } }>('/api/clients', {
      method: 'POST',
      body: {
        name,
        email,
        phone: phone.trim() ? `${findCountry(countryIso).dial} ${phone.trim()}` : undefined,
        lastInteractionAt: lastInteraction || undefined,
      },
    });

    if (failure || !data) {
      setBusy(false);
      setFaults(failure?.fields ?? {});
      setError(failure?.fields ? null : (failure?.error ?? 'Could not save that contact'));
      return;
    }

    // No project asked for: the contact is saved and that is the whole job.
    if (projectId === '') {
      setBusy(false);
      router.refresh();
      onClose();
      return;
    }

    // A chosen project takes them on; NEW opens one. A typed name that turns
    // out to match an existing project joins that rather than making a second.
    const wanted = newProject.trim();
    const existing =
      projectId === 'new'
        ? (projects ?? []).find((entry) => entry.name.toLowerCase() === wanted.toLowerCase())
        : (projects ?? []).find((entry) => entry.id === projectId);

    const { error: projectFailure } = existing
      ? await api(`/api/projects/${existing.id}/contacts`, {
          method: 'POST',
          body: { clientId: data.client.id },
        })
      : await api('/api/projects', {
          method: 'POST',
          body: { name: wanted, clientId: data.client.id },
        });

    setBusy(false);
    if (projectFailure) {
      // The contact is saved either way; only the project half failed.
      setError(`${name} was saved, but the project could not be: ${projectFailure.error}`);
      router.refresh();
      return;
    }

    router.refresh();
    onClose();
  }

  // A project is optional, but a half-named new one is not a project yet.
  const projectSettled = projectId !== 'new' || newProject.trim() !== '';
  const ready = name.trim() !== '' && email.trim() !== '' && projectSettled;

  return (
    <Dialog
      title="Create new contact"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => void create()}
          disabled={busy || !ready}
          className="btn-primary px-5 disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Create contact'}
        </button>
      }
    >
      <div className="space-y-6">
        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="new-contact-name">
              Full name <span aria-hidden>*</span>
            </label>
            <span className="text-muted text-sm tabular-nums">{name.length}/100</span>
          </div>
          <input
            id="new-contact-name"
            autoFocus
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            placeholder="Add full name"
            className="input-soft"
          />
        </div>

        <div>
          <label className="label" htmlFor="new-contact-email">
            Email address <span aria-hidden>*</span>
          </label>
          <input
            id="new-contact-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFault('email');
            }}
            aria-invalid={Boolean(faults.email)}
            placeholder="Add email address"
            className={`input-soft ${faults.email ? 'ring-accent ring-1' : ''}`}
          />
          {faults.email && <p className="field-error">{faults.email}</p>}
        </div>

        <div>
          <label className="label" htmlFor="new-contact-phone">
            Phone number
          </label>
          <div className="flex gap-3">
            <CountrySelect value={countryIso} onChange={setCountryIso} />
            <input
              id="new-contact-phone"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                clearFault('phone');
              }}
              aria-invalid={Boolean(faults.phone)}
              placeholder="50 123 4567"
              className={`input-soft ${faults.phone ? 'ring-accent ring-1' : ''}`}
            />
          </div>
          {faults.phone && <p className="field-error">{faults.phone}</p>}
        </div>

        <div>
          <label className="label" htmlFor="new-contact-project">
            Project
          </label>
          <select
            id="new-contact-project"
            value={projectId}
            disabled={projects === null}
            onChange={(event) => setProjectId(event.target.value)}
            className="input-soft"
          >
            <option value="">
              {projects === null ? 'Loading your projects…' : 'No project for now'}
            </option>
            {(projects ?? []).map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
            <option value="new">＋ Open a new project</option>
          </select>

          {projectId === 'new' && (
            <input
              autoFocus
              value={newProject}
              onChange={(event) => setNewProject(event.target.value)}
              aria-label="New project name"
              placeholder="Name the new project"
              className="input-soft mt-2"
            />
          )}

          <p className="text-muted mt-1.5 text-xs">
            Leave this alone to just save them to your contacts; you can put them on a project
            whenever the work turns up.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="new-contact-last">
            Last interaction
          </label>
          <input
            id="new-contact-last"
            type="date"
            value={lastInteraction}
            onChange={(event) => setLastInteraction(event.target.value)}
            className="input-soft"
          />
        </div>

        {error && <p className="field-error">{error}</p>}
      </div>
    </Dialog>
  );
}
