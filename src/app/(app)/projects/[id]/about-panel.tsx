'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { Caret, Cross, DotsIcon, MenuItem, TrashIcon, useMenu } from './editor-kit';

/**
 * The panel beside every tab. Each field saves as soon as it is changed, so
 * there is nothing here to submit.
 */
export function AboutPanel({
  projectId,
  stageId,
  stages,
  leadSource,
  leadSources,
  tags,
}: {
  projectId: string;
  stageId: string | null;
  stages: { id: string; name: string }[];
  leadSource: string | null;
  leadSources: string[];
  tags: string[];
}) {
  const router = useRouter();
  const { menu, toggle, close } = useMenu();
  const [current, setCurrent] = useState({ stageId, leadSource, tags });
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(patch: Record<string, unknown>) {
    setCurrent((now) => ({ ...now, ...(patch as Partial<typeof now>) }));
    const { error: failure } = await api(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: patch,
    });
    if (failure) setError(failure.error);
    router.refresh();
  }

  async function removeProject() {
    const { error: failure } = await api(`/api/projects/${projectId}`, { method: 'DELETE' });
    if (failure) {
      setError(failure.error);
      return;
    }
    router.push('/projects');
  }

  function addTag(value: string) {
    const tag = value.trim();
    setDraft('');
    setAdding(false);
    if (!tag || current.tags.includes(tag)) return;
    void save({ tags: [...current.tags, tag] });
  }

  return (
    <section className="card overflow-visible">
      <header className="border-line flex items-start gap-3 border-b px-5 py-4">
        <span className="text-accent mt-0.5">
          <LockIcon className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="font-semibold">About this project</h2>
          <p className="text-muted mt-0.5 text-xs">Only visible to you</p>
        </div>

        <span className="relative" data-menu>
          <button
            type="button"
            onClick={() => toggle('about')}
            aria-label="Project actions"
            className="text-muted hover:text-foreground transition-colors"
          >
            <DotsIcon className="h-5 w-5" />
          </button>
          {menu === 'about' && (
            <div className="border-line bg-surface absolute top-full right-0 z-30 mt-1 w-[170px] rounded-md border py-1 text-sm shadow-lg">
              <MenuItem
                onClick={() => {
                  close();
                  void removeProject();
                }}
              >
                <span className="text-accent flex items-center gap-2.5">
                  <TrashIcon className="h-4 w-4" />
                  Delete project
                </span>
              </MenuItem>
            </div>
          )}
        </span>
      </header>

      <div className="space-y-5 px-5 py-5">
        <Field label="Stage" htmlFor="about-stage">
          <select
            id="about-stage"
            value={current.stageId ?? ''}
            onChange={(event) => void save({ stageId: event.target.value })}
            className="input-soft"
          >
            <option value="" disabled>
              Not set
            </option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Lead source" htmlFor="about-source">
          <select
            id="about-source"
            value={current.leadSource ?? ''}
            onChange={(event) => void save({ leadSource: event.target.value })}
            className="input-soft"
          >
            <option value="">Unknown</option>
            {leadSources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <p className="label">Tags</p>
          {current.tags.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {current.tags.map((tag) => (
                <li
                  key={tag}
                  className="bg-accent-soft text-accent flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() =>
                      void save({ tags: current.tags.filter((entry) => entry !== tag) })
                    }
                    aria-label={`Remove ${tag}`}
                  >
                    <Cross className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {adding ? (
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => addTag(draft)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addTag(draft);
                if (event.key === 'Escape') {
                  setDraft('');
                  setAdding(false);
                }
              }}
              placeholder="Type a tag"
              aria-label="New tag"
              className="input-soft"
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="input-soft text-muted flex h-9 items-center justify-between"
            >
              Add tags…
              <Caret className="h-4 w-4" />
            </button>
          )}
        </div>

        {error && <p className="field-error">{error}</p>}
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
