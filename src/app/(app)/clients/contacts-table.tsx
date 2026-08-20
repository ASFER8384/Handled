'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { useMenu, MenuItem, DotsIcon, PenIcon, TrashIcon } from '../projects/[id]/editor-kit';
import { NewContactDialog } from './new-contact-dialog';
import { EditContactDialog } from './edit-contact-dialog';
import { AddToProjectDialog } from './add-to-project-dialog';

export type ContactRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  lastInteractionAt: string | null;
  source: string | null;
  tags: string[];
  projects: { id: string; name: string; role: 'client' | 'contact' }[];
};

/** The address book: everyone you work with, and the work they are attached to. */
export function ContactsTable({ contacts }: { contacts: ContactRow[] }) {
  const router = useRouter();
  const { menu, toggle, close } = useMenu();
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [placing, setPlacing] = useState<ContactRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const term = search.trim().toLowerCase();
  const shown = term
    ? contacts.filter((contact) =>
        [contact.name, contact.email, contact.phone, contact.company, ...contact.tags,
          ...contact.projects.map((project) => project.name)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term),
      )
    : contacts;

  const picked = chosen.filter((id) => shown.some((contact) => contact.id === id));
  const allPicked = shown.length > 0 && picked.length === shown.length;

  async function bulk(action: 'delete' | 'addTags' | 'removeTags', tags: string[] = []) {
    setBusy(true);
    await api('/api/clients/bulk', { method: 'POST', body: { ids: picked, action, tags } });
    setBusy(false);
    setChosen([]);
    router.refresh();
  }

  /** Takes a contact off one project, leaving the contact and the project. */
  async function unlink(projectId: string, contactId: string) {
    setBusy(true);
    const { error: failure } = await api(`/api/projects/${projectId}/contacts/${contactId}`, {
      method: 'DELETE',
    });
    setBusy(false);
    if (failure) {
      setNotice(failure.error);
      return;
    }
    setNotice(null);
    router.refresh();
  }

  function askTags(action: 'addTags' | 'removeTags') {
    const typed = window.prompt(
      action === 'addTags'
        ? 'Tags to add, separated by commas'
        : 'Tags to remove, separated by commas',
    );
    const tags = (typed ?? '').split(',').map((tag) => tag.trim()).filter(Boolean);
    if (tags.length > 0) void bulk(action, tags);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Contacts</h1>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary px-5">
          Create new
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-muted text-sm">
          {shown.length} {shown.length === 1 ? 'item' : 'items'}
          {term && ` of ${contacts.length}`}
        </p>

        <label className="border-line focus-within:border-accent flex h-9 w-[280px] items-center gap-2 rounded-full border px-3 transition-colors">
          <span className="sr-only">Search contacts</span>
          <SearchIcon />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search contacts"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="text-muted border-line border-b">
            <tr className="[&>th]:px-5 [&>th]:py-3 [&>th]:font-medium">
              <th className="w-10 pr-0">
                <input
                  type="checkbox"
                  checked={allPicked}
                  onChange={() => setChosen(allPicked ? [] : shown.map((contact) => contact.id))}
                  aria-label={allPicked ? 'Deselect all' : 'Select all'}
                  className="accent-brand-ink h-4 w-4 align-middle"
                />
              </th>
              <th>Name</th>
              <th>Projects</th>
              <th>Source</th>
              <th>Last interaction</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Tags</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {shown.map((contact) => (
              <tr key={contact.id} className="group/row [&>td]:px-5 [&>td]:py-4">
                <td className="pr-0">
                  <input
                    type="checkbox"
                    checked={picked.includes(contact.id)}
                    onChange={() =>
                      setChosen((current) =>
                        current.includes(contact.id)
                          ? current.filter((id) => id !== contact.id)
                          : [...current, contact.id],
                      )
                    }
                    aria-label={`Select ${contact.name}`}
                    className="accent-brand-ink h-4 w-4 align-middle"
                  />
                </td>
                <td>
                  <span className="font-medium">{contact.name}</span>
                  {contact.company && <p className="text-muted text-xs">{contact.company}</p>}
                </td>
                <td>
                  {contact.projects.length === 0 ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <span className="flex flex-wrap gap-1.5">
                      {contact.projects.map((project) => (
                        <span
                          key={project.id}
                          className="group/chip flex items-center gap-1 rounded-full bg-black/[0.05] py-1 pr-1.5 pl-2.5 text-xs"
                        >
                          <Link href={`/projects/${project.id}`} className="hover:underline">
                            {project.name}
                          </Link>
                          {project.role === 'contact' ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void unlink(project.id, contact.id)}
                              aria-label={`Take ${contact.name} off ${project.name}`}
                              title={`Take ${contact.name} off ${project.name}`}
                              className="text-muted hover:text-accent opacity-0 transition-opacity group-hover/chip:opacity-100 disabled:opacity-30"
                            >
                              <CrossIcon />
                            </button>
                          ) : (
                            <span
                              title={`${contact.name} is the client this project is for`}
                              aria-label="Client of this project"
                              className="text-muted"
                            >
                              <LockIcon />
                            </span>
                          )}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td className="text-muted">{contact.source ?? '—'}</td>
                <td className="text-muted whitespace-nowrap">
                  {contact.lastInteractionAt
                    ? new Date(contact.lastInteractionAt).toLocaleDateString('en-GB', {
                        dateStyle: 'medium',
                      })
                    : '—'}
                </td>
                <td className="text-muted">{contact.email ?? '—'}</td>
                <td className="text-muted whitespace-nowrap">{contact.phone ?? '—'}</td>
                <td>
                  {contact.tags.length === 0 ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <span className="flex flex-wrap gap-1.5">
                      {contact.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-accent-soft text-accent rounded-full px-2.5 py-1 text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td>
                  <span className="flex items-center justify-end gap-1">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        title="Send email"
                        aria-label={`Send email to ${contact.name}`}
                        className="text-muted hover:text-accent flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-black/[0.05]"
                      >
                        <MailIcon />
                      </a>
                    )}

                    <span className="relative" data-menu>
                      <button
                        type="button"
                        onClick={() => toggle(contact.id)}
                        aria-label={`Actions for ${contact.name}`}
                        className="text-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-black/[0.05]"
                      >
                        <DotsIcon className="h-5 w-5" />
                      </button>
                      {menu === contact.id && (
                        <div className="border-line bg-surface absolute top-full right-0 z-30 mt-1 w-[200px] rounded-md border py-1 text-sm shadow-lg">
                          <MenuItem
                            onClick={() => {
                              close();
                              setEditing(contact);
                            }}
                          >
                            <span className="flex items-center gap-2.5">
                              <PenIcon className="h-4 w-4" />
                              Edit contact info
                            </span>
                          </MenuItem>
                          <MenuItem
                            onClick={() => {
                              close();
                              setPlacing(contact);
                            }}
                          >
                            <span className="flex items-center gap-2.5">
                              <PlusSquareIcon />
                              Add to project
                            </span>
                          </MenuItem>
                          <MenuItem
                            onClick={() => {
                              close();
                              setChosen([contact.id]);
                              void bulk('delete');
                            }}
                          >
                            <span className="text-accent flex items-center gap-2.5">
                              <TrashIcon className="h-4 w-4" />
                              Delete contact
                            </span>
                          </MenuItem>
                        </div>
                      )}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {shown.length === 0 && (
          <p className="text-muted px-5 py-10 text-center text-sm">
            {contacts.length === 0
              ? 'No contacts yet. Create one and the project you attach them to opens with them.'
              : `Nobody matches “${search}”.`}
          </p>
        )}
      </div>

      {/* ---- what you can do with a selection --------------------------- */}
      {picked.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-white py-2 pr-2 pl-5 shadow-2xl ring-1 ring-black/10">
          <span className="text-sm font-medium">
            {picked.length} of {shown.length} selected
          </span>
          <button
            type="button"
            onClick={() => setChosen([])}
            className="hover:text-accent ml-3 text-sm font-medium transition-colors"
          >
            Deselect all
          </button>

          <span className="bg-line mx-3 h-6 w-px" />

          <BarButton onClick={() => void bulk('delete')} busy={busy}>
            <TrashIcon className="h-4 w-4" />
            Delete
          </BarButton>
          <BarButton
            onClick={() => {
              const to = shown
                .filter((contact) => picked.includes(contact.id) && contact.email)
                .map((contact) => contact.email)
                .join(',');
              if (to) window.location.href = `mailto:${to}`;
            }}
            busy={busy}
          >
            <MailIcon />
            Email
          </BarButton>
          <BarButton onClick={() => askTags('addTags')} busy={busy}>
            <TagIcon />
            Add tags
          </BarButton>
          <BarButton onClick={() => askTags('removeTags')} busy={busy}>
            <TagIcon off />
            Remove tags
          </BarButton>

          <span className="bg-line mx-1 h-6 w-px" />
          <button
            type="button"
            onClick={() => setChosen([])}
            aria-label="Close the selection bar"
            className="text-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-black/[0.05]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              aria-hidden
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}

      {notice && (
        <p className="field-error mt-3" role="status">
          {notice}
        </p>
      )}

      {creating && <NewContactDialog onClose={() => setCreating(false)} />}
      {editing && <EditContactDialog contact={editing} onClose={() => setEditing(null)} />}
      {placing && (
        <AddToProjectDialog
          contactId={placing.id}
          contactName={placing.name}
          already={placing.projects.map((project) => project.id)}
          onClose={() => setPlacing(null)}
        />
      )}
    </>
  );
}

function BarButton({
  onClick,
  busy,
  children,
}: {
  onClick: () => void;
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="hover:text-accent flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-black/[0.04] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function CrossIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="10.5" width="14" height="9" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="text-muted h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}

function TagIcon({ off }: { off?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.5 3.5H5a1.5 1.5 0 0 0-1.5 1.5v6.5L13 21l8-8z" />
      <circle cx="8" cy="8" r="1.2" />
      <path d={off ? 'M16 8h5' : 'M18.5 5.5v5M16 8h5'} />
    </svg>
  );
}

function PlusSquareIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M12 10v6M9 13h6" />
    </svg>
  );
}
