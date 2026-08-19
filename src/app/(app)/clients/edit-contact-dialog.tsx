'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { CountrySelect } from '@/components/country-select';
import { api } from '@/lib/client-fetch';
import { COUNTRIES, DEFAULT_ISO, findCountry } from '@/lib/countries';
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
  const [lastInteraction, setLastInteraction] = useState(
    contact.lastInteractionAt ? contact.lastInteractionAt.slice(0, 10) : '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faults, setFaults] = useState<Record<string, string>>({});

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
        lastInteractionAt: lastInteraction || undefined,
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
          <label className="label" htmlFor="edit-contact-last">
            Last interaction
          </label>
          <input
            id="edit-contact-last"
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
