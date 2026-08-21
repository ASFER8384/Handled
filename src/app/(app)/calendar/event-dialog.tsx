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
          <label className="label" htmlFor="event-location">
            Where
          </label>
          <input
            id="event-location"
            className="input-soft"
            placeholder="Their office, a call, the venue"
            value={form.location}
            onChange={(event) => set('location', event.target.value)}
          />
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
