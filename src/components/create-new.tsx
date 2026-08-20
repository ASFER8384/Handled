'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Dialog } from '@/components/dialog';
import { InfoHint, Tip } from '@/components/ui';
import { api } from '@/lib/client-fetch';
import { NewContactDialog } from '@/components/new-contact-dialog';
import { FormSelect } from '@/components/form-select';

// Schemas that coerce dates have an output type the form never holds, so these
// forms carry their own shape and let the route do the validating.
type TaskValues = { title: string; projectId: string; dueAt: string; dueTime: string };

export type CreateItem = { key: string; label: string; icon: string; href?: string };

type ClientOption = { id: string; name: string };

export function CreateNew({ items }: { items: CreateItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);

  function choose(item: CreateItem) {
    if (item.href) {
      router.push(item.href);
      return;
    }
    setOpen(item.key);
  }

  const close = () => setOpen(null);
  const done = () => {
    setOpen(null);
    router.refresh();
  };

  return (
    <>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => choose(item)}
              className="border-line hover:border-accent/50 hover:bg-accent-soft/30 flex h-[52px] w-full items-center gap-3 rounded-lg border px-4 text-left font-semibold transition-colors"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="text-accent h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      {open === 'contact' && <ContactDialog onClose={close} onDone={done} />}
      {open === 'project' && <ProjectDialog onClose={close} onDone={done} />}
      {open === 'task' && <TaskDialog onClose={close} onDone={done} />}
    </>
  );
}

/** The Projects page has its own entry point into the same dialog. */
export function CreateProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary px-4">
        Create new
      </button>
      {open && (
        <ProjectDialog
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

export function CreateTaskButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary px-4">
        Add task
      </button>
      {open && (
        <TaskDialog
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

/**
 * Lives in the dialog footer, outside the form element — `form` ties it back to
 * the form it submits, so the footer can stay pinned while the body scrolls.
 */
function Submit({ form, label, busy }: { form: string; label: string; busy: boolean }) {
  return (
    <button type="submit" form={form} className="btn-primary px-5" disabled={busy}>
      {busy ? 'Saving…' : label}
    </button>
  );
}

function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function ContactDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  return <NewContactDialog onClose={onClose} onDone={onDone} />;
}

const PROJECT_TYPES = [
  'Wedding',
  'Portrait session',
  'Commercial shoot',
  'Event',
  'Consulting',
  'Retainer',
  'Other',
];

const LEAD_SOURCES = [
  'Referral',
  'Instagram',
  'Website',
  'Google',
  'Word of mouth',
  'Repeat client',
  'Other',
];

const TIMEZONES = [
  { value: 'Asia/Dubai', label: 'GMT+4 · Dubai' },
  { value: 'Asia/Riyadh', label: 'GMT+3 · Riyadh' },
  { value: 'Asia/Kolkata', label: 'GMT+5:30 · India' },
  { value: 'Europe/London', label: 'GMT+0 · London' },
  { value: 'Europe/Berlin', label: 'GMT+1 · Berlin' },
  { value: 'America/New_York', label: 'GMT-5 · New York' },
  { value: 'America/Los_Angeles', label: 'GMT-8 · Los Angeles' },
];

const STAGE_OPTIONS = [
  { value: 'INQUIRY', label: 'Enquiry' },
  { value: 'PROPOSAL_SENT', label: 'Proposal sent' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'IN_PROGRESS', label: 'In progress' },
];

type ProjectValues = {
  name: string;
  clientId: string;
  type: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  timezone: string;
  stage: string;
  leadSource: string;
  description: string;
};

/** A date plus a time becomes one ISO string the route can parse. */
function joinDateTime(date: string, time: string, allDay: boolean) {
  if (!date) return '';
  return allDay || !time ? date : `${date}T${time}`;
}

function ProjectDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [clients, setClients] = useState<ClientOption[] | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectValues>({
    defaultValues: { stage: 'INQUIRY', allDay: true, timezone: 'Asia/Dubai' },
  });

  const allDay = watch('allDay');

  useEffect(() => {
    let live = true;
    fetch('/api/clients')
      .then((response) => response.json())
      .then((payload: { clients: ClientOption[] }) => {
        if (live) setClients(payload.clients);
      })
      .catch(() => {
        if (live) setClients([]);
      });
    return () => {
      live = false;
    };
  }, []);

  async function onSubmit(values: ProjectValues) {
    setFormError(null);
    const { error } = await api('/api/projects', {
      method: 'POST',
      body: {
        name: values.name,
        clientId: values.clientId,
        stage: values.stage,
        type: values.type,
        leadSource: values.leadSource,
        location: values.location,
        description: values.description,
        eventDate: joinDateTime(values.startDate, values.startTime, values.allDay),
        endsAt: joinDateTime(values.endDate, values.endTime, values.allDay),
        allDay: values.allDay,
        timezone: values.timezone,
      },
    });
    if (error) {
      setFormError(error.error);
      return;
    }
    onDone();
  }

  return (
    <Dialog
      title="Create new project"
      onClose={onClose}
      width={700}
      footer={<Submit form="project-form" label="Create project" busy={isSubmitting} />}
    >
      <form id="project-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div>
          <label className="label" htmlFor="project-name">
            Name <span aria-hidden>*</span>
          </label>
          <input
            id="project-name"
            autoFocus
            className="input-soft"
            placeholder="Type project title"
            {...register('name', { required: 'Name this project' })}
          />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="project-client">
            Assign contact <span aria-hidden>*</span>
          </label>
          <FormSelect
            id="project-client"
            control={control}
            name="clientId"
            required="Pick a contact"
            searchable
            placeholder={clients === null ? 'Loading…' : 'Search'}
            options={(clients ?? []).map((client) => ({ value: client.id, label: client.name }))}
          />
          {errors.clientId && <p className="field-error">{errors.clientId.message}</p>}
          {clients?.length === 0 && (
            <p className="text-muted mt-1 text-xs">Add a contact first. A project hangs off one.</p>
          )}
        </div>

        <div>
          <label className="label flex items-center gap-1.5" htmlFor="project-type">
            Project type
            <InfoHint text="What kind of work this is. It groups the pipeline and gives automations something to match on." />
          </label>
          <FormSelect
            id="project-type"
            control={control}
            name="type"
            options={PROJECT_TYPES.map((type) => ({ value: type, label: type }))}
          />
        </div>

        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <label className="label" htmlFor="project-start-date">
              Start date
            </label>
            <input
              id="project-start-date"
              type="date"
              className="input-soft"
              {...register('startDate')}
            />
          </div>

          {!allDay && (
            <div className="min-w-0 flex-1">
              <label className="label" htmlFor="project-start-time">
                Start time
              </label>
              <input
                id="project-start-time"
                type="time"
                className="input-soft"
                {...register('startTime')}
              />
            </div>
          )}

          <span className="text-muted pb-2.5 text-sm">To</span>

          <div className="min-w-0 flex-1">
            <label className="label" htmlFor="project-end-date">
              End date
            </label>
            <input
              id="project-end-date"
              type="date"
              className="input-soft"
              {...register('endDate')}
            />
          </div>

          {!allDay && (
            <div className="min-w-0 flex-1">
              <label className="label" htmlFor="project-end-time">
                End time
              </label>
              <input
                id="project-end-time"
                type="time"
                className="input-soft"
                {...register('endTime')}
              />
            </div>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-sm font-medium">
          <input type="checkbox" className="accent-foreground h-4 w-4" {...register('allDay')} />
          All day
        </label>

        <div>
          <label className="label" htmlFor="project-timezone">
            Timezone
          </label>
          <FormSelect
            id="project-timezone"
            control={control}
            name="timezone"
            options={TIMEZONES.map((zone) => ({ value: zone.value, label: zone.label }))}
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setDetailsOpen((value) => !value)}
            aria-expanded={detailsOpen}
            className="flex items-center gap-1.5 font-semibold"
          >
            More details
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {detailsOpen && (
            <div className="mt-5 space-y-6">
              <div>
                <label className="label" htmlFor="project-stage">
                  Stage
                </label>
                <FormSelect
                  id="project-stage"
                  control={control}
                  name="stage"
                  options={STAGE_OPTIONS.map((stage) => ({
                    value: stage.value,
                    label: stage.label,
                  }))}
                />
              </div>

              <div>
                <label className="label" htmlFor="project-location">
                  Location
                </label>
                <input
                  id="project-location"
                  className="input-soft"
                  placeholder="Where is it happening?"
                  {...register('location')}
                />
              </div>

              <div>
                <label className="label" htmlFor="project-source">
                  Lead source
                </label>
                <FormSelect
                  id="project-source"
                  control={control}
                  name="leadSource"
                  options={LEAD_SOURCES.map((source) => ({ value: source, label: source }))}
                />
              </div>

              <div>
                <label className="label" htmlFor="project-description">
                  Description
                </label>
                <textarea
                  id="project-description"
                  rows={4}
                  className="input-soft h-auto py-2"
                  placeholder="Add some details or notes"
                  {...register('description')}
                />
              </div>
            </div>
          )}
        </div>

        {formError && <p className="field-error">{formError}</p>}
      </form>
    </Dialog>
  );
}

function TaskDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [projects, setProjects] = useState<{ id: string; name: string }[] | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskValues>();

  useEffect(() => {
    const stop = new AbortController();
    fetch('/api/projects', { signal: stop.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('projects'))))
      .then((payload: { projects?: { id: string; name: string }[] }) =>
        setProjects(payload.projects ?? []),
      )
      .catch(() => setProjects([]));
    return () => stop.abort();
  }, []);

  // A time on its own has no day to sit on, so it waits for the date.
  const date = watch('dueAt');

  async function onSubmit(values: TaskValues) {
    setFormError(null);
    const { error } = await api('/api/tasks', {
      method: 'POST',
      body: {
        title: values.title,
        projectId: values.projectId || undefined,
        // The time is folded into the date, and remembered as having been set,
        // so a task due at four is not shown as due all day.
        dueAt:
          values.dueAt && values.dueTime
            ? `${values.dueAt}T${values.dueTime}:00`
            : values.dueAt || undefined,
        dueHasTime: Boolean(values.dueAt && values.dueTime),
      },
    });
    if (error) {
      setFormError(error.error);
      return;
    }
    onDone();
  }

  return (
    <Dialog
      title="Add a task"
      fit
      onClose={onClose}
      footer={<Submit form="task-form" label="Add task" busy={isSubmitting} />}
    >
      <form id="task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field label="Task" htmlFor="task-title" required error={errors.title?.message}>
          <input
            id="task-title"
            autoFocus
            className="input-soft"
            placeholder="What needs doing?"
            {...register('title', { required: 'What needs doing?' })}
          />
        </Field>

        <Field label="Project" htmlFor="task-project">
          <FormSelect
            id="task-project"
            control={control}
            name="projectId"
            searchable
            placeholder={projects === null ? 'Loading your projects…' : 'No project'}
            options={(projects ?? []).map((project) => ({
              value: project.id,
              label: project.name,
            }))}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
          <Field label="Due date" htmlFor="task-due">
            <input id="task-due" type="date" className="input-soft" {...register('dueAt')} />
          </Field>

          <Field label="Due time" htmlFor="task-due-time">
            {date ? (
              <input
                id="task-due-time"
                type="time"
                className="input-soft"
                {...register('dueTime')}
              />
            ) : (
              // A disabled input takes no hover of its own, so the tip sits on
              // the wrapper and still explains why it cannot be typed in.
              // Floating, because a tooltip drawn beside the field is part of
              // the dialog's width even while it is invisible, and this one
              // sits at the right-hand edge.
              <Tip label="Pick a due date first" side="right" floating className="w-full">
                <input
                  id="task-due-time"
                  type="time"
                  disabled
                  className="input-soft pointer-events-none opacity-40"
                  {...register('dueTime')}
                />
              </Tip>
            )}
          </Field>
        </div>

        {formError && <p className="field-error">{formError}</p>}
      </form>
    </Dialog>
  );
}
