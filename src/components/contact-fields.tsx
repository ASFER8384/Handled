'use client';

import { CountrySelect } from '@/components/country-select';
import { DEFAULT_ISO, COUNTRIES, findCountry } from '@/lib/countries';

/** What it takes to reach somebody, and nothing else. */
export type ContactCore = {
  name: string;
  email: string;
  countryIso: string;
  phone: string;
};

export const EMPTY_CORE: ContactCore = {
  name: '',
  email: '',
  countryIso: DEFAULT_ISO,
  phone: '',
};

/** Splits a stored number back into the country that dialled it and the rest. */
export function splitPhone(stored: string | null | undefined): {
  countryIso: string;
  phone: string;
} {
  if (!stored) return { countryIso: DEFAULT_ISO, phone: '' };
  // Longest dial code first, so +971 wins over +9 for the same number.
  const match = [...COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((country) => stored.startsWith(country.dial));
  if (!match) return { countryIso: DEFAULT_ISO, phone: stored.trim() };
  return { countryIso: match.iso, phone: stored.slice(match.dial.length).trim() };
}

/** Puts the two halves back together for saving, or nothing if it is blank. */
export function joinPhone(core: ContactCore): string | undefined {
  const local = core.phone.trim();
  return local ? `${findCountry(core.countryIso).dial} ${local}` : undefined;
}

/**
 * The top of every contact form, wherever one is opened from. Written once so
 * the field that refuses a duplicate address on the Contacts page refuses it
 * the same way inside a project, and so they cannot drift apart again.
 */
export function ContactFields({
  prefix,
  value,
  onChange,
  faults = {},
  onClearFault,
  autoFocus,
}: {
  /** Keeps ids unique when two of these are on a page. */
  prefix: string;
  value: ContactCore;
  onChange: (core: ContactCore) => void;
  /** Server complaints, keyed by field, shown under the input they name. */
  faults?: Record<string, string>;
  onClearFault?: (field: string) => void;
  autoFocus?: boolean;
}) {
  const set = (patch: Partial<ContactCore>) => onChange({ ...value, ...patch });

  return (
    <>
      <div>
        <div className="flex items-baseline justify-between">
          <label className="label" htmlFor={`${prefix}-name`}>
            Full name <span aria-hidden>*</span>
          </label>
          <span className="text-muted text-sm tabular-nums">{value.name.length}/100</span>
        </div>
        <input
          id={`${prefix}-name`}
          autoFocus={autoFocus}
          value={value.name}
          maxLength={100}
          onChange={(event) => set({ name: event.target.value })}
          placeholder="Add full name"
          className="input-soft"
        />
      </div>

      <div>
        <label className="label" htmlFor={`${prefix}-email`}>
          Email address <span aria-hidden>*</span>
        </label>
        <input
          id={`${prefix}-email`}
          type="email"
          value={value.email}
          onChange={(event) => {
            set({ email: event.target.value });
            onClearFault?.('email');
          }}
          aria-invalid={Boolean(faults.email)}
          placeholder="Add email address"
          className={`input-soft ${faults.email ? 'ring-accent ring-1' : ''}`}
        />
        {faults.email && <p className="field-error">{faults.email}</p>}
      </div>

      <div>
        <label className="label" htmlFor={`${prefix}-phone`}>
          Phone number
        </label>
        <div className="flex gap-3">
          <CountrySelect
            value={value.countryIso}
            onChange={(countryIso) => set({ countryIso })}
          />
          <input
            id={`${prefix}-phone`}
            value={value.phone}
            onChange={(event) => {
              set({ phone: event.target.value });
              onClearFault?.('phone');
            }}
            aria-invalid={Boolean(faults.phone)}
            placeholder="50 123 4567"
            className={`input-soft ${faults.phone ? 'ring-accent ring-1' : ''}`}
          />
        </div>
        {faults.phone && <p className="field-error">{faults.phone}</p>}
      </div>
    </>
  );
}
