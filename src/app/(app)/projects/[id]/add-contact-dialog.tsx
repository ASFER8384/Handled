'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { CountrySelect } from '@/components/country-select';
import { api } from '@/lib/client-fetch';
import { DEFAULT_ISO, findCountry } from '@/lib/countries';

export type Contact = { id: string; name: string; email: string | null };

export function AddContactDialog({
  projectId,
  exclude,
  onClose,
  onAdded,
}: {
  projectId: string;
  /** Client ids already on the project, shown but not addable twice. */
  exclude: string[];
  onClose: () => void;
  onAdded: (contact: Contact) => void;
}) {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryIso, setCountryIso] = useState(DEFAULT_ISO);
  const [phone, setPhone] = useState('');
  const [lastInteraction, setLastInteraction] = useState('');
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'existing' || contacts) return;
    void fetch('/api/clients')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { clients?: Contact[] } | null) => setContacts(payload?.clients ?? []))
      .catch(() => setContacts([]));
  }, [mode, contacts]);

  const matches = (contacts ?? []).filter((contact) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${contact.name} ${contact.email ?? ''}`.toLowerCase().includes(term);
  });

  async function add() {
    setBusy(true);
    const body =
      mode === 'existing'
        ? { clientId: picked }
        : {
            name,
            email,
            phone: phone.trim() ? `${findCountry(countryIso).dial} ${phone.trim()}` : undefined,
            lastInteractionAt: lastInteraction || undefined,
          };
    const { data, error: failure } = await api<{ contact: Contact }>(
      `/api/projects/${projectId}/contacts`,
      { method: 'POST', body },
    );
    setBusy(false);
    if (failure || !data) {
      setError(failure?.error ?? 'Could not add that contact');
      return;
    }
    onAdded(data.contact);
  }

  const ready = mode === 'existing' ? Boolean(picked) : name.trim() !== '' && email.trim() !== '';

  return (
    <Dialog
      title="Add contact to project"
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
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Add email address"
              className="input-soft"
            />
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
                onChange={(event) => setPhone(event.target.value)}
                placeholder="50 123 4567"
                className="input-soft"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="contact-last">
              Last interaction
            </label>
            <input
              id="contact-last"
              type="date"
              value={lastInteraction}
              onChange={(event) => setLastInteraction(event.target.value)}
              className="input-soft"
            />
          </div>

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
            {contacts === null && <li className="text-muted text-sm">Looking them up…</li>}
            {contacts !== null && matches.length === 0 && (
              <li className="text-muted text-sm">Nobody by that name yet.</li>
            )}
            {matches.map((contact) => {
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
                    {already && <span className="text-muted ml-auto text-xs">On this project</span>}
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

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
