'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Dialog } from '@/components/dialog';
import { InfoHint } from '@/components/ui';
import { CountrySelect } from '@/components/country-select';
import { DEFAULT_ISO, findCountry } from '@/lib/countries';
import { api } from '@/lib/client-fetch';

// Schemas that coerce dates have an output type the form never holds, so these
// forms carry their own shape and let the route do the validating.
type TaskValues = { title: string; dueAt: string };

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

type ContactValues = {
  name: string;
  email: string;
  countryIso: string;
  phone: string;
  project: string;
  lastInteractionAt: string;
  website: string;
  company: string;
  jobTitle: string;
  address: string;
  notes: string;
};

function ContactDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({ defaultValues: { countryIso: DEFAULT_ISO } });

  const countryIso = watch('countryIso');

  const nameLength = (watch('name') ?? '').length;
  const notesLength = (watch('notes') ?? '').length;
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    let live = true;
    fetch('/api/projects')
      .then((response) => response.json())
      .then((payload: { projects: { id: string; name: string }[] }) => {
        if (live) setProjects(payload.projects ?? []);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  async function onSubmit(values: ContactValues) {
    setFormError(null);
    const dial = findCountry(values.countryIso).dial;
    const phone = values.phone.trim() === '' ? '' : `${dial} ${values.phone.trim()}`;

    const { data, error } = await api<{ client: { id: string } }>('/api/clients', {
      method: 'POST',
      body: {
        name: values.name,
        email: values.email,
        phone,
        company: values.company,
        jobTitle: values.jobTitle,
        website: values.website,
        address: values.address,
        lastInteractionAt: values.lastInteractionAt,
        notes: values.notes,
      },
    });
    if (error) {
      setFormError(error.error);
      return;
    }

    // A typed name that matches nothing becomes a new project; one that matches
    // an existing project moves it onto this contact.
    const wanted = values.project.trim();
    if (wanted) {
      const existing = projects.find(
        (project) => project.name.toLowerCase() === wanted.toLowerCase(),
      );
      const result = existing
        ? await api(`/api/projects/${existing.id}`, {
            method: 'PATCH',
            body: { clientId: data.client.id },
          })
        : await api('/api/projects', {
            method: 'POST',
            body: { name: wanted, clientId: data.client.id },
          });
      if (result.error) {
        setFormError(result.error.error);
        return;
      }
    }

    onDone();
  }

  return (
    <Dialog
      title="Add a contact"
      onClose={onClose}
      footer={<Submit form="contact-form" label="Add contact" busy={isSubmitting} />}
    >
      <form id="contact-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="contact-name">
              Name <span aria-hidden>*</span>
            </label>
            <span className="text-muted text-sm tabular-nums">{nameLength}/100</span>
          </div>
          <input
            id="contact-name"
            autoFocus
            maxLength={100}
            className="input-soft"
            placeholder="Add full name"
            {...register('name', { required: 'A contact needs a name' })}
          />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="contact-email">
            Email address <span aria-hidden>*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            className="input-soft"
            placeholder="Add email address"
            {...register('email', {
              required: 'Enter an email address',
              pattern: { value: /.+@.+\..+/, message: 'Enter a valid email' },
            })}
          />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="contact-phone">
            Phone number
          </label>
          <div className="flex gap-3">
            <CountrySelect
              value={countryIso}
              onChange={(iso) => setValue('countryIso', iso)}
            />
            <input
              id="contact-phone"
              className="input-soft"
              placeholder="50 123 4567"
              {...register('phone')}
            />
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-1.5" htmlFor="contact-project">
            Select or create a project
            <InfoHint text="Pick one of your projects to move it onto this contact, or type a new name to open one." />
          </label>
          <input
            id="contact-project"
            list="contact-project-options"
            className="input-soft"
            placeholder="Type to search"
            {...register('project')}
          />
          <datalist id="contact-project-options">
            {projects.map((project) => (
              <option key={project.id} value={project.name} />
            ))}
          </datalist>
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
                <label className="label" htmlFor="contact-last">
                  Last interaction
                </label>
                <input
                  id="contact-last"
                  type="date"
                  className="input-soft"
                  {...register('lastInteractionAt')}
                />
              </div>

              <div>
                <label className="label" htmlFor="contact-website">
                  Website
                </label>
                <input
                  id="contact-website"
                  className="input-soft"
                  placeholder="Add contact's website"
                  {...register('website')}
                />
              </div>

              <div>
                <label className="label" htmlFor="contact-company">
                  Organization
                </label>
                <input
                  id="contact-company"
                  className="input-soft"
                  placeholder="Organization name"
                  {...register('company')}
                />
              </div>

              <div>
                <label className="label" htmlFor="contact-job">
                  Job title
                </label>
                <input
                  id="contact-job"
                  className="input-soft"
                  placeholder="Add job title or role"
                  {...register('jobTitle')}
                />
              </div>

              <div>
                <label className="label" htmlFor="contact-address">
                  Mailing address
                </label>
                <input
                  id="contact-address"
                  className="input-soft"
                  placeholder="Add mailing address"
                  {...register('address')}
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <label className="label" htmlFor="contact-notes">
                    Additional info (only visible to you)
                  </label>
                  <span className="text-muted text-sm tabular-nums">{notesLength}/1000</span>
                </div>
                <textarea
                  id="contact-notes"
                  rows={4}
                  maxLength={1000}
                  className="input-soft h-auto py-2"
                  placeholder="Add some noteworthy info."
                  {...register('notes')}
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
          <select
            id="project-client"
            className="input-soft"
            defaultValue=""
            {...register('clientId', { required: 'Pick a contact' })}
          >
            <option value="" disabled>
              {clients === null ? 'Loading…' : 'Search'}
            </option>
            {(clients ?? []).map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
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
          <select id="project-type" className="input-soft" defaultValue="" {...register('type')}>
            <option value="">Select</option>
            {PROJECT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
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
          <select id="project-timezone" className="input-soft" {...register('timezone')}>
            {TIMEZONES.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
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
                <select id="project-stage" className="input-soft" {...register('stage')}>
                  {STAGE_OPTIONS.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
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
                <select
                  id="project-source"
                  className="input-soft"
                  defaultValue=""
                  {...register('leadSource')}
                >
                  <option value="">Select</option>
                  {LEAD_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
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
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TaskValues>();

  async function onSubmit(values: TaskValues) {
    setFormError(null);
    const { error } = await api('/api/tasks', { method: 'POST', body: values });
    if (error) {
      setFormError(error.error);
      return;
    }
    onDone();
  }

  return (
    <Dialog
      title="Add a task"
      onClose={onClose}
      footer={<Submit form="task-form" label="Add task" busy={isSubmitting} />}
    >
      <form id="task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field label="Task" htmlFor="task-title" required error={errors.title?.message}>
          <input
            id="task-title"
            autoFocus
            className="input"
            placeholder="What needs doing?"
            {...register('title', { required: 'What needs doing?' })}
          />
        </Field>

        <Field label="Due" htmlFor="task-due">
          <input id="task-due" type="date" className="input" {...register('dueAt')} />
        </Field>

        {formError && <p className="field-error">{formError}</p>}
      </form>
    </Dialog>
  );
}
