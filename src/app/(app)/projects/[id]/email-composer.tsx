'use client';

import { useRef, useState } from 'react';
import type { ActivityMessage } from './activity-tab';
import { AddContactDialog } from './add-contact-dialog';
import {
  AlignIcon,
  CalendarIcon,
  Caret,
  Clip,
  CodeIcon,
  Cross,
  EMOJI,
  FONTS,
  HIGHLIGHTS,
  LinkButton,
  ListIcon,
  MenuItem,
  PenIcon,
  Picker,
  Popover,
  Rule,
  SIZES,
  SignIcon,
  Swatches,
  TEXT_COLOURS,
  Tool,
  UndoIcon,
  escapeHtml,
  useMenu,
  useRichText,
} from './editor-kit';

export type Variable = { token: string; label: string; value: string };

export type PreviousEmail = {
  id: string;
  to: string;
  subject: string;
  body: string;
  createdAt: string;
};

type Attachment = { id: string; name: string; sizeBytes: number | null };

const TEMPLATES = [
  {
    name: 'Welcome and next steps',
    subject: "Let's get started!",
    body:
      '<p>Hi {{client_name}},</p><p>Thank you so much for booking your {{project_type}}. ' +
      'I am truly excited to work with you.</p><p>Here is what happens next: I will send ' +
      'over your agreement and invoice, and once those are signed we will lock in ' +
      '{{event_date}}.</p><p>Warmly,<br>{{business_name}}</p>',
  },
  {
    name: 'Following up',
    subject: 'Just following up',
    body:
      '<p>Hi {{client_name}},</p><p>I wanted to check in about {{project_name}}. ' +
      'Let me know if you have any questions, or if there is anything I can help ' +
      'you decide on.</p><p>Best,<br>{{business_name}}</p>',
  },
  {
    name: 'Payment reminder',
    subject: 'A gentle reminder about your invoice',
    body:
      '<p>Hi {{client_name}},</p><p>This is a friendly reminder that the invoice for ' +
      '{{project_name}} is still open. You can pay it straight from the link in the ' +
      'original email.</p><p>Thank you,<br>{{business_name}}</p>',
  },
  {
    name: 'Confirming our meeting',
    subject: 'Confirming our call',
    body:
      '<p>Hi {{client_name}},</p><p>Confirming our conversation about {{project_name}}. ' +
      'I have you down for {{event_date}}.</p><p>Talk soon,<br>{{business_name}}</p>',
  },
];

/** Everything the email bar in HoneyBook offers, wired to real behaviour. */
export function EmailComposer({
  projectId,
  recipients: initialRecipients,
  variables,
  previous,
  signature,
  onClose,
  onSaved,
}: {
  projectId: string;
  recipients: { id: string; name: string; email: string }[];
  variables: Variable[];
  previous: PreviousEmail | null;
  signature: string;
  onClose: () => void;
  onSaved: (message: ActivityMessage) => void;
}) {
  const {
    editor,
    marks,
    exec,
    setSize,
    insert,
    remember,
    restore,
    readMarks,
    setHtml,
    getHtml,
    getText,
  } = useRichText();
  const { menu, toggle, close: closeMenu } = useMenu();
  const fileInput = useRef<HTMLInputElement>(null);

  const [people, setPeople] = useState(initialRecipients.filter((person) => person.email));
  const [adding, setAdding] = useState(false);
  const [subject, setSubject] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [replyTo, setReplyTo] = useState<PreviousEmail | null>(null);
  const [showFormat, setShowFormat] = useState(true);
  const [sendDate, setSendDate] = useState('');
  const [sendTime, setSendTime] = useState('09:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attach(list: FileList | null) {
    if (!list?.length) return;
    const body = new FormData();
    for (const file of Array.from(list)) body.append('files', file);
    setBusy(true);
    const response = await fetch(`/api/projects/${projectId}/files`, { method: 'POST', body });
    const payload = (await response.json().catch(() => null)) as {
      files?: Attachment[];
      error?: string;
    } | null;
    setBusy(false);
    if (!response.ok || !payload?.files) {
      setError(payload?.error ?? 'That file did not upload');
      return;
    }
    setError(null);
    setAttachments((current) => [...current, ...payload.files!]);
  }

  function applyTemplate(template: (typeof TEMPLATES)[number]) {
    setSubject(template.subject);
    setHtml(template.body);
    closeMenu();
  }

  function startReply() {
    if (!previous) return;
    setReplyTo(previous);
    setSubject(previous.subject.startsWith('Re: ') ? previous.subject : `Re: ${previous.subject}`);
    const quoted = previous.body
      .split('\n')
      .map((line) => escapeHtml(line))
      .join('<br>');
    setHtml(
      '<p><br></p><blockquote style="border-left:3px solid #e3e3e3;margin:0;padding-left:12px;color:#6b6b6b">' +
        `<p>On ${new Date(previous.createdAt).toLocaleString('en-GB')} you wrote:</p>` +
        `<p>${quoted}</p></blockquote>`,
    );
  }

  /** Tokens are placeholders while writing and real words on the way out. */
  function fill(text: string): string {
    return variables.reduce(
      (carry, variable) => carry.split(variable.token).join(variable.value),
      text,
    );
  }

  async function submit(draft: boolean, scheduledFor?: string) {
    const html = getHtml();
    const text = getText();
    if (people.length === 0) {
      setError('Add someone to send it to');
      return;
    }
    if (!subject.trim()) {
      setError('Add a subject');
      return;
    }
    if (!text.trim()) {
      setError('Write the message');
      return;
    }

    setBusy(true);
    const response = await fetch(`/api/projects/${projectId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: people.map((person) => person.email),
        subject: fill(subject),
        body: fill(text),
        bodyHtml: fill(html),
        attachmentIds: attachments.map((file) => file.id),
        replyToId: replyTo?.id,
        draft,
        scheduledFor,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: ActivityMessage;
      error?: string;
    } | null;
    setBusy(false);

    if (!response.ok || !payload?.message) {
      setError(payload?.error ?? 'Could not save that');
      return;
    }
    onSaved(payload.message);
  }

  return (
    <div className="card overflow-visible p-0 text-sm">
      {/* ---- who it goes to ------------------------------------------- */}
      <div className="border-line flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className="bg-accent-soft text-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          {(people[0]?.name ?? '?').slice(0, 1).toUpperCase()}
        </span>
        <span className="text-muted mr-1 font-medium">Send to:</span>

        {people.map((person) => (
          <span
            key={person.id}
            title={person.email}
            className="flex h-[26px] items-center gap-1.5 rounded bg-black/[0.05] px-2"
          >
            {person.name || person.email}
            <button
              type="button"
              onClick={() => setPeople((all) => all.filter((one) => one.id !== person.id))}
              aria-label={`Remove ${person.email}`}
              className="text-muted hover:text-foreground"
            >
              <Cross className="h-3 w-3" />
            </button>
          </span>
        ))}

        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Add contact to project"
          title="Add contact to project"
          className="border-line text-muted hover:border-accent hover:text-accent flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
        >
          +
        </button>

        <span className="ml-auto flex items-center gap-4">
          {previous && !replyTo && (
            <button
              type="button"
              onClick={startReply}
              className="hover:text-accent font-medium transition-colors"
            >
              Reply to previous email
            </button>
          )}
          {replyTo && <span className="text-muted">Replying to {replyTo.subject}</span>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-foreground transition-colors"
          >
            <Cross className="h-5 w-5" />
          </button>
        </span>
      </div>

      {/* ---- subject ---------------------------------------------------- */}
      <div className="border-line flex items-center gap-2 border-b px-4 py-3">
        <label htmlFor="email-subject" className="text-muted font-medium">
          Subject:
        </label>
        <input
          id="email-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="w-full bg-transparent outline-none"
        />
      </div>

      {/* ---- the message ------------------------------------------------ */}
      <div
        ref={editor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Message"
        onKeyUp={readMarks}
        onMouseUp={() => {
          remember();
          readMarks();
        }}
        onBlur={remember}
        className="composer-body max-h-[340px] min-h-[220px] overflow-y-auto px-4 py-4 outline-none"
      />

      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-4 pb-3">
          {attachments.map((file) => (
            <li
              key={file.id}
              className="border-line flex items-center gap-2 rounded border px-2 py-1"
            >
              <Clip className="h-3.5 w-3.5" />
              {file.name}
              <button
                type="button"
                onClick={() => setAttachments((all) => all.filter((entry) => entry.id !== file.id))}
                aria-label={`Remove ${file.name}`}
                className="text-muted hover:text-foreground"
              >
                <Cross className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="field-error px-4 pb-2">{error}</p>}

      {/* ---- formatting ------------------------------------------------- */}
      {showFormat && (
        <div className="border-line flex flex-wrap items-center gap-1 border-t px-3 py-2">
          <Picker
            up
            label={FONTS[0].label}
            width={104}
            open={menu === 'font'}
            onOpen={() => {
              remember();
              toggle('font');
            }}
          >
            {FONTS.map((font) => (
              <MenuItem
                key={font.label}
                onClick={() => {
                  exec('fontName', font.value || 'inherit');
                  closeMenu();
                }}
              >
                <span style={{ fontFamily: font.value || undefined }}>{font.label}</span>
              </MenuItem>
            ))}
          </Picker>

          <Picker
            up
            label="16"
            width={62}
            open={menu === 'size'}
            onOpen={() => {
              remember();
              toggle('size');
            }}
          >
            {SIZES.map((size) => (
              <MenuItem
                key={size}
                onClick={() => {
                  setSize(size);
                  closeMenu();
                }}
              >
                {size}
              </MenuItem>
            ))}
          </Picker>

          <Rule />

          <Tool label="Bold" active={marks.bold} onClick={() => exec('bold')}>
            <span className="font-serif text-[15px] font-bold">B</span>
          </Tool>
          <Tool label="Italic" active={marks.italic} onClick={() => exec('italic')}>
            <span className="font-serif text-[15px] italic">I</span>
          </Tool>
          <Tool label="Underline" active={marks.underline} onClick={() => exec('underline')}>
            <span className="font-serif text-[15px] underline">U</span>
          </Tool>

          <Swatches
            up
            label="Text colour"
            colours={TEXT_COLOURS}
            open={menu === 'colour'}
            onOpen={() => {
              remember();
              toggle('colour');
            }}
            onPick={(colour) => {
              exec('foreColor', colour);
              closeMenu();
            }}
          >
            <span className="text-[15px] font-semibold underline decoration-[#C4262E] decoration-[3px] underline-offset-[3px]">
              A
            </span>
          </Swatches>

          <Swatches
            up
            label="Highlight"
            colours={HIGHLIGHTS}
            open={menu === 'highlight'}
            onOpen={() => {
              remember();
              toggle('highlight');
            }}
            onPick={(colour) => {
              exec('hiliteColor', colour);
              closeMenu();
            }}
          >
            <PenIcon className="h-4 w-4" />
          </Swatches>

          <Rule />

          <Picker
            up
            icon={<AlignIcon className="h-4 w-4" />}
            width={44}
            open={menu === 'align'}
            onOpen={() => {
              remember();
              toggle('align');
            }}
          >
            {[
              ['justifyLeft', 'Left'],
              ['justifyCenter', 'Centre'],
              ['justifyRight', 'Right'],
              ['justifyFull', 'Justified'],
            ].map(([command, label]) => (
              <MenuItem
                key={command}
                onClick={() => {
                  exec(command);
                  closeMenu();
                }}
              >
                {label}
              </MenuItem>
            ))}
          </Picker>

          <Tool label="Bulleted list" onClick={() => exec('insertUnorderedList')}>
            <ListIcon className="h-4 w-4" />
          </Tool>
          <Tool label="Numbered list" onClick={() => exec('insertOrderedList')}>
            <ListIcon className="h-4 w-4" numbered />
          </Tool>
          <Tool label="Code block" onClick={() => exec('formatBlock', 'pre')}>
            <CodeIcon className="h-4 w-4" />
          </Tool>
          <Tool label="Clear formatting" onClick={() => exec('removeFormat')}>
            <span className="text-[15px] italic">
              T<sub className="text-[10px]">x</sub>
            </span>
          </Tool>

          <Rule />

          <Tool label="Divider" onClick={() => exec('insertHorizontalRule')}>
            <span className="text-[15px]">—</span>
          </Tool>
          <Tool label="Undo" onClick={() => exec('undo')}>
            <UndoIcon className="h-4 w-4" />
          </Tool>
        </div>
      )}

      {/* ---- actions ---------------------------------------------------- */}
      <div className="border-line flex flex-wrap items-center gap-1 border-t px-3 py-2.5">
        <Picker
          up
          label="Templates"
          width={104}
          open={menu === 'templates'}
          onOpen={() => toggle('templates')}
        >
          {TEMPLATES.map((template) => (
            <MenuItem key={template.name} onClick={() => applyTemplate(template)}>
              {template.name}
            </MenuItem>
          ))}
        </Picker>

        <Rule />

        <Tool
          label={showFormat ? 'Hide formatting' : 'Show formatting'}
          active={showFormat}
          onClick={() => setShowFormat((shown) => !shown)}
        >
          <span className="text-[15px] font-semibold">A</span>
        </Tool>

        <Popover
          up
          label="Emoji"
          open={menu === 'emoji'}
          onOpen={() => {
            remember();
            toggle('emoji');
          }}
          trigger={<span className="text-[15px]">🙂</span>}
        >
          <div className="grid w-[228px] grid-cols-10 gap-0.5 p-2">
            {EMOJI.map((glyph) => (
              <button
                key={glyph}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  insert(glyph);
                  closeMenu();
                }}
                className="rounded p-0.5 text-base hover:bg-black/[0.06]"
              >
                {glyph}
              </button>
            ))}
          </div>
        </Popover>

        <LinkButton
          up
          open={menu === 'link'}
          onOpen={() => {
            remember();
            toggle('link');
          }}
          onApply={(url, text) => {
            restore();
            const collapsed = window.getSelection()?.isCollapsed ?? true;
            if (collapsed) {
              insert(`<a href="${escapeHtml(url)}">${escapeHtml(text || url)}</a>`);
            } else {
              document.execCommand('createLink', false, url);
            }
            closeMenu();
          }}
        />

        <Popover
          up
          label="Insert a detail"
          open={menu === 'variables'}
          onOpen={() => {
            remember();
            toggle('variables');
          }}
          trigger={<span className="font-mono text-[13px]">{'{x}'}</span>}
        >
          <div className="w-[220px] py-1">
            {variables.map((variable) => (
              <MenuItem
                key={variable.token}
                onClick={() => {
                  insert(
                    `<span style="background:#f0efec;border-radius:3px;padding:0 4px">${variable.token}</span>&nbsp;`,
                  );
                  closeMenu();
                }}
              >
                <span className="flex items-center justify-between gap-3">
                  {variable.label}
                  <span className="text-muted truncate text-xs">{variable.value}</span>
                </span>
              </MenuItem>
            ))}
          </div>
        </Popover>

        <DateButton
          open={menu === 'date'}
          onOpen={() => {
            remember();
            toggle('date');
          }}
          onPick={(value) => {
            insert(new Date(value).toLocaleDateString('en-GB', { dateStyle: 'long' }));
            closeMenu();
          }}
        />

        <Tool
          label="Add your signature"
          onClick={() =>
            insert(
              `<p><br></p><p style="color:#6b6b6b">Warmly,<br><strong>${escapeHtml(signature)}</strong></p>`,
            )
          }
        >
          <SignIcon className="h-4 w-4" />
        </Tool>

        <span className="ml-auto flex items-center gap-2">
          <Tool label="Attach a file" onClick={() => fileInput.current?.click()}>
            <Clip className="h-[18px] w-[18px]" />
          </Tool>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            aria-label="Attach a file"
            onChange={(event) => void attach(event.target.files)}
          />

          <span className="relative flex" data-menu>
            <button
              type="button"
              onClick={() => void submit(false)}
              disabled={busy}
              className="bg-brand-ink rounded-l-md px-6 py-2.5 font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Send'}
            </button>
            <button
              type="button"
              onClick={() => toggle('send')}
              disabled={busy}
              aria-label="More send options"
              className="bg-brand-ink flex items-center rounded-r-md border-l border-white/25 px-2 text-white disabled:opacity-50"
            >
              <Caret className="h-3.5 w-3.5" />
            </button>
            {menu === 'send' && (
              <div className="border-line bg-surface absolute right-0 bottom-full z-30 mb-1 w-[250px] rounded-md border py-1 shadow-lg">
                <MenuItem onClick={() => void submit(false)}>Send now</MenuItem>
                <MenuItem onClick={() => void submit(true)}>Save as draft</MenuItem>

                <div className="border-line mt-1 space-y-2 border-t px-3 pt-2.5 pb-1">
                  <p className="text-muted text-xs font-semibold tracking-widest uppercase">
                    Send later
                  </p>
                  <input
                    type="date"
                    value={sendDate}
                    onChange={(event) => setSendDate(event.target.value)}
                    aria-label="Send on"
                    className="input-soft"
                  />
                  <input
                    type="time"
                    value={sendTime}
                    onChange={(event) => setSendTime(event.target.value)}
                    aria-label="Send at"
                    className="input-soft"
                  />
                  <button
                    type="button"
                    disabled={!sendDate}
                    onClick={() =>
                      void submit(
                        false,
                        new Date(`${sendDate}T${sendTime || '09:00'}`).toISOString(),
                      )
                    }
                    className="btn-primary mb-1 w-full py-2 disabled:opacity-40"
                  >
                    Schedule it
                  </button>
                </div>
              </div>
            )}
          </span>
        </span>
      </div>

      {adding && (
        <AddContactDialog
          projectId={projectId}
          exclude={people.map((person) => person.id)}
          onClose={() => setAdding(false)}
          onAdded={(contact) => {
            setAdding(false);
            if (!contact.email) return;
            setPeople((all) =>
              all.some((one) => one.id === contact.id)
                ? all
                : [...all, { id: contact.id, name: contact.name, email: contact.email! }],
            );
          }}
        />
      )}
    </div>
  );
}

/** A date typed straight into the message, rather than a scheduled send. */
function DateButton({
  open,
  onOpen,
  onPick,
}: {
  open: boolean;
  onOpen: () => void;
  onPick: (value: string) => void;
}) {
  return (
    <span className="relative" data-menu>
      <Tool label="Insert a date" active={open} onClick={onOpen}>
        <CalendarIcon className="h-4 w-4" />
      </Tool>
      {open && (
        <div className="border-line bg-surface absolute bottom-full left-0 z-30 mb-1 rounded-md border p-3 shadow-lg">
          <input
            autoFocus
            type="date"
            aria-label="Date to insert"
            onChange={(event) => event.target.value && onPick(event.target.value)}
            className="input-soft w-[190px]"
          />
        </div>
      )}
    </span>
  );
}
