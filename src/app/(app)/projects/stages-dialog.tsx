'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { STAGE_GROUPS } from '@/lib/stages';
import type { ViewPrefs } from '@/lib/board-prefs';
import type { StageGroup } from '@/generated/prisma/enums';

export type StageDraft = {
  id?: string;
  name: string;
  group: StageGroup;
  hidden: boolean;
};

/**
 * Full-width editor for the pipeline itself: add, rename, reorder, hide and
 * delete stages inside their two groups. Saved in one PUT, so a half-applied
 * pipeline is never a state the board can be in.
 */
export function StagesDialog({
  initial,
  view,
  onClose,
}: {
  initial: StageDraft[];
  view: ViewPrefs;
  onClose: () => void;
}) {
  const router = useRouter();
  const [stages, setStages] = useState<StageDraft[]>(initial);
  const [showGroups, setShowGroups] = useState(view.showGroups);
  const [dragging, setDragging] = useState<number | null>(null);
  const [handle, setHandle] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function patch(index: number, next: Partial<StageDraft>) {
    setStages((current) =>
      current.map((stage, i) => (i === index ? { ...stage, ...next } : stage)),
    );
  }

  function add(group: StageGroup) {
    // Lands first in its group, right beside the Add stage tile that made it.
    const first = stages.findIndex((stage) => stage.group === group);
    const at = first === -1 ? stages.length : first;
    setStages((current) => [
      ...current.slice(0, at),
      { name: '', group, hidden: false },
      ...current.slice(at),
    ]);
  }

  function remove(index: number) {
    setStages((current) => current.filter((_, i) => i !== index));
  }

  /** Drops the dragged stage in front of `index`, adopting that group. */
  function drop(index: number, group: StageGroup) {
    if (dragging === null) return;
    setStages((current) => {
      const next = [...current];
      const [moving] = next.splice(dragging, 1);
      const at = dragging < index ? index - 1 : index;
      next.splice(at, 0, { ...moving, group });
      return next;
    });
    setDragging(null);
  }

  async function save() {
    setError(null);
    if (stages.some((stage) => stage.name.trim() === '')) {
      setError('Every stage needs a name.');
      return;
    }

    setSaving(true);
    const { error: failure } = await api('/api/pipeline-stages', {
      method: 'PUT',
      body: { stages: stages.map((stage) => ({ ...stage, name: stage.name.trim() })) },
    });
    if (!failure && showGroups !== view.showGroups) {
      await api(`/api/project-views/${view.id}`, { method: 'PATCH', body: { showGroups } });
    }
    setSaving(false);
    if (failure) {
      setError(failure.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="bg-surface fixed inset-0 z-50 flex flex-col">
      <header className="border-line relative flex shrink-0 items-center justify-center border-b px-6 py-5">
        <h2 className="text-xl font-semibold">Edit main pipeline stages</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted hover:text-foreground absolute right-6 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-10 py-8">
        <p>Customize your view by selecting stages you&rsquo;d like to show or hide.</p>
        <p className="mt-1">
          You can also add, delete, rename, or reorder stages — these changes update every view.
        </p>

        <div className="mt-8 flex gap-6 overflow-x-auto pb-4">
          {STAGE_GROUPS.map((group) => {
            const indexes = stages
              .map((stage, index) => ({ stage, index }))
              .filter((entry) => entry.stage.group === group.group);

            return (
              <section key={group.group} className="shrink-0">
                <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${group.chip}`}>
                  {group.label}
                </span>

                <div className="border-line mt-2 flex gap-3 rounded-xl border-2 p-3">
                  <button
                    type="button"
                    onClick={() => add(group.group)}
                    className="border-line text-accent hover:border-accent flex h-[230px] w-[170px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed font-semibold transition-colors"
                  >
                    <span aria-hidden className="text-2xl leading-none">
                      +
                    </span>
                    Add stage
                  </button>

                  {indexes.map(({ stage, index }) => (
                    <div
                      key={stage.id ?? `new-${index}`}
                      draggable={handle === index}
                      onDragStart={() => setDragging(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => drop(index, group.group)}
                      onDragEnd={() => {
                        setDragging(null);
                        setHandle(null);
                      }}
                      className={`border-line bg-surface flex h-[230px] w-[170px] shrink-0 flex-col rounded-lg border p-3 ${
                        dragging === index ? 'opacity-40' : ''
                      }`}
                    >
                      <input
                        autoFocus={stage.id === undefined && stage.name === ''}
                        value={stage.name}
                        onChange={(event) => patch(index, { name: event.target.value })}
                        placeholder="Add new"
                        aria-label="Stage name"
                        className="input-soft h-auto py-2 font-semibold"
                      />

                      <label className="text-muted mt-3 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="accent-foreground h-4 w-4"
                          checked={!stage.hidden}
                          onChange={(event) => patch(index, { hidden: !event.target.checked })}
                        />
                        Show in view
                      </label>

                      <div className="mt-auto flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          aria-label={`Delete ${stage.name || 'stage'}`}
                          className="text-muted hover:text-accent transition-colors"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 7h16M10 7V5h4v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />
                          </svg>
                        </button>

                        {/* Only the handle arms the drag, so the name stays selectable. */}
                        <span
                          onMouseDown={() => setHandle(index)}
                          onMouseUp={() => setHandle(null)}
                          role="button"
                          tabIndex={-1}
                          aria-label="Drag to reorder"
                          className="text-muted hover:text-foreground cursor-grab active:cursor-grabbing"
                        >
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                            <circle cx="9" cy="6" r="1.5" />
                            <circle cx="15" cy="6" r="1.5" />
                            <circle cx="9" cy="12" r="1.5" />
                            <circle cx="15" cy="12" r="1.5" />
                            <circle cx="9" cy="18" r="1.5" />
                            <circle cx="15" cy="18" r="1.5" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <label className="mt-6 flex items-center gap-2.5 font-medium">
          <input
            type="checkbox"
            className="accent-foreground h-4 w-4"
            checked={showGroups}
            onChange={(event) => setShowGroups(event.target.checked)}
          />
          Show group stages in this view
        </label>

        {error && <p className="field-error mt-4">{error}</p>}
      </div>

      <footer className="border-line flex shrink-0 items-center justify-end gap-4 border-t px-10 py-5">
        <button type="button" onClick={onClose} className="font-semibold">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={saving} className="btn-primary px-6">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </footer>
    </div>
  );
}
