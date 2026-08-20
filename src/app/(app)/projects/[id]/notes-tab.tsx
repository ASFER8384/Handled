'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { Select } from '@/components/select';
import { EyeIcon, EyeOffIcon, FilterIcon } from './editor-kit';
import { NoteEditor } from './note-editor';

export type ProjectNote = {
  id: string;
  title: string | null;
  body: string;
  bodyHtml: string | null;
  sharedWithClient: boolean;
  createdAt: string;
  updatedAt: string;
};

const SORTS = [
  { key: 'edited', label: 'Recently edited' },
  { key: 'created', label: 'Recently created' },
  { key: 'title', label: 'By title' },
] as const;

const EMPTY_PREVIEW =
  'This is an empty note. Once text is added to your note, a preview will be shown here.';

/** Notes live as cards; opening one hands it to the editor. */
export function NotesTab({ projectId, notes }: { projectId: string; notes: ProjectNote[] }) {
  const router = useRouter();
  const [cards, setCards] = useState(notes);
  const [sort, setSort] = useState<(typeof SORTS)[number]['key']>('edited');
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ordered = [...cards].sort((a, b) => {
    if (sort === 'title') return (a.title ?? '').localeCompare(b.title ?? '');
    const key = sort === 'created' ? 'createdAt' : 'updatedAt';
    return b[key].localeCompare(a[key]);
  });

  async function create(from?: ProjectNote) {
    const { data, error: failure } = await api<{ note: ProjectNote }>(
      `/api/projects/${projectId}/notes`,
      {
        method: 'POST',
        body: from
          ? {
              title: from.title ? `${from.title} (copy)` : undefined,
              body: from.body,
              bodyHtml: from.bodyHtml ?? undefined,
              sharedWithClient: from.sharedWithClient,
            }
          : { body: '' },
      },
    );
    if (failure || !data) {
      setError(failure?.error ?? 'Could not add that note');
      return;
    }
    setCards((current) => [data.note, ...current]);
    setOpenId(data.note.id);
    router.refresh();
  }

  async function remove(id: string) {
    setCards((current) => current.filter((note) => note.id !== id));
    setOpenId(null);
    await api(`/api/project-notes/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  const open = cards.find((note) => note.id === openId) ?? null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-muted flex items-center gap-2 text-sm">
          <FilterIcon className="h-4 w-4" />
          All notes <span className="text-foreground font-medium">({cards.length})</span>
        </p>

        <Select
          className="w-[190px]"
          ariaLabel="Order the notes"
          value={sort}
          options={SORTS.map((option) => ({ value: option.key, label: option.label }))}
          onChange={(key) => setSort(key as typeof sort)}
        />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-3 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => void create()}
          className="border-line hover:border-accent hover:text-accent text-muted flex h-[260px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition-colors"
        >
          <span aria-hidden className="text-2xl leading-none">
            +
          </span>
          <span className="text-foreground font-medium">Add a note</span>
        </button>

        {ordered.map((note) => (
          <button
            key={note.id}
            type="button"
            onClick={() => setOpenId(note.id)}
            className="border-line bg-surface hover:border-accent flex h-[260px] flex-col rounded-lg border p-5 text-left transition-colors"
          >
            <p className={`font-medium ${note.title ? '' : 'text-muted'}`}>
              {note.title || 'Untitled note'}
            </p>
            <p
              className={`mt-3 line-clamp-5 flex-1 text-sm ${
                note.body.trim() ? 'text-muted' : 'text-muted/70'
              }`}
            >
              {note.body.trim() || EMPTY_PREVIEW}
            </p>
            <span className="text-muted mt-4 flex items-center justify-between text-xs">
              {since(note.updatedAt)}
              {note.sharedWithClient ? (
                <EyeIcon className="h-4 w-4" />
              ) : (
                <EyeOffIcon className="h-4 w-4" />
              )}
            </span>
          </button>
        ))}
      </div>

      {error && <p className="field-error mt-4">{error}</p>}

      {open && (
        <NoteEditor
          projectId={projectId}
          note={open}
          onSaved={(saved) =>
            setCards((current) => current.map((note) => (note.id === saved.id ? saved : note)))
          }
          onDuplicate={(from) => void create(from)}
          onDelete={() => void remove(open.id)}
          onClose={() => {
            setOpenId(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/** Rough, and deliberately so: nobody needs the second a note was touched. */
function since(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 2) return 'a few moments ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'medium' });
}
