'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { api } from '@/lib/client-fetch';
import { ContactFields, EMPTY_CORE, joinPhone, splitPhone, type ContactCore } from '@/components/contact-fields';
import { MoreDetails, EMPTY_DETAILS, type ContactDetails } from '@/components/contact-details';
import { ProjectPicker, type ProjectChoice, type ProjectOption } from '@/components/project-picker';

/**
 * Making a contact, wherever it is asked for — the Contacts page, the panel on
 * the home page, anywhere later. One dialog rather than one per doorway, so a
 * contact made in one place is the same contact made in another.
 *
 * They optionally land on a project as they are made: an existing one, or a new
 * one opened in the same breath. Somebody can just as well be in the book with
 * no work attached to them yet.
 */
export function NewContactDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  /** Called after it saves, for callers that close a panel of their own. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [core, setCore] = useState<ContactCore>(EMPTY_CORE);
  const [details, setDetails] = useState<ContactDetails>(EMPTY_DETAILS);
  // null while the list is still coming: nothing can be chosen until it is
  // here, so a new project is never opened by mistake in place of an existing
  // one that had simply not loaded yet.
  const [projects, setProjects] = useState<ProjectOption[] | null>(null);
  const [choice, setChoice] = useState<ProjectChoice>({ kind: 'none' });
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
        name: core.name,
        email: core.email,
        phone: joinPhone(core),
        lastInteractionAt: details.lastInteractionAt || undefined,
        website: details.website || undefined,
        jobTitle: details.jobTitle || undefined,
        address: details.address || undefined,
        notes: details.notes || undefined,
      },
    });

    if (failure || !data) {
      setBusy(false);
      setFaults(failure?.fields ?? {});
      setError(failure?.fields ? null : (failure?.error ?? 'Could not save that contact'));
      return;
    }

    // No project asked for: the contact is saved and that is the whole job.
    if (choice.kind === 'none') {
      setBusy(false);
      router.refresh();
      (onDone ?? onClose)();
      return;
    }

    const { error: projectFailure } =
      choice.kind === 'existing'
        ? await api(`/api/projects/${choice.id}/contacts`, {
            method: 'POST',
            body: { clientId: data.client.id },
          })
        : await api('/api/projects', {
            method: 'POST',
            body: { name: choice.name, clientId: data.client.id },
          });

    setBusy(false);
    if (projectFailure) {
      // The contact is saved either way; only the project half failed.
      setError(`${name} was saved, but the project could not be: ${projectFailure.error}`);
      router.refresh();
      return;
    }

    router.refresh();
    (onDone ?? onClose)();
  }

  const ready = core.name.trim() !== '' && core.email.trim() !== '';

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
        <ContactFields
          prefix="new-contact"
          value={core}
          onChange={setCore}
          faults={faults}
          onClearFault={clearFault}
          autoFocus
        />

        <div>
          <label className="label" htmlFor="new-contact-project">
            Project
          </label>
          <ProjectPicker
            id="new-contact-project"
            value={choice}
            projects={projects}
            onChange={setChoice}
          />

          <p className="text-muted mt-1.5 text-xs">
            Leave this alone to just save them to your contacts; you can put them on a project
            whenever the work turns up.
          </p>
        </div>

        <MoreDetails prefix="new-contact" value={details} onChange={setDetails} />

        {error && <p className="field-error">{error}</p>}
      </div>
    </Dialog>
  );
}
