'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { CountrySelect } from '@/components/country-select';
import { api } from '@/lib/client-fetch';
import { Tip } from '@/components/ui';
import { COUNTRIES, DEFAULT_ISO, findCountry } from '@/lib/countries';
import { MoreDetails, EMPTY_DETAILS, type ContactDetails } from '@/components/contact-details';
import { ProjectPicker, type ProjectChoice, type ProjectOption } from '@/components/project-picker';
import type { ContactRow } from './contacts-table';

/** Splits a stored number back into the country that dialled it and the rest. */
function splitPhone(stored: string | null): { iso: string; local: string } {
  if (!stored) return { iso: DEFAULT_ISO, local: '' };
  // Longest dial code first, so +971 wins over +9 for the same number.
  const match = [...COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((country) => stored.startsWith(country.dial));
  if (!match) return { iso: DEFAULT_ISO, local: stored.trim() };
  return { iso: match.iso, local: stored.slice(match.dial.length).trim() };
}

/** Changes a contact's own details. Where they work is set elsewhere. */
export function EditContactDialog({
  contact,
  onClose,
}: {
  contact: ContactRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const start = splitPhone(contact.phone);
  const [name, setName] = useState(contact.name);
  const [email, setEmail] = useState(contact.email ?? '');
  const [countryIso, setCountryIso] = useState(start.iso);
  const [phone, setPhone] = useState(start.local);
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
  const [choice, setChoice] = useState<ProjectChoice>({ kind: 'none' });

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
    setChoice({ kind: 'none' });
    if (picked.kind === 'none') return;
    setBusy(true);

    const { data, error: failure } =
      picked.kind === 'existing'
        ? await api(`/api/projects/${picked.id}/contacts`, {
            method: 'POST',
            body: { clientId: contact.id },
          }).then((result) => ({ data: { id: picked.id, name: picked.name }, error: result.error }))
        : await api<{ project: { id: string; name: string } }>('/api/projects', {
            method: 'POST',
            body: { name: picked.name, clientId: contact.id },
          }).then((result) => ({ data: result.data?.project ?? null, error: result.error }));

    setBusy(false);
    if (failure || !data) {
      setError(failure?.error ?? 'Could not put them on that project');
      return;
    }
    setError(null);
    // A project opened for them is theirs; one they joined they can leave.
    setOn((current) => [...current, { ...data, role: picked.kind === 'new' ? 'client' : 'contact' }]);
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
        name,
        email,
        phone: phone.trim() ? `${findCountry(countryIso).dial} ${phone.trim()}` : undefined,
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
          disabled={busy || name.trim() === '' || email.trim() === ''}
          className="btn-primary px-5 disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <div className="space-y-6">
        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="edit-contact-name">
              Full name <span aria-hidden>*</span>
            </label>
            <span className="text-muted text-sm tabular-nums">{name.length}/100</span>
          </div>
          <input
            id="edit-contact-name"
            autoFocus
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            className="input-soft"
          />
        </div>

        <div>
          <label className="label" htmlFor="edit-contact-email">
            Email address <span aria-hidden>*</span>
          </label>
          <input
            id="edit-contact-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFault('email');
            }}
            aria-invalid={Boolean(faults.email)}
            className={`input-soft ${faults.email ? 'ring-accent ring-1' : ''}`}
          />
          {faults.email && <p className="field-error">{faults.email}</p>}
        </div>

        <div>
          <label className="label" htmlFor="edit-contact-phone">
            Phone number
          </label>
          <div className="flex gap-3">
            <CountrySelect value={countryIso} onChange={setCountryIso} />
            <input
              id="edit-contact-phone"
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
                    <Tip label={`${contact.name} is the client ${project.name} is for`}>
                      <span aria-label="Client of this project" className="text-muted">
                        <Lock />
                      </span>
                    </Tip>
                  )}
                </li>
              ))}
            </ul>
          )}

          <ProjectPicker
            id="edit-contact-project"
            value={choice}
            projects={(all ?? []).filter(
              (project) => !on.some((held) => held.id === project.id),
            )}
            placeholder={on.length === 0 ? 'Put them on a project' : 'Add another project'}
            onChange={(picked) => void link(picked)}
          />
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
