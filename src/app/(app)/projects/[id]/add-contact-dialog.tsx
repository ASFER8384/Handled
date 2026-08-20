'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { CountrySelect } from '@/components/country-select';
import { api } from '@/lib/client-fetch';
import { DEFAULT_ISO, findCountry } from '@/lib/countries';
import { MoreDetails, EMPTY_DETAILS, type ContactDetails } from '@/components/contact-details';

export type Contact = { id: string; name: string; email: string | null };

/** A contact seen from one project: whose it is, and where else it appears. */
type Option = Contact & {
  relation: 'client' | 'linked' | 'other';
  /** Every project they are on, the one being looked at first. */
  projects: { name: string; here: boolean }[];
};

export function AddContactDialog({
  projectId,
  exclude,
  attach = true,
  onClose,
  onAdded,
}: {
  projectId: string;
  /** Ids that cannot be picked again, because they are already where this goes. */
  exclude: string[];
  /**
   * Whether this puts the contact on the project. False when it is only
   * choosing who an email goes to: a name typed there is saved to the address
   * book and put on the message, and the project is left alone.
   */
  attach?: boolean;
  onClose: () => void;
  onAdded: (contact: Contact) => void;
}) {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryIso, setCountryIso] = useState(DEFAULT_ISO);
  const [phone, setPhone] = useState('');
  const [details, setDetails] = useState<ContactDetails>(EMPTY_DETAILS);
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Option[] | null>(null);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which input is at fault, so the complaint sits under it.
  const [faults, setFaults] = useState<Record<string, string>>({});

  /** A complaint stops the moment the input it is about is touched. */
  function clearFault(field: string) {
    setFaults((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => key !== field)),
    );
  }

  // Fetched the moment the dialog opens rather than when the tab is switched,
  // so by the time anyone reaches the search the names are already sitting
  // there. A refused or dropped request says so and offers another go: it must
  // never be left waiting on a lookup that is never coming.
  useEffect(() => {
    const stop = new AbortController();
    fetch(`/api/projects/${projectId}/contacts`, { signal: stop.signal, cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('lookup'))))
      .then((payload: { contacts?: Option[] }) => setContacts(payload.contacts ?? []))
      .catch((reason: unknown) => {
        if ((reason as Error | null)?.name === 'AbortError') return;
        setContacts(null);
        setLookupFailed(true);
      });
    return () => stop.abort();
  }, [attempt, projectId]);

  const matches = (contacts ?? []).filter((contact) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${contact.name} ${contact.email ?? ''}`.toLowerCase().includes(term);
  });

  async function add() {
    // Picking someone who already exists, for an email only, writes nothing.
    if (!attach && mode === 'existing') {
      const chosen = (contacts ?? []).find((contact) => contact.id === picked);
      if (chosen) onAdded(chosen);
      return;
    }

    setBusy(true);
    setError(null);
    setFaults({});
    const payload = {
      name,
      email,
      phone: phone.trim() ? `${findCountry(countryIso).dial} ${phone.trim()}` : undefined,
      lastInteractionAt: details.lastInteractionAt || undefined,
      website: details.website || undefined,
      jobTitle: details.jobTitle || undefined,
      address: details.address || undefined,
      notes: details.notes || undefined,
    };

    const { data, error: failure } = attach
      ? await api<{ contact: Contact }>(`/api/projects/${projectId}/contacts`, {
          method: 'POST',
          body: mode === 'existing' ? { clientId: picked } : payload,
        })
      : await api<{ client: Contact }>('/api/clients', { method: 'POST', body: payload }).then(
          (result) => ({
            data: result.data ? { contact: result.data.client } : null,
            error: result.error,
          }),
        );
    setBusy(false);
    if (failure || !data) {
      // A named field carries its own message; only what has no home goes
      // to the foot of the form.
      setFaults(failure?.fields ?? {});
      setError(failure?.fields ? null : (failure?.error ?? 'Could not add that contact'));
      return;
    }
    onAdded(data.contact);
  }

  const ready = mode === 'existing' ? Boolean(picked) : name.trim() !== '' && email.trim() !== '';

  return (
    <Dialog
      title={attach ? 'Add contact to project' : 'Add a recipient'}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy || !ready}
          className="btn-primary px-5 disabled:opacity-40"
        >
          {busy ? 'Adding…' : attach ? 'Add to project' : 'Add to email'}
        </button>
      }
    >
      <div className="flex items-center gap-10">
        {(
          [
            ['new', 'Create new contact'],
            ['existing', 'Existing contact'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2.5 text-sm">
            <input
              type="radio"
              name="contact-mode"
              checked={mode === value}
              onChange={() => setMode(value)}
              className="accent-brand-ink h-[18px] w-[18px]"
            />
            {label}
          </label>
        ))}
      </div>

      {mode === 'new' ? (
        <div className="mt-6 space-y-6">
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="contact-name">
                Full name <span aria-hidden>*</span>
              </label>
              <span className="text-muted text-sm tabular-nums">{name.length}/100</span>
            </div>
            <input
              id="contact-name"
              autoFocus
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              placeholder="Add full name"
              className="input-soft"
            />
          </div>

          <div>
            <label className="label" htmlFor="contact-email">
              Email address <span aria-hidden>*</span>
            </label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearFault('email');
              }}
              aria-invalid={Boolean(faults.email)}
              aria-describedby={faults.email ? 'contact-email-error' : undefined}
              placeholder="Add email address"
              className={`input-soft ${faults.email ? 'ring-accent ring-1' : ''}`}
            />
            {faults.email && (
              <p id="contact-email-error" className="field-error">
                {faults.email}
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="contact-phone">
              Phone number
            </label>
            <div className="flex gap-3">
              <CountrySelect value={countryIso} onChange={setCountryIso} />
              <input
                id="contact-phone"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  clearFault('phone');
                }}
                aria-invalid={Boolean(faults.phone)}
                aria-describedby={faults.phone ? 'contact-phone-error' : undefined}
                placeholder="50 123 4567"
                className={`input-soft ${faults.phone ? 'ring-accent ring-1' : ''}`}
              />
            </div>
            {faults.phone && (
              <p id="contact-phone-error" className="field-error">
                {faults.phone}
              </p>
            )}
          </div>

        <MoreDetails prefix="contact" value={details} onChange={setDetails} />

          {error && <p className="field-error">{error}</p>}
        </div>
      ) : (
        <div className="mt-6">
          <div className="input-soft focus-within:bg-black/[0.05] flex items-center gap-2">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="text-muted h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Type to search contact"
              aria-label="Search contacts"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <ul className="mt-4 space-y-2.5">
            {contacts === null &&
              !lookupFailed &&
              [0, 1, 2].map((row) => (
                <li
                  key={row}
                  aria-hidden
                  className="border-line flex animate-pulse items-center gap-3 rounded-lg border px-4 py-3"
                >
                  <span className="h-9 w-9 shrink-0 rounded-full bg-black/[0.07]" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-1/3 rounded bg-black/[0.07]" />
                    <span className="block h-3 w-1/2 rounded bg-black/[0.05]" />
                  </span>
                </li>
              ))}
            {contacts === null && !lookupFailed && (
              <li aria-live="polite" className="sr-only">
                Looking them up…
              </li>
            )}

            {lookupFailed && (
              <li className="border-line rounded-lg border border-dashed px-4 py-5 text-center">
                <p className="text-muted text-sm">That list did not load.</p>
                <button
                  type="button"
                  onClick={() => {
                    setLookupFailed(false);
                    setAttempt((count) => count + 1);
                  }}
                  className="text-accent mt-1 text-sm font-medium hover:underline"
                >
                  Try again
                </button>
              </li>
            )}

            {contacts !== null && matches.length === 0 && (
              <li className="text-muted text-sm">
                {contacts.length === 0
                  ? 'No contacts saved yet. Create one instead.'
                  : 'Nobody by that name yet.'}
              </li>
            )}
            {matches.map((contact) => {
              // The only thing that rules a row out is being on the email
              // already. Anyone taken off it can always be put back.
              const already = exclude.includes(contact.id);
              return (
                <li key={contact.id}>
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => setPicked(contact.id)}
                    aria-pressed={picked === contact.id}
                    className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                      picked === contact.id
                        ? 'border-accent bg-accent-soft/40'
                        : 'border-line hover:border-accent'
                    } ${already ? 'opacity-45' : ''}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-xs font-semibold">
                      {initials(contact.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{contact.name}</span>
                      <span className="text-muted block truncate text-sm">
                        {contact.email ?? 'No email on file'}
                      </span>
                    </span>
                    <span className="text-muted ml-auto shrink-0 pl-3 text-xs">
                      {belonging(contact, exclude)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {error && <p className="field-error mt-3">{error}</p>}
        </div>
      )}
    </Dialog>
  );
}

/**
 * Where a contact stands: on this email already, or the projects they belong
 * to. This project is named too — somebody on it and on another needs both
 * halves to make sense, and a blank says neither.
 */
function belonging(contact: Option, exclude: string[]): string {
  if (exclude.includes(contact.id)) return 'Added';
  if (contact.projects.length === 0) return '';

  const named = contact.projects.map((entry) => (entry.here ? 'This project' : entry.name));
  const shown = named.slice(0, 2).join(', ');
  return named.length > 2 ? `${shown} +${named.length - 2}` : shown;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
