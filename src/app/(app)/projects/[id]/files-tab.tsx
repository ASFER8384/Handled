'use client';

import { useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { api } from '@/lib/client-fetch';

export type ProjectFile = {
  id: string;
  name: string;
  url: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  uploaded: boolean;
  createdAt: string;
};

const isImage = (file: ProjectFile) => Boolean(file.mimeType?.startsWith('image/'));
const href = (file: ProjectFile) =>
  file.uploaded ? `/api/project-files/${file.id}/content` : (file.url ?? '#');

function readableSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesTab({ projectId, files }: { projectId: string; files: ProjectFile[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // Held locally too, so an upload shows the moment it lands.
  const [items, setItems] = useState(files);
  // Attach in the header opens this by landing here with ?attach=1.
  const open = params.get('attach') === '1';

  function closeDialog() {
    router.replace(`${pathname}?tab=files`);
  }

  const documents = items.filter((file) => !isImage(file));
  const images = items.filter(isImage);

  async function remove(id: string) {
    const { error } = await api(`/api/project-files/${id}`, { method: 'DELETE' });
    if (error) return;
    setItems((current) => current.filter((file) => file.id !== id));
    router.refresh();
  }

  return (
    <div className="mt-6">
      {/* A heading only appears for a section that has something in it. */}
      {items.length === 0 && <p className="text-muted text-sm">Nothing attached yet.</p>}

      {documents.length > 0 && (
        <>
          <h2 className="text-muted text-xs font-semibold tracking-widest uppercase">
            Attachments
          </h2>
          <ul className="mt-4 grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {documents.map((file) => (
              <FileCard key={file.id} file={file} onRemove={() => void remove(file.id)} />
            ))}
          </ul>
        </>
      )}

      {images.length > 0 && (
        <>
          <h2
            className={`text-muted text-xs font-semibold tracking-widest uppercase ${
              documents.length > 0 ? 'mt-10' : ''
            }`}
          >
            Images
          </h2>
          <ul className="mt-4 grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {images.map((file) => (
              <FileCard key={file.id} file={file} onRemove={() => void remove(file.id)} />
            ))}
          </ul>
        </>
      )}

      {open && (
        <AttachDialog
          projectId={projectId}
          onClose={closeDialog}
          onDone={(added) => {
            setItems((current) => [...added, ...current]);
            closeDialog();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function FileCard({ file, onRemove }: { file: ProjectFile; onRemove: () => void }) {
  return (
    <li className="group/file relative">
      <a
        href={href(file)}
        target="_blank"
        rel="noreferrer"
        className="border-line bg-surface hover:border-accent block h-[190px] overflow-hidden rounded-md border transition-colors"
      >
        {isImage(file) ? (
          // eslint-disable-next-line @next/next/no-img-element -- served by an authed route, not optimizable
          <img src={href(file)} alt={file.name} className="h-[120px] w-full object-cover" />
        ) : (
          <span className="bg-accent-soft/60 text-accent flex h-[120px] items-center justify-center">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-9 w-9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
              <path d="M14 3v4h4M9 13h6M9 17h4" />
            </svg>
          </span>
        )}
        <span className="block px-3 py-2">
          <span className="line-clamp-2 text-sm font-medium">{file.name}</span>
          <span className="text-muted mt-1 block text-xs">
            {file.uploaded ? readableSize(file.sizeBytes) : 'Link'}
          </span>
        </span>
      </a>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="bg-surface text-muted hover:text-accent absolute top-2 right-2 rounded-full p-1 opacity-0 shadow transition-opacity group-focus-within/file:opacity-100 group-hover/file:opacity-100"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        >
          <path d="M4 7h16M10 7V5h4v2M6 7l1 13h10l1-13" />
        </svg>
      </button>
    </li>
  );
}

/** Upload real files, or record a link to one kept somewhere else. */
function AttachDialog({
  projectId,
  onClose,
  onDone,
}: {
  projectId: string;
  onClose: () => void;
  onDone: (files: ProjectFile[]) => void;
}) {
  const [tab, setTab] = useState<'upload' | 'link'>('upload');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const input = useRef<HTMLInputElement>(null);

  async function upload(list: FileList | null) {
    if (!list || list.length === 0) return;
    const body = new FormData();
    for (const file of Array.from(list)) body.append('files', file);

    setBusy(true);
    setError(null);
    const response = await fetch(`/api/projects/${projectId}/files`, { method: 'POST', body });
    const payload = (await response.json().catch(() => null)) as {
      files?: ProjectFile[];
      error?: string;
    } | null;
    setBusy(false);

    if (!response.ok || !payload?.files) {
      setError(payload?.error ?? 'That upload did not go through');
      return;
    }
    onDone(payload.files.map((file) => ({ ...file, uploaded: true })));
  }

  async function link() {
    setBusy(true);
    const { data, error: failure } = await api<{ files: ProjectFile[] }>(
      `/api/projects/${projectId}/files`,
      { method: 'POST', body: { name, url } },
    );
    setBusy(false);
    if (failure || !data) {
      setError(failure?.error ?? 'Could not save that');
      return;
    }
    onDone(data.files.map((file) => ({ ...file, uploaded: false })));
  }

  return (
    <Dialog title="Attach image or file" onClose={onClose}>
      {/* Same choice control as Add contact, so the two dialogs read alike. */}
      <div className="mb-6 flex items-center gap-10">
        {(
          [
            ['upload', 'Upload a file'],
            ['link', 'Link to a file'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2.5 text-sm">
            <input
              type="radio"
              name="attach-mode"
              checked={tab === value}
              onChange={() => setTab(value)}
              className="accent-brand-ink h-[18px] w-[18px]"
            />
            {label}
          </label>
        ))}
      </div>

      {tab === 'upload' ? (
        <div className="text-center">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void upload(event.dataTransfer.files);
            }}
            className={`flex h-[210px] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
              dragging ? 'border-accent bg-accent-soft/40' : 'border-line bg-black/[0.02]'
            }`}
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="text-accent h-16 w-16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h7A1.5 1.5 0 0 1 19 10v7.5A1.5 1.5 0 0 1 17.5 19h-13A1.5 1.5 0 0 1 3 17.5z" />
              <path d="M12 16v-5m0 0-2 2m2-2 2 2" />
            </svg>
            <p className="text-muted mt-4 text-sm">
              {busy ? 'Uploading…' : 'Images, PDFs, documents and spreadsheets, up to 20MB each'}
            </p>
          </div>

          <p className="text-muted mt-5">
            Drop files here or{' '}
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="text-accent font-semibold hover:underline"
            >
              choose files
            </button>
          </p>

          <input
            ref={input}
            type="file"
            multiple
            hidden
            aria-label="Choose files"
            onChange={(event) => void upload(event.target.files)}
          />

          {error && <p className="field-error mt-4">{error}</p>}
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label htmlFor="file-name" className="label">
              Name
            </label>
            <input
              id="file-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Wedding contract"
              className="input-soft"
            />
          </div>
          <div>
            <label htmlFor="file-url" className="label">
              Link
            </label>
            <input
              id="file-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
              className="input-soft"
            />
          </div>
          {error && <p className="field-error">{error}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void link()}
              disabled={busy}
              className="btn-primary px-5"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
