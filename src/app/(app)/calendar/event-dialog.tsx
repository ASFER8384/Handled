'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { Select } from '@/components/select';
import { ConfirmDialog } from '@/components/confirm';
import { api } from '@/lib/client-fetch';

export type EventDraft = {
  id?: string;
  title: string;
  /** Local YYYY-MM-DD. */
  day: string;
  /** HH:MM, ignored when it takes the whole day. */
  from: string;
  to: string;
  allDay: boolean;
  location: string;
  note: string;
  projectId: string;
  clientId: string;
};

/** A link rather than a place: most meetings are a call these days. */
export function isLink(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function blankEvent(day: string): EventDraft {
  return {
    title: '',
    day,
    from: '09:00',
    to: '10:00',
    allDay: false,
    location: '',
    note: '',
    projectId: '',
    clientId: '',
  };
}

/**
 * A call, a viewing, a day off — put on the calendar because it is happening.
 *
 * Everything else the calendar draws belongs to work that already exists. This
 * is the one thing that can stand on its own, so the project and the contact
 * are offered rather than asked for: most of what fills a week is not a job
 * yet, and having to invent one in order to write down a meeting is how the
 * real diary ends up somewhere else.
 */
export function EventDialog({
  draft,
  projects,
  clients,
  onClose,
}: {
  draft: EventDraft;
  projects: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doomed, setDoomed] = useState(false);
  // Online unless it is plainly an address: a meeting is a link far more often
  // than it is a room, so that is what the field opens as.
  const [online, setOnline] = useState(draft.location === '' || isLink(draft.location));

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function save() {
    if (!form.title.trim()) {
      setError('Give it a name');
      return;
    }
    setSaving(true);
    setError(null);

    const { error: failure } = await api(form.id ? `/api/events/${form.id}` : '/api/events', {
      method: form.id ? 'PUT' : 'POST',
      body: {
        title: form.title,
        // All day is the day itself; otherwise the day with the time on it.
        startAt: form.allDay ? form.day : `${form.day}T${form.from || '09:00'}`,
        endAt: form.allDay ? '' : form.to ? `${form.day}T${form.to}` : '',
        allDay: form.allDay,
        location: form.location,
        note: form.note,
        projectId: form.projectId,
        clientId: form.clientId,
      },
    });
    setSaving(false);
    if (failure) {
      setError(failure.error);
      return;
    }
    onClose();
    router.refresh();
  }

  async function remove() {
    setSaving(true);
    const { error: failure } = await api(`/api/events/${form.id}`, { method: 'DELETE' });
    setSaving(false);
    if (failure) {
      setError(failure.error);
      setDoomed(false);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <>
      <Dialog
        fit
        width={520}
        title={form.id ? 'Edit event' : 'New event'}
        onClose={onClose}
        footer={
          <div className="flex items-center justify-between gap-3">
            {form.id ? (
              <button
                type="button"
                onClick={() => setDoomed(true)}
                className="text-muted text-sm hover:text-red-700"
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="btn-ghost">
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="btn-primary disabled:opacity-40"
              >
                {saving ? 'Saving…' : form.id ? 'Save changes' : 'Add to calendar'}
              </button>
            </div>
          </div>
        }
      >
        <label className="label" htmlFor="event-title">
          What is it?
        </label>
        <input
          id="event-title"
          autoFocus
          className="input-soft"
          placeholder="Call with the venue"
          value={form.title}
          onChange={(event) => set('title', event.target.value)}
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="event-day">
              Day
            </label>
            <input
              id="event-day"
              type="date"
              className="input-soft"
              value={form.day}
              onChange={(event) => set('day', event.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="event-from">
              From
            </label>
            <input
              id="event-from"
              type="time"
              className="input-soft disabled:opacity-40"
              disabled={form.allDay}
              value={form.from}
              onChange={(event) => set('from', event.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="event-to">
              To
            </label>
            <input
              id="event-to"
              type="time"
              className="input-soft disabled:opacity-40"
              disabled={form.allDay}
              value={form.to}
              onChange={(event) => set('to', event.target.value)}
            />
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="accent-accent h-4 w-4"
            checked={form.allDay}
            onChange={(event) => set('allDay', event.target.checked)}
          />
          All day
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            {/* Offered, never required: most of a week is not a job yet. */}
            <label className="label" htmlFor="event-project">
              Project
            </label>
            <Select
              id="event-project"
              value={form.projectId || null}
              placeholder="Nothing in particular"
              options={[
                { value: '', label: 'Nothing in particular' },
                ...projects.map((project) => ({ value: project.id, label: project.name })),
              ]}
              onChange={(value) => set('projectId', value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="event-client">
              Who with
            </label>
            <Select
              id="event-client"
              value={form.clientId || null}
              placeholder="Nobody in particular"
              searchable
              options={[
                { value: '', label: 'Nobody in particular' },
                ...clients.map((client) => ({ value: client.id, label: client.name })),
              ]}
              onChange={(value) => set('clientId', value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-4">
            <label className="label mb-0" htmlFor="event-location">
              {online ? 'Link' : 'Where'}
            </label>
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setOnline(true)}
                aria-pressed={online}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  online ? 'bg-accent-soft text-foreground font-medium' : 'text-muted'
                }`}
              >
                Online
              </button>
              <button
                type="button"
                onClick={() => setOnline(false)}
                aria-pressed={!online}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  online ? 'text-muted' : 'bg-accent-soft text-foreground font-medium'
                }`}
              >
                In person
              </button>
            </div>
          </div>
          <input
            id="event-location"
            type={online ? 'url' : 'text'}
            className="input-soft mt-1.5"
            placeholder={online ? 'Meet, Zoom or Teams link' : 'Their office, the venue'}
            value={form.location}
            onChange={(event) => set('location', event.target.value)}
          />
          {isLink(form.location) && (
            <a
              href={form.location}
              target="_blank"
              rel="noreferrer"
              className="text-accent mt-2 inline-flex items-center gap-1.5 text-sm hover:underline"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h6v6M21 3l-9 9M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
              </svg>
              Join the call
            </a>
          )}
        </div>

        <div className="mt-4">
          <label className="label" htmlFor="event-note">
            Note
          </label>
          <textarea
            id="event-note"
            rows={2}
            className="input-soft h-auto py-2"
            value={form.note}
            onChange={(event) => set('note', event.target.value)}
          />
        </div>

        {error && <p className="field-error mt-4">{error}</p>}
      </Dialog>

      {doomed && (
        <ConfirmDialog
          title="Delete this event?"
          body={`${form.title} comes off the calendar. Nothing else is touched.`}
          confirmLabel="Delete it"
          word="delete"
          busy={saving}
          onConfirm={remove}
          onClose={() => setDoomed(false)}
        />
      )}
    </>
  );
}
