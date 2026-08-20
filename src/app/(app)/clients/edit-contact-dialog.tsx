'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { api } from '@/lib/client-fetch';
import { Tip } from '@/components/ui';
import {
  ContactFields,
  EMPTY_CORE,
  joinPhone,
  splitPhone,
  type ContactCore,
} from '@/components/contact-fields';
import { MoreDetails, EMPTY_DETAILS, type ContactDetails } from '@/components/contact-details';
import {
  ProjectChoiceFields,
  projectChosen,
  type ProjectChoice,
  type ProjectOption,
} from '@/components/project-picker';
import type { ContactRow } from './contacts-table';

/** Changes a contact's own details. Where they work is set elsewhere. */
export function EditContactDialog({
  contact,
  onClose,
}: {
  contact: ContactRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [core, setCore] = useState<ContactCore>({
    ...EMPTY_CORE,
    name: contact.name,
    email: contact.email ?? '',
    ...splitPhone(contact.phone),
  });
  const [details, setDetails] = useState<ContactDetails>({
    ...EMPTY_DETAILS,
    lastInteractionAt: contact.lastInteractionAt ? contact.lastInteractionAt.slice(0, 10) : '',
    website: contact.website ?? '',
    jobTitle: contact.jobTitle ?? '',
    address: contact.address ?? '',
    notes: contact.notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faults, setFaults] = useState<Record<string, string>>({});

  // The work they are on, changed here and there rather than on save: each is
  // its own tie, and undoing one should not wait on the rest of the form.
  const [on, setOn] = useState(contact.projects);
  const [all, setAll] = useState<ProjectOption[] | null>(null);
  const [choice, setChoice] = useState<ProjectChoice>({ kind: 'new', name: '' });

  // Adding is its own button here rather than happening on selection: the
  // choice has two halves now, and half a choice must not fire.
  const readyToLink = projectChosen(choice);

  useEffect(() => {
    const stop = new AbortController();
    fetch('/api/projects', { signal: stop.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('projects'))))
      .then((payload: { projects?: ProjectOption[] }) => setAll(payload.projects ?? []))
      .catch(() => setAll([]));
    return () => stop.abort();
  }, []);

  async function unlink(projectId: string) {
    setBusy(true);
    const { error: failure } = await api(`/api/projects/${projectId}/contacts/${contact.id}`, {
      method: 'DELETE',
    });
    setBusy(false);
    if (failure) {
      setError(failure.error);
      return;
    }
    setError(null);
    setOn((current) => current.filter((project) => project.id !== projectId));
    router.refresh();
  }

  async function link(picked: ProjectChoice) {
    setChoice({ kind: 'new', name: '' });
    if (!projectChosen(picked)) return;
    setBusy(true);

    const { data, error: failure } =
      picked.kind === 'existing'
        ? await api(`/api/projects/${picked.id}/contacts`, {
            method: 'POST',
            body: { clientId: contact.id },
          }).then((result) => ({ data: { id: picked.id, name: picked.name }, error: result.error }))
        : await api<{ project: { id: string; name: string } }>('/api/projects', {
            method: 'POST',
            body: { name: picked.name.trim(), clientId: contact.id },
          }).then((result) => ({ data: result.data?.project ?? null, error: result.error }));

    setBusy(false);
    if (failure || !data) {
      setError(failure?.error ?? 'Could not put them on that project');
      return;
    }
    setError(null);
    // A project opened for them is theirs; one they joined they can leave.
    setOn((current) => [
      ...current,
      { ...data, role: picked.kind === 'new' ? 'client' : 'contact' },
    ]);
    router.refresh();
  }

  function clearFault(field: string) {
    setFaults((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => key !== field)),
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    setFaults({});

    const { error: failure } = await api(`/api/clients/${contact.id}`, {
      method: 'PATCH',
      body: {
        name: core.name,
        email: core.email,
        phone: joinPhone(core),
        lastInteractionAt: details.lastInteractionAt || undefined,
        website: details.website || undefined,
        jobTitle: details.jobTitle || undefined,
        address: details.address || undefined,
        notes: details.notes || undefined,
        tags: contact.tags,
      },
    });

    setBusy(false);
    if (failure) {
      setFaults(failure.fields ?? {});
      setError(failure.fields ? null : failure.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <Dialog
      title="Edit contact"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || core.name.trim() === '' || core.email.trim() === ''}
          className="btn-primary px-5 disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <div className="space-y-6">
        <ContactFields
          prefix="edit-contact"
          value={core}
          onChange={setCore}
          faults={faults}
          onClearFault={clearFault}
          autoFocus
        />

        <div>
          <p className="label">Projects</p>
          {on.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {on.map((project) => (
                <li
                  key={project.id}
                  className="flex items-center gap-1.5 rounded-full bg-black/[0.05] py-1 pr-2 pl-3 text-sm"
                >
                  {project.name}
                  {project.role === 'contact' ? (
                    <Tip label={`Take ${contact.name} off ${project.name}`}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void unlink(project.id)}
                        aria-label={`Take ${contact.name} off ${project.name}`}
                        className="text-muted hover:text-accent disabled:opacity-40"
                      >
                        <Cross />
                      </button>
                    </Tip>
                  ) : (
                    <Tip label="Client of this project. Change it on the project page.">
                      <span aria-label="Client of this project" className="text-muted">
                        <Lock />
                      </span>
                    </Tip>
                  )}
                </li>
              ))}
            </ul>
          )}

          <ProjectChoiceFields
            prefix="edit-contact"
            value={choice}
            projects={all}
            exclude={on.map((project) => project.id)}
            contactName={contact.name}
            onChange={setChoice}
          />

          <button
            type="button"
            disabled={busy || !readyToLink}
            onClick={() => void link(choice)}
            className="btn-ghost mt-3 px-4 disabled:opacity-40"
          >
            {busy ? 'Adding…' : 'Add to project'}
          </button>
        </div>

        <MoreDetails prefix="edit-contact" value={details} onChange={setDetails} />

        {error && <p className="field-error">{error}</p>}
      </div>
    </Dialog>
  );
}

function Cross() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function Lock() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="10.5" width="14" height="9" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
