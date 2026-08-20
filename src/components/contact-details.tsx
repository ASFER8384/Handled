'use client';

import { useState } from 'react';

/** The parts of a contact that are not needed to save one. */
export type ContactDetails = {
  lastInteractionAt: string;
  website: string;
  jobTitle: string;
  address: string;
  notes: string;
};

export const EMPTY_DETAILS: ContactDetails = {
  lastInteractionAt: '',
  website: '',
  jobTitle: '',
  address: '',
  notes: '',
};

/**
 * The fold at the bottom of every contact form. A name, an address and a
 * number are what it takes to reach somebody; the rest is worth having and not
 * worth being asked for, so it waits behind a heading.
 *
 * There is deliberately no organisation or company field: this is a one-person
 * tool, and there is nothing above a contact to file them under.
 */
export function MoreDetails({
  prefix,
  value,
  onChange,
}: {
  /** Keeps ids unique when two of these are on a page. */
  prefix: string;
  value: ContactDetails;
  onChange: (details: ContactDetails) => void;
}) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<ContactDetails>) => onChange({ ...value, ...patch });

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((shown) => !shown)}
        aria-expanded={open}
        className="flex items-center gap-1.5 font-semibold"
      >
        More details
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="mt-5 space-y-6">
          <Field label="Last interaction" htmlFor={`${prefix}-last`}>
            <input
              id={`${prefix}-last`}
              type="date"
              value={value.lastInteractionAt}
              onChange={(event) => set({ lastInteractionAt: event.target.value })}
              className="input-soft"
            />
          </Field>

          <Field label="Website" htmlFor={`${prefix}-website`}>
            <input
              id={`${prefix}-website`}
              value={value.website}
              onChange={(event) => set({ website: event.target.value })}
              placeholder="Add contact's website"
              className="input-soft"
            />
          </Field>

          <Field label="Job title" htmlFor={`${prefix}-job`}>
            <input
              id={`${prefix}-job`}
              value={value.jobTitle}
              onChange={(event) => set({ jobTitle: event.target.value })}
              placeholder="Add job title or role"
              className="input-soft"
            />
          </Field>

          <Field label="Mailing address" htmlFor={`${prefix}-address`}>
            <input
              id={`${prefix}-address`}
              value={value.address}
              onChange={(event) => set({ address: event.target.value })}
              placeholder="Add mailing address"
              className="input-soft"
            />
          </Field>

          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor={`${prefix}-notes`}>
                Additional info (only visible to you)
              </label>
              <span className="text-muted text-sm tabular-nums">{value.notes.length}/1000</span>
            </div>
            <textarea
              id={`${prefix}-notes`}
              rows={4}
              maxLength={1000}
              value={value.notes}
              onChange={(event) => set({ notes: event.target.value })}
              placeholder="Add some noteworthy info."
              className="input-soft h-auto py-2"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
