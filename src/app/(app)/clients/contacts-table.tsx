'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { Tip } from '@/components/ui';
import { useMenu, MenuItem, DotsIcon, PenIcon, TrashIcon } from '../projects/[id]/editor-kit';
import { NewContactDialog } from '@/components/new-contact-dialog';
import { EditContactDialog } from './edit-contact-dialog';
import { AddToProjectDialog } from './add-to-project-dialog';
import { DeleteContactDialog } from './delete-contact-dialog';
import { CONTACT_COLUMNS, type ContactSort } from '@/lib/contact-columns';

export type ContactRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lastInteractionAt: string | null;
  website: string | null;
  jobTitle: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  projects: { id: string; name: string; role: 'client' | 'contact' }[];
};

/** The address book: everyone you work with, and the work they are attached to. */
export function ContactsTable({
  contacts,
  hiddenColumns,
  sort,
}: {
  contacts: ContactRow[];
  hiddenColumns: string[];
  sort: ContactSort;
}) {
  const router = useRouter();
  const { menu, toggle, close } = useMenu();
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [placing, setPlacing] = useState<ContactRow | null>(null);
  const [removing, setRemoving] = useState<ContactRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // The table's own settings, held here so a tick lands before the round trip.
  const [hidden, setHidden] = useState(hiddenColumns);
  const [order, setOrder] = useState(sort);
  // Where a row's menu was asked for, so it can be drawn clear of the table.
  const [menuAt, setMenuAt] = useState<Placement | null>(null);

  const columns = CONTACT_COLUMNS.filter((column) => !hidden.includes(column.key));

  const term = search.trim().toLowerCase();
  const found = term
    ? contacts.filter((contact) =>
        [
          contact.name,
          contact.email,
          contact.phone,
          contact.jobTitle,
          contact.website,
          contact.address,
          ...contact.tags,
          ...contact.projects.map((project) => project.name),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term),
      )
    : contacts;

  const shown = order.field ? [...found].sort(byColumn(order)) : found;

  const picked = chosen.filter((id) => shown.some((contact) => contact.id === id));
  const allPicked = shown.length > 0 && picked.length === shown.length;

  /** Every change to the table's shape is saved as it is made. */
  async function savePrefs(body: {
    hiddenColumns?: string[];
    sortField?: string | null;
    sortDir?: 'asc' | 'desc';
  }) {
    await api('/api/contact-prefs', { method: 'PATCH', body });
  }

  function toggleColumn(key: string) {
    const next = hidden.includes(key) ? hidden.filter((item) => item !== key) : [...hidden, key];
    setHidden(next);
    void savePrefs({ hiddenColumns: next });
  }

  /** First click orders by a column, the next turns it round. */
  function sortBy(field: string) {
    const next: ContactSort =
      order.field === field
        ? { field, dir: order.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' };
    setOrder(next);
    void savePrefs({ sortField: next.field, sortDir: next.dir });
  }

  async function bulk(action: 'delete' | 'addTags' | 'removeTags', tags: string[] = []) {
    setBusy(true);
    const { error: failure } = await api('/api/clients/bulk', {
      method: 'POST',
      body: { ids: picked, action, tags },
    });
    setBusy(false);
    if (failure) {
      setNotice(failure.error);
      return;
    }
    setNotice(null);
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
    const tags = (typed ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
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

      {/* Nothing wraps: a column keeps its line and the table scrolls sideways
          under it, so a narrow window shortens the table rather than folding
          every heading in two. */}
      <div className="card mt-4 overflow-x-auto">
        <table className="w-max min-w-full text-left text-sm">
          <thead className="text-muted border-line border-b">
            <tr className="[&>th]:px-5 [&>th]:py-3 [&>th]:font-medium [&>th]:whitespace-nowrap">
              <th className="w-10 pr-0">
                <input
                  type="checkbox"
                  checked={allPicked}
                  onChange={() => setChosen(allPicked ? [] : shown.map((contact) => contact.id))}
                  aria-label={allPicked ? 'Deselect all' : 'Select all'}
                  className="accent-brand-ink h-4 w-4 align-middle"
                />
              </th>

              <Heading column="name" label="Name" sortable order={order} onSort={sortBy} />
              {columns.map((column) => (
                <Heading
                  key={column.key}
                  column={column.key}
                  label={column.label}
                  sortable={column.sortable}
                  order={order}
                  onSort={sortBy}
                />
              ))}

              <th className="bg-surface sticky right-0 w-16 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                <span className="flex justify-end" data-menu>
                  <TablePrefsButton
                    open={menu === 'table-prefs'}
                    hidden={hidden}
                    onOpen={() => toggle('table-prefs')}
                    onToggleColumn={toggleColumn}
                  />
                </span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-line divide-y">
            {shown.map((contact) => (
              <tr
                key={contact.id}
                className="group/row [&>td]:px-5 [&>td]:py-4 [&>td]:whitespace-nowrap"
              >
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
                </td>

                {columns.map((column) => (
                  <td key={column.key} className="text-muted">
                    {column.key === 'projects' ? (
                      contact.projects.length === 0 ? (
                        '—'
                      ) : (
                        <span className="flex gap-1.5">
                          {contact.projects.map((project) => (
                            <span
                              key={project.id}
                              className="group/chip flex items-center gap-1 rounded-full bg-black/[0.05] py-1 pr-1.5 pl-2.5 text-xs"
                            >
                              <Link href={`/projects/${project.id}`} className="hover:underline">
                                {project.name}
                              </Link>
                              {project.role === 'contact' ? (
                                <Tip label={`Take ${contact.name} off ${project.name}`} floating>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void unlink(project.id, contact.id)}
                                    aria-label={`Take ${contact.name} off ${project.name}`}
                                    className="text-muted hover:text-accent opacity-0 transition-opacity group-hover/chip:opacity-100 disabled:opacity-30"
                                  >
                                    <CrossIcon />
                                  </button>
                                </Tip>
                              ) : (
                                <Tip
                                  label={`${contact.name} is the client this project is for`}
                                  floating
                                >
                                  <span aria-label="Client of this project" className="text-muted">
                                    <LockIcon />
                                  </span>
                                </Tip>
                              )}
                            </span>
                          ))}
                        </span>
                      )
                    ) : column.key === 'tags' ? (
                      contact.tags.length === 0 ? (
                        '—'
                      ) : (
                        <span className="flex gap-1.5">
                          {contact.tags.map((tag) => (
                            <span
                              key={tag}
                              className="bg-accent-soft text-accent rounded-full px-2.5 py-1 text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      )
                    ) : (
                      <Value text={cellText(contact, column.key)} />
                    )}
                  </td>
                ))}

                {/* Pinned to the right, so the two things you do with a row are
                    where you left them however far the table is scrolled. */}
                <td className="bg-surface sticky right-0 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                  <span className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100">
                    {contact.email && (
                      <Tip label="Send email" floating>
                        <a
                          href={`mailto:${contact.email}`}
                          aria-label={`Send email to ${contact.name}`}
                          className="text-muted hover:text-accent flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-black/[0.05]"
                        >
                          <MailIcon />
                        </a>
                      </Tip>
                    )}

                    <span data-menu>
                      <button
                        type="button"
                        onClick={(event) => {
                          setMenuAt(
                            placeUnder(
                              event.currentTarget.getBoundingClientRect(),
                              ROW_MENU_HEIGHT,
                            ),
                          );
                          toggle(contact.id);
                        }}
                        aria-expanded={menu === contact.id}
                        aria-label={`Actions for ${contact.name}`}
                        className="text-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-black/[0.05]"
                      >
                        <DotsIcon className="h-5 w-5" />
                      </button>
                      {menu === contact.id &&
                        menuAt &&
                        typeof document !== 'undefined' &&
                        createPortal(
                          <div
                            data-menu
                            style={menuAt.style}
                            className="border-line bg-surface fixed z-50 w-[200px] overflow-y-auto rounded-md border py-1 text-sm shadow-lg"
                          >
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
                                setRemoving(contact);
                              }}
                            >
                              <span className="text-accent flex items-center gap-2.5">
                                <TrashIcon className="h-4 w-4" />
                                Delete contact
                              </span>
                            </MenuItem>
                          </div>,
                          document.body,
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

      {removing && (
        <DeleteContactDialog
          contact={removing}
          onClose={() => setRemoving(null)}
          onDeleted={() => {
            setRemoving(null);
            router.refresh();
          }}
        />
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

/** A heading, and where it can be ordered by, the control that does it. */
function Heading({
  column,
  label,
  sortable,
  order,
  onSort,
}: {
  column: string;
  label: string;
  sortable: boolean;
  order: ContactSort;
  onSort: (field: string) => void;
}) {
  const active = order.field === column;

  if (!sortable) return <th>{label}</th>;

  return (
    <th aria-sort={active ? (order.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`hover:text-foreground group/sort flex items-center gap-1.5 transition-colors ${
          active ? 'text-foreground' : ''
        }`}
      >
        {label}
        <ArrowIcon
          className={`h-3.5 w-3.5 transition ${active ? '' : 'opacity-0 group-hover/sort:opacity-40'} ${
            active && order.dir === 'desc' ? 'rotate-180' : ''
          }`}
        />
      </button>
    </th>
  );
}

/** The sliders in the top right: which columns this table is made of. */
function TablePrefsButton({
  open,
  hidden,
  onOpen,
  onToggleColumn,
}: {
  open: boolean;
  hidden: string[];
  onOpen: () => void;
  onToggleColumn: (key: string) => void;
}) {
  // The table scrolls sideways, which would clip a panel drawn inside it, so
  // the panel is drawn on the page and told where to sit. Where that is gets
  // worked out when the button is pressed: under it if the list fits below,
  // above it if not, and never taller than the room it has.
  const [box, setBox] = useState<Placement | null>(null);

  return (
    <>
      <Tip label="Table preferences" floating>
        <button
          type="button"
          onClick={(event) => {
            setBox(placeUnder(event.currentTarget.getBoundingClientRect(), COLUMNS_PANEL_HEIGHT));
            onOpen();
          }}
          aria-expanded={open}
          aria-label="Table preferences"
          className={`text-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-black/[0.05] ${
            open ? 'bg-black/[0.06]' : ''
          }`}
        >
          <SlidersIcon />
        </button>
      </Tip>

      {open &&
        box &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-menu
            className="bg-surface fixed z-50 w-60 overflow-y-auto rounded-xl py-2 shadow-2xl ring-1 ring-black/10"
            style={box.style}
          >
            <p className="text-muted px-4 pt-1 pb-2 text-xs font-medium tracking-wide uppercase">
              Columns
            </p>

            <label
              title="Name always shows"
              className="text-muted flex h-10 cursor-default items-center gap-3 px-4 text-sm"
            >
              <input
                type="checkbox"
                checked
                disabled
                className="accent-brand-ink h-4 w-4"
                readOnly
              />
              Name
            </label>

            {CONTACT_COLUMNS.map((column) => (
              <label
                key={column.key}
                className="hover:bg-accent-soft/50 flex h-10 items-center gap-3 px-4 text-sm"
              >
                <input
                  type="checkbox"
                  className="accent-brand-ink h-4 w-4"
                  checked={!hidden.includes(column.key)}
                  onChange={() => onToggleColumn(column.key)}
                />
                {column.label}
              </label>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

type Placement = { style: React.CSSProperties };

/** Roughly how tall each panel wants to be: three rows, and one per column. */
const ROW_MENU_HEIGHT = 3 * 36 + 8;
const COLUMNS_PANEL_HEIGHT = (CONTACT_COLUMNS.length + 1) * 40 + 46;

/**
 * Puts the panel under the button, or over it when what it wants does not fit
 * below and there is more room above. `wanted` is roughly how tall the panel
 * would like to be — it decides which way round, not how tall it ends up.
 * Either way it is capped at the room it has and scrolls inside that, so the
 * last row of it stays reachable on a short window.
 */
function placeUnder(button: DOMRect, wanted: number): Placement {
  const gap = 8;
  const margin = 12;
  // Measured off the document element, not the window: `window.innerWidth`
  // counts the scrollbar, which a fixed panel does not sit under, and the
  // difference is exactly how far off the button it would land.
  const view = document.documentElement;
  const right = Math.max(margin, view.clientWidth - button.right);
  const below = view.clientHeight - button.bottom - gap - margin;
  const above = button.top - gap - margin;

  // Only go up when what is wanted does not fit below and up is the better half.
  if (below < wanted && above > below) {
    return { style: { bottom: view.clientHeight - button.top + gap, right, maxHeight: above } };
  }
  return { style: { top: button.bottom + gap, right, maxHeight: below } };
}

/** What one column of one contact reads as, before it is drawn. */
function cellText(contact: ContactRow, key: string): string | null {
  switch (key) {
    case 'jobTitle':
      return contact.jobTitle;
    case 'email':
      return contact.email;
    case 'phone':
      return contact.phone;
    case 'website':
      return contact.website;
    case 'address':
      return contact.address;
    case 'lastInteraction':
      return contact.lastInteractionAt
        ? new Date(contact.lastInteractionAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })
        : null;
    default:
      return null;
  }
}

/**
 * Orders by one column. Empty stays at the bottom whichever way round it is:
 * turning a column over is a question about the contacts that have a value,
 * and the ones that do not have no place at the top.
 */
function byColumn({ field, dir }: ContactSort) {
  return (a: ContactRow, b: ContactRow) => {
    const left = sortKey(a, field);
    const right = sortKey(b, field);
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;

    const order =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
    return dir === 'desc' ? -order : order;
  };
}

function sortKey(contact: ContactRow, field: string | null): string | number | null {
  if (field === 'name') return contact.name.trim() || null;
  if (field === 'lastInteraction') {
    return contact.lastInteractionAt ? new Date(contact.lastInteractionAt).getTime() : null;
  }
  return cellText(contact, field ?? '')?.trim() || null;
}

/** Anything unfilled reads the same way, so a row scans as a row. */
function Value({ text }: { text: string | null }) {
  const filled = text?.trim();
  if (!filled) return <>—</>;
  return (
    <span className="inline-block max-w-[280px] truncate align-middle" title={filled}>
      {filled}
    </span>
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

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M4 7h3M11 7h9M4 12h9M17 12h3M4 17h3M11 17h9" />
      <path d="M9 5v4M15 10v4M9 15v4" />
    </svg>
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
