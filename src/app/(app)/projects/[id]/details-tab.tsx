'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { InfoHint } from '@/components/ui';
import { CalendarIcon, TrashIcon } from './editor-kit';
import { ManageFieldsDialog, type CustomField } from './manage-fields-dialog';

export type ProjectDate = {
  id: string;
  title: string;
  startAt: string | null;
  endAt: string | null;
  allDay: boolean;
  availability: 'BUSY' | 'FREE';
  location: string | null;
};

export type DetailsProject = {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  location: string | null;
  timezone: string | null;
  dateTitle: string | null;
  availability: 'BUSY' | 'FREE';
  eventDate: string | null;
  endsAt: string | null;
  allDay: boolean;
};

const NAME_LIMIT = 100;

/** Every zone the browser knows, so nobody has to settle for a near miss. */
function zones(): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
    .supportedValuesOf;
  const list = supported ? supported('timeZone') : ['UTC'];
  return list.includes('UTC') ? list : ['UTC', ...list];
}

export function DetailsTab({
  project,
  types,
  dates,
  fields,
  values,
}: {
  project: DetailsProject;
  types: string[];
  dates: ProjectDate[];
  fields: CustomField[];
  values: { fieldId: string; value: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(project);
  const [rows, setRows] = useState(dates);
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(values.map((entry) => [entry.fieldId, entry.value])),
  );
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(patch: Partial<DetailsProject>) {
    setForm((now) => ({ ...now, ...patch }));
    const { error: failure } = await api(`/api/projects/${project.id}`, {
      method: 'PATCH',
      body: patch,
    });
    if (failure) setError(failure.error);
    router.refresh();
  }

  async function saveAnswer(fieldId: string, value: string) {
    setAnswers((now) => ({ ...now, [fieldId]: value }));
    await api(`/api/projects/${project.id}/fields`, {
      method: 'PUT',
      body: { values: [{ fieldId, value }] },
    });
    router.refresh();
  }

  async function addDate() {
    const { data, error: failure } = await api<{ date: ProjectDate }>(
      `/api/projects/${project.id}/dates`,
      { method: 'POST', body: { title: 'Additional date' } },
    );
    if (failure || !data) {
      setError(failure?.error ?? 'Could not add that date');
      return;
    }
    setRows((now) => [...now, data.date]);
    router.refresh();
  }

  async function patchDate(id: string, patch: Partial<ProjectDate>) {
    setRows((now) => now.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    await api(`/api/project-dates/${id}`, { method: 'PATCH', body: patch });
    router.refresh();
  }

  async function removeDate(id: string) {
    setRows((now) => now.filter((row) => row.id !== id));
    await api(`/api/project-dates/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-6">
      {/* ---- about ------------------------------------------------------ */}
      <section className="card p-0">
        <h2 className="border-line border-b px-6 py-4 font-semibold">About the project</h2>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <div className="flex items-baseline justify-between">
                <label className="label" htmlFor="detail-name">
                  Project name <span aria-hidden>*</span>
                </label>
                <span className="text-muted text-sm tabular-nums">
                  {form.name.length}/{NAME_LIMIT}
                </span>
              </div>
              <input
                id="detail-name"
                value={form.name}
                maxLength={NAME_LIMIT}
                onChange={(event) => setForm((now) => ({ ...now, name: event.target.value }))}
                onBlur={() =>
                  form.name.trim() && form.name !== project.name && save({ name: form.name.trim() })
                }
                className="input-soft"
              />
            </div>

            <div>
              <label className="label" htmlFor="detail-type">
                Project type <span aria-hidden>*</span>
              </label>
              <select
                id="detail-type"
                value={form.type ?? ''}
                onChange={(event) => void save({ type: event.target.value })}
                className="input-soft"
              >
                <option value="">Select</option>
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="detail-description">
              Description
            </label>
            <textarea
              id="detail-description"
              value={form.description ?? ''}
              rows={4}
              onChange={(event) => setForm((now) => ({ ...now, description: event.target.value }))}
              onBlur={() =>
                (form.description ?? '') !== (project.description ?? '') &&
                save({ description: form.description ?? '' })
              }
              placeholder="Add project description"
              className="input-soft h-auto py-2.5"
            />
          </div>
        </div>
      </section>

      {/* ---- dates ------------------------------------------------------ */}
      <section className="card p-0">
        <div className="border-line flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4">
          <h2 className="font-semibold">Date and location</h2>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Timezone:</span>
            <select
              value={form.timezone ?? ''}
              onChange={(event) => void save({ timezone: event.target.value })}
              aria-label="Timezone"
              className="input-soft w-[220px]"
            >
              <option value="">Not set</option>
              {zones().map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-5 px-6 py-5">
          <DateBlock
            heading="Primary date"
            title={form.dateTitle ?? form.name}
            startAt={form.eventDate}
            endAt={form.endsAt}
            allDay={form.allDay}
            availability={form.availability}
            location={form.location}
            onChange={(patch) =>
              void save({
                ...(patch.title === undefined ? {} : { dateTitle: patch.title }),
                ...(patch.startAt === undefined ? {} : { eventDate: patch.startAt }),
                ...(patch.endAt === undefined ? {} : { endsAt: patch.endAt }),
                ...(patch.allDay === undefined ? {} : { allDay: patch.allDay }),
                ...(patch.availability === undefined ? {} : { availability: patch.availability }),
                ...(patch.location === undefined ? {} : { location: patch.location }),
              })
            }
          />

          {rows.map((row) => (
            <DateBlock
              key={row.id}
              heading="Additional date"
              title={row.title}
              startAt={row.startAt}
              endAt={row.endAt}
              allDay={row.allDay}
              availability={row.availability}
              location={row.location}
              onChange={(patch) => void patchDate(row.id, patch)}
              onRemove={() => void removeDate(row.id)}
            />
          ))}

          <button
            type="button"
            onClick={() => void addDate()}
            className="text-accent flex items-center gap-2 font-medium hover:underline"
          >
            <span aria-hidden className="text-lg leading-none">
              +
            </span>
            Add another date
          </button>
        </div>
      </section>

      {/* ---- custom fields ---------------------------------------------- */}
      <section className="card p-0">
        <h2 className="border-line border-b px-6 py-4 font-semibold">Custom fields</h2>

        {fields.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-muted mx-auto max-w-sm">
              Add fields of your own to track the details that matter to your business.
            </p>
            <button
              type="button"
              onClick={() => setManaging(true)}
              className="text-accent mx-auto mt-4 flex items-center gap-2 font-medium hover:underline"
            >
              <span aria-hidden className="text-lg leading-none">
                +
              </span>
              Add custom fields
            </button>
          </div>
        ) : (
          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map((field) => (
                <FieldInput
                  key={field.id}
                  field={field}
                  value={answers[field.id] ?? ''}
                  onChange={(value) => void saveAnswer(field.id, value)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setManaging(true)}
              className="text-accent font-medium hover:underline"
            >
              Manage project fields
            </button>
          </div>
        )}
      </section>

      {error && <p className="field-error">{error}</p>}

      {managing && <ManageFieldsDialog fields={fields} onClose={() => setManaging(false)} />}
    </div>
  );
}

/** One date row: the primary one, or any of the extra ones under it. */
function DateBlock({
  heading,
  title,
  startAt,
  endAt,
  allDay,
  availability,
  location,
  onChange,
  onRemove,
}: {
  heading: string;
  title: string;
  startAt: string | null;
  endAt: string | null;
  allDay: boolean;
  availability: 'BUSY' | 'FREE';
  location: string | null;
  onChange: (patch: Partial<ProjectDate>) => void;
  onRemove?: () => void;
}) {
  const [name, setName] = useState(title);
  const [where, setWhere] = useState(location ?? '');
  /** Ids have to survive being used as selectors, so the heading is slugged. */
  const key = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const startDate = local(startAt);
  const endDate = local(endAt);
  const startTime = clock(startAt);
  const endTime = clock(endAt);

  /** Date and time are two controls over one stamp, so each edit rebuilds it. */
  function stamp(date: string, time: string): string {
    if (!date) return '';
    return new Date(`${date}T${allDay || !time ? '00:00' : time}`).toISOString();
  }

  return (
    <div className="border-line rounded-lg border p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
          {onRemove ? <BranchIcon className="h-4 w-4" /> : <CalendarIcon className="h-4 w-4" />}
          {heading}
        </p>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-muted hover:text-accent flex items-center gap-1.5 text-sm transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </button>
        )}
      </div>

      <div>
        <label className="label" htmlFor={`date-title-${key}`}>
          Title <span aria-hidden>*</span>
        </label>
        <input
          id={`date-title-${key}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => name.trim() && name !== title && onChange({ title: name.trim() })}
          className="input-soft"
        />
      </div>

      {/* Start and end read as one range, so they sit on a single line with
          the "to" between them. Times drop out entirely on an all day date. */}
      <div
        className={`mt-4 grid items-end gap-3 ${
          allDay ? 'sm:grid-cols-[1fr_auto_1fr]' : 'sm:grid-cols-[1fr_1fr_auto_1fr_1fr]'
        }`}
      >
        <Stamp
          id={`start-date-${key}`}
          label="Start date"
          kind="date"
          value={startDate}
          prompt="Choose start date"
          onChange={(value) => onChange({ startAt: stamp(value, startTime) })}
        />
        {!allDay && (
          <Stamp
            id={`start-time-${key}`}
            label="Start time"
            kind="time"
            value={startTime}
            prompt="Choose start time"
            disabled={!startDate}
            onChange={(value) => onChange({ startAt: stamp(startDate, value) })}
          />
        )}

        <span className="text-muted pb-3 text-sm">to</span>

        <Stamp
          id={`end-date-${key}`}
          label="End date"
          kind="date"
          value={endDate}
          prompt="Choose end date"
          onChange={(value) => onChange({ endAt: stamp(value, endTime) })}
        />
        {!allDay && (
          <Stamp
            id={`end-time-${key}`}
            label="End time"
            kind="time"
            value={endTime}
            prompt="Choose end time"
            disabled={!endDate}
            onChange={(value) => onChange({ endAt: stamp(endDate, value) })}
          />
        )}
      </div>

      <label className="mt-4 flex w-fit items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={allDay}
          onChange={(event) => onChange({ allDay: event.target.checked })}
          className="accent-brand-ink h-[18px] w-[18px]"
        />
        All day
      </label>

      <div className="mt-4">
        <label className="label flex items-center gap-1.5" htmlFor={`availability-${key}`}>
          Availability (after booking)
          <InfoHint text="How this date shows on your calendar once the work is booked. Busy blocks the time; free leaves it open." />
        </label>
        <select
          id={`availability-${key}`}
          value={availability}
          onChange={(event) => onChange({ availability: event.target.value as 'BUSY' | 'FREE' })}
          className="input-soft sm:w-[260px]"
        >
          <option value="BUSY">Busy</option>
          <option value="FREE">Free</option>
        </select>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor={`location-${key}`}>
          Location
        </label>
        <input
          id={`location-${key}`}
          value={where}
          onChange={(event) => setWhere(event.target.value)}
          onBlur={() => where !== (location ?? '') && onChange({ location: where })}
          placeholder="Enter address"
          className="input-soft"
        />
      </div>
    </div>
  );
}

/**
 * A native date or time control that reads as a prompt while it is empty: the
 * browser's own mm/dd/yyyy tells nobody which end of the range they are on.
 */
function Stamp({
  id,
  label,
  kind,
  value,
  prompt,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  kind: 'date' | 'time';
  value: string;
  prompt: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className={`label ${value ? '' : 'text-muted'}`} htmlFor={id}>
        {label}
      </label>
      <span className="relative block">
        <input
          id={id}
          type={kind}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={`input-soft disabled:opacity-50 ${value ? '' : 'text-transparent'}`}
        />
        {!value && (
          <span className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
            {prompt}
          </span>
        )}
      </span>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const id = `field-${field.id}`;
  const commit = () => draft !== value && onChange(draft);

  return (
    <div className={field.type === 'LONG_TEXT' ? 'sm:col-span-2' : ''}>
      <label className="label flex items-center gap-2" htmlFor={id}>
        {field.name}
        {!field.visibleToClient && <span className="text-muted text-xs">(private)</span>}
      </label>

      {field.type === 'LONG_TEXT' ? (
        <textarea
          id={id}
          value={draft}
          rows={3}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          className="input-soft h-auto py-2.5"
        />
      ) : field.type === 'SELECT' ? (
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="input-soft"
        >
          <option value="">Select</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={
            field.type === 'DATE'
              ? 'date'
              : field.type === 'NUMBER'
                ? 'number'
                : field.type === 'LINK'
                  ? 'url'
                  : 'text'
          }
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          className="input-soft"
        />
      )}
    </div>
  );
}

/** A stamp read back in local time, which is how it was typed in. */
function local(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-CA') : '';
}

function clock(iso: string | null): string {
  return iso ? new Date(iso).toTimeString().slice(0, 5) : '';
}

function BranchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 5v8a3 3 0 0 0 3 3h11" />
      <path d="m16 13 3 3-3 3" />
    </svg>
  );
}
