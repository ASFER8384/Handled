'use client';

import { useEffect, useRef, useState } from 'react';
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

/** A row identified by a key, so a reorder never loses track of which card. */
type Row = StageDraft & { key: string };

/** The card being carried, and where the pointer holds it. */
type Drag = { key: string; x: number; y: number; offsetX: number; offsetY: number };

const CARD = 'h-[168px] w-[185px]';

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
  const [stages, setStages] = useState<Row[]>(() =>
    initial.map((stage, index) => ({ ...stage, key: stage.id ?? `new-${index}` })),
  );
  const nextKey = useRef(initial.length);
  const [showGroups, setShowGroups] = useState(view.showGroups);
  const [drag, setDrag] = useState<Drag | null>(null);
  // The card that was just dropped keeps a dark outline until the next drag.
  const [landed, setLanded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pointer handlers run outside React's render, so they read the live value.
  const dragRef = useRef<Drag | null>(null);

  function setDragState(next: Drag | null) {
    dragRef.current = next;
    setDrag(next);
  }

  /** Puts the carried row at `target`, adopting `group`. */
  function reorder(key: string, target: number, group: StageGroup) {
    setStages((current) => {
      const from = current.findIndex((row) => row.key === key);
      if (from === -1) return current;
      const at = Math.max(0, Math.min(current.length - 1, from < target ? target - 1 : target));
      if (at === from && current[from].group === group) return current;
      const next = [...current];
      const [moving] = next.splice(from, 1);
      next.splice(at, 0, { ...moving, group });
      return next;
    });
  }

  /**
   * Only for a group with nothing in it: there is no card to hover, so the
   * empty box itself takes the drop.
   */
  function reorderToEmptyGroup(key: string, group: StageGroup) {
    setStages((current) => {
      const from = current.findIndex((row) => row.key === key);
      if (from === -1 || current.some((row, index) => index !== from && row.group === group)) {
        return current;
      }
      if (current[from].group === group) return current;
      return current.map((row, index) => (index === from ? { ...row, group } : row));
    });
  }

  function patch(index: number, next: Partial<StageDraft>) {
    setStages((current) =>
      current.map((stage, i) => (i === index ? { ...stage, ...next } : stage)),
    );
  }

  function add(group: StageGroup) {
    // Lands first in its group, right beside the Add stage tile that made it.
    const first = stages.findIndex((stage) => stage.group === group);
    const at = first === -1 ? stages.length : first;
    const key = `new-${nextKey.current++}`;
    setStages((current) => [
      ...current.slice(0, at),
      { name: '', group, hidden: false, key },
      ...current.slice(at),
    ]);
  }

  function remove(index: number) {
    setStages((current) => current.filter((_, i) => i !== index));
  }

  function startDrag(event: React.PointerEvent, index: number) {
    const slot = (event.currentTarget as HTMLElement).closest('[data-slot]');
    if (!slot) return;
    const rect = slot.getBoundingClientRect();
    event.preventDefault();
    setLanded(null);
    setDragState({
      key: stages[index].key,
      x: event.clientX,
      y: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
  }

  useEffect(() => {
    if (!drag) return;

    /** The row reorders once the pointer passes the middle of a neighbour. */
    function onMove(event: PointerEvent) {
      const held = dragRef.current;
      if (!held) return;

      const under = document.elementFromPoint(event.clientX, event.clientY);
      const slot = under?.closest('[data-slot]') as HTMLElement | null;
      const box = under?.closest('[data-group-box]') as HTMLElement | null;

      if (slot) {
        const over = Number(slot.dataset.index);
        const group = slot.dataset.group as StageGroup;
        const rect = slot.getBoundingClientRect();
        reorder(held.key, event.clientX > rect.left + rect.width / 2 ? over + 1 : over, group);
      } else if (box) {
        reorderToEmptyGroup(held.key, box.dataset.group as StageGroup);
      }

      setDragState({ ...held, x: event.clientX, y: event.clientY });
    }

    function onUp() {
      const key = dragRef.current?.key;
      setStages((current) => {
        setLanded(current.findIndex((row) => row.key === key));
        return current;
      });
      setDragState(null);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag]);

  async function save() {
    setError(null);
    if (stages.some((stage) => stage.name.trim() === '')) {
      setError('Every stage needs a name.');
      return;
    }

    setSaving(true);
    const { error: failure } = await api('/api/pipeline-stages', {
      method: 'PUT',
      body: {
        stages: stages.map(({ key: _key, ...stage }) => ({ ...stage, name: stage.name.trim() })),
      },
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

  function addTile(group: StageGroup) {
    return (
      <button
        type="button"
        onClick={() => add(group)}
        className="border-line text-accent hover:border-accent flex h-[168px] w-[135px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center font-semibold transition-colors"
      >
        <span aria-hidden className="text-2xl leading-none">
          +
        </span>
        Add stage
      </button>
    );
  }

  /** The card itself. `floating` is the copy that follows the pointer. */
  function card(stage: Row, index: number, floating = false) {
    return (
      <div
        className={`bg-surface flex flex-col rounded-lg border p-3 ${CARD} ${
          floating
            ? 'border-foreground pointer-events-none shadow-2xl'
            : landed === index
              ? 'border-foreground shadow-lg'
              : 'border-line'
        }`}
      >
        <input
          autoFocus={stage.id === undefined && stage.name === ''}
          value={stage.name}
          onChange={(event) => patch(index, { name: event.target.value })}
          placeholder="Add new"
          aria-label="Stage name"
          className="input-soft h-auto py-2 font-semibold"
          readOnly={floating}
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

          {/* Only the handle starts a drag, so the name stays selectable. */}
          <span
            onPointerDown={(event) => startDrag(event, index)}
            role="button"
            tabIndex={-1}
            aria-label="Drag to reorder"
            className="text-muted hover:text-foreground cursor-grab touch-none active:cursor-grabbing"
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
    );
  }

  /** The card's place in the row. It stays open while the card is carried. */
  function slot(stage: Row, index: number) {
    const held = drag?.key === stage.key;
    return (
      <div
        key={stage.key}
        data-slot
        data-index={index}
        data-group={stage.group}
        className="shrink-0"
      >
        {held ? (
          <div className={`border-line/70 rounded-lg border-2 border-dashed ${CARD}`} />
        ) : (
          card(stage, index)
        )}
      </div>
    );
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
          You can also add, delete, rename, or reorder stages. These changes update every view.
        </p>

        {/* Grouped, the two runs sit in their own outlined boxes; ungrouped,
            they combine into a single row. */}
        {showGroups ? (
          <div className="mt-8 flex gap-6 overflow-x-auto pb-4">
            {STAGE_GROUPS.map((group) => (
              <section key={group.group} className="shrink-0">
                <span
                  className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${group.chip}`}
                >
                  {group.label}
                </span>

                <div
                  data-group-box
                  data-group={group.group}
                  className={`mt-2 flex gap-3 rounded-xl border-2 p-3 ${group.outline}`}
                >
                  {addTile(group.group)}
                  {stages
                    .map((stage, index) => ({ stage, index }))
                    .filter((entry) => entry.stage.group === group.group)
                    .map(({ stage, index }) => slot(stage, index))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-8 flex gap-3 overflow-x-auto pb-4">
            {addTile(stages[0]?.group ?? 'OPPORTUNITY')}
            {stages.map((stage, index) => slot(stage, index))}
          </div>
        )}

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

      {/* The carried card, following the pointer. */}
      {drag &&
        (() => {
          const index = stages.findIndex((row) => row.key === drag.key);
          if (index === -1) return null;
          return (
            <div
              className="pointer-events-none fixed z-[60]"
              style={{ left: drag.x - drag.offsetX, top: drag.y - drag.offsetY }}
            >
              {card(stages[index], index, true)}
            </div>
          );
        })()}
    </div>
  );
}
