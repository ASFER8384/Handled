'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmailComposer, type PreviousEmail, type Variable } from './email-composer';

export type ActivityMessage = {
  id: string;
  to: string;
  subject: string;
  body: string;
  bodyHtml: string | null;
  attachments: { id: string; name: string }[];
  status: 'DRAFT' | 'QUEUED' | 'SENT' | 'FAILED';
  detail: string | null;
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
  QUEUED: 'Queued',
  SENT: 'Sent',
  FAILED: 'Failed',
};

const PILL: Record<ActivityMessage['status'], string> = {
  DRAFT: 'bg-black/[0.06]',
  QUEUED: 'bg-black/[0.06]',
  SENT: 'bg-brand-sage/50',
  FAILED: 'bg-accent-soft text-accent',
};

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
    <div className="mt-6 max-w-3xl">
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

                <p className="text-muted mt-3 text-xs">
                  {new Date(message.createdAt).toLocaleString('en-GB')}
                </p>
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
