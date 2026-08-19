'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { EmailComposer, type PreviousEmail, type Variable } from './email-composer';

export type ActivityMessage = {
  id: string;
  to: string;
  subject: string;
  body: string;
  bodyHtml: string | null;
  attachments: { id: string; name: string }[];
  status: 'DRAFT' | 'SCHEDULED' | 'QUEUED' | 'SENT' | 'FAILED';
  detail: string | null;
  /** Set only while it is waiting for its send time. */
  scheduledFor: string | null;
  createdAt: string;
};

export type ActivityRun = {
  id: string;
  name: string;
  startedAt: string;
  steps: { id: string; label: string; detail: string }[];
};

const LABEL: Record<ActivityMessage['status'], string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  QUEUED: 'Queued',
  SENT: 'Sent',
  FAILED: 'Failed',
};

const PILL: Record<ActivityMessage['status'], string> = {
  DRAFT: 'bg-black/[0.06]',
  SCHEDULED: 'bg-brand-sky/60',
  QUEUED: 'bg-black/[0.06]',
  SENT: 'bg-brand-sage/50',
  FAILED: 'bg-accent-soft text-accent',
};

/** Pick a day and a time, and hand back the moment it stands for. */
function ScheduleButton({
  disabled,
  onPick,
}: {
  disabled?: boolean;
  onPick: (isoTime: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');

  useEffect(() => {
    if (!open) return;
    function away(event: MouseEvent) {
      if (!(event.target as HTMLElement).closest('[data-schedule]')) setOpen(false);
    }
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  return (
    <span className="relative" data-schedule>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((shown) => !shown)}
        className="hover:text-foreground font-medium disabled:opacity-50"
      >
        Schedule
      </button>
      {open && (
        <div className="border-line bg-surface absolute right-0 bottom-full z-30 mb-2 w-[240px] space-y-2 rounded-md border p-3 text-sm shadow-lg">
          <input
            autoFocus
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Send on"
            className="input-soft"
          />
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            aria-label="Send at"
            className="input-soft"
          />
          <button
            type="button"
            disabled={!date}
            onClick={() => {
              onPick(new Date(`${date}T${time || '09:00'}`).toISOString());
              setOpen(false);
            }}
            className="btn-primary w-full py-2 disabled:opacity-40"
          >
            Schedule it
          </button>
        </div>
      )}
    </span>
  );
}

/**
 * The project's trail: emails written here, and automation runs that fired.
 * Nothing is sent until a provider is configured, so a written email is
 * recorded as queued rather than claimed as delivered.
 */
export function ActivityTab({
  projectId,
  recipients,
  variables,
  signature,
  messages,
  runs,
}: {
  projectId: string;
  recipients: { id: string; name: string; email: string }[];
  variables: Variable[];
  signature: string;
  messages: ActivityMessage[];
  runs: ActivityRun[];
}) {
  const router = useRouter();
  // Held locally too, so a written email joins the trail straight away.
  const [sent, setSent] = useState(messages);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  /** Send it now, hold it back, or throw it away: only for one not yet gone. */
  async function act(id: string, body: Record<string, unknown>) {
    setBusy(id);
    const { data } = await api<{ message: ActivityMessage }>(`/api/project-messages/${id}`, {
      method: 'PATCH',
      body,
    });
    setBusy(null);
    if (!data?.message) return;
    setSent((current) => current.map((entry) => (entry.id === id ? data.message : entry)));
    setNotice(data.message.detail);
    router.refresh();
  }

  async function discard(id: string) {
    setBusy(id);
    setSent((current) => current.filter((entry) => entry.id !== id));
    await api(`/api/project-messages/${id}`, { method: 'DELETE' });
    setBusy(null);
    router.refresh();
  }

  // Only a message that actually went out is worth answering.
  const answerable = sent.find((message) => message.status !== 'DRAFT');
  const previous: PreviousEmail | null = answerable
    ? {
        id: answerable.id,
        to: answerable.to,
        subject: answerable.subject,
        body: answerable.body,
        createdAt: answerable.createdAt,
      }
    : null;

  return (
    <div className="mt-6">
      {open ? (
        <EmailComposer
          projectId={projectId}
          recipients={recipients}
          variables={variables}
          previous={previous}
          signature={signature}
          onClose={() => setOpen(false)}
          onSaved={(message) => {
            setSent((current) => [message, ...current]);
            setNotice(message.detail);
            setOpen(false);
            router.refresh();
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="card hover:border-accent flex w-full items-center gap-3 px-5 py-4 text-left transition-colors"
        >
          <span className="bg-accent-soft text-accent flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold">
            @
          </span>
          <span className="text-muted">Send email</span>
        </button>
      )}

      {notice && <p className="text-muted mt-3 text-sm">{notice}</p>}

      {sent.length > 0 && (
        <>
          <h2 className="text-muted mt-10 text-xs font-semibold tracking-widest uppercase">
            Emails
          </h2>
          <ul className="mt-4 space-y-3">
            {sent.map((message) => (
              <li key={message.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">{message.subject}</p>
                    <p className="text-muted text-sm">To {message.to}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${PILL[message.status]}`}
                  >
                    {LABEL[message.status]}
                  </span>
                </div>

                {message.bodyHtml ? (
                  <div
                    className="email-body text-muted mt-3 max-h-[140px] overflow-hidden text-sm"
                    // Written in this workspace, by the person reading it back.
                    dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
                  />
                ) : (
                  <p className="text-muted mt-3 line-clamp-3 text-sm whitespace-pre-line">
                    {message.body}
                  </p>
                )}

                {message.attachments.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {message.attachments.map((file) => (
                      <li
                        key={file.id}
                        className="border-line text-muted rounded border px-2 py-1 text-xs"
                      >
                        {file.name}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="text-muted mt-3 flex flex-wrap items-center gap-4 text-xs">
                  <span>{new Date(message.createdAt).toLocaleString('en-GB')}</span>

                  {message.scheduledFor && message.status === 'SCHEDULED' && (
                    <span className="text-foreground font-medium">
                      Goes out {new Date(message.scheduledFor).toLocaleString('en-GB')}
                    </span>
                  )}

                  {message.status !== 'SENT' && (
                    <span className="ml-auto flex items-center gap-4">
                      <button
                        type="button"
                        disabled={busy === message.id}
                        onClick={() => void act(message.id, { action: 'send' })}
                        className="text-accent font-medium hover:underline disabled:opacity-50"
                      >
                        Send now
                      </button>

                      {message.status === 'SCHEDULED' ? (
                        <button
                          type="button"
                          disabled={busy === message.id}
                          onClick={() => void act(message.id, { action: 'unschedule' })}
                          className="hover:text-foreground font-medium disabled:opacity-50"
                        >
                          Cancel schedule
                        </button>
                      ) : (
                        <ScheduleButton
                          disabled={busy === message.id}
                          onPick={(when) =>
                            void act(message.id, { action: 'schedule', scheduledFor: when })
                          }
                        />
                      )}

                      <button
                        type="button"
                        disabled={busy === message.id}
                        onClick={() => void discard(message.id)}
                        className="hover:text-accent font-medium disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {runs.length > 0 && (
        <>
          <h2 className="text-muted mt-10 text-xs font-semibold tracking-widest uppercase">
            Automations
          </h2>
          <ul className="mt-4 space-y-3">
            {runs.map((run) => (
              <li key={run.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{run.name}</p>
                  <span className="text-muted text-sm">
                    {new Date(run.startedAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <ol className="divide-line mt-3 divide-y text-sm">
                  {run.steps.map((step) => (
                    <li key={step.id} className="flex items-center justify-between gap-4 py-2">
                      <span>{step.label}</span>
                      <span className="text-muted">{step.detail}</span>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </>
      )}

      {sent.length === 0 && runs.length === 0 && (
        <p className="text-muted mt-8">Nothing has happened on this project yet.</p>
      )}
    </div>
  );
}
