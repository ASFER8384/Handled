'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { Tip } from '@/components/ui';
import type { ViewFilter, ViewPrefs } from '@/lib/board-prefs';
import { CustomizeMenu } from './customize-menu';
import type { StageDraft } from './stages-dialog';

/** What the board and the table can be ordered by. */
export const SORT_FIELDS = [
  { key: 'stage', label: 'Stage' },
  { key: 'name', label: 'Project Name' },
  { key: 'date', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'leadSource', label: 'Lead Source' },
  { key: 'value', label: 'Value' },
] as const;

/**
 * The row above the board: sort and filter on the left, Customize and the
 * view switch on the right. Sorting lives in the URL, so the server does the
 * ordering and a reload keeps it.
 */
export type FilterField = { key: string; label: string; values: string[] };

export function BoardToolbar({
  view,
  stages,
  filters,
}: {
  view: ViewPrefs;
  stages: StageDraft[];
  filters: FilterField[];
}) {
  const router = useRouter();
  const [panel, setPanel] = useState(false);
  const [list, setList] = useState(false);
  // The Filter button opens the row below and its menu with it.
  const [filterMenu, setFilterMenu] = useState(false);
  const sortBar = useRef<HTMLDivElement>(null);

  // A click anywhere else puts the sort panel away.
  useEffect(() => {
    if (!panel) return;
    function onPointerDown(event: MouseEvent) {
      if (sortBar.current?.contains(event.target as Node)) return;
      setList(false);
      setPanel(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [panel]);

  const dir = view.sortDir === 'desc' ? 'desc' : 'asc';
  const field = SORT_FIELDS.find((item) => item.key === view.sortField);
  const applied = view.filters
    .map((entry) => ({ ...entry, label: filters.find((item) => item.key === entry.field)?.label }))
    .filter((entry) => entry.label !== undefined);

  // Sort, filter and layout all live on the view, so each tab keeps its own.
  async function save(body: Record<string, unknown>) {
    await api(`/api/project-views/${view.id}`, { method: 'PATCH', body });
    router.refresh();
  }

  function apply(next: { sort?: string | null; dir?: 'asc' | 'desc' }) {
    void save({
      ...(next.sort === undefined ? {} : { sortField: next.sort }),
      ...(next.dir === undefined ? {} : { sortDir: next.dir }),
    });
  }

  function addFilter(field: string, value: string) {
    // The same field twice would fight itself, so a repeat replaces the old.
    const next: ViewFilter[] = [
      ...view.filters.filter((entry) => entry.field !== field),
      { field, value },
    ];
    void save({ filters: next });
  }

  function dropFilter(field: string) {
    void save({ filters: view.filters.filter((entry) => entry.field !== field) });
  }

  function clearFilters() {
    void save({ filters: [] });
  }

  async function setLayout(layout: 'BOARD' | 'LIST') {
    if (layout === view.layout) return;
    await save({ layout });
  }

  return (
    <>
      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <IconButton
            label="Sort"
            tinted
            active={Boolean(field)}
            onClick={() => {
              if (field) {
                setPanel(false);
                apply({ sort: null });
              } else {
                apply({ sort: 'stage', dir: 'asc' });
              }
            }}
          >
            <path d="M7 20V4m0 16-3-3m3 3 3-3M17 4v16m0-16-3 3m3-3 3 3" />
          </IconButton>
        </div>

        <div className="flex items-center gap-4">
          <CustomizeMenu stages={stages} view={view} />

          <span aria-hidden className="bg-line h-6 w-px" />

          <div className="bg-accent-soft/50 flex gap-1 rounded-lg p-1">
            <ViewLink
              onClick={() => void setLayout('LIST')}
              active={view.layout === 'LIST'}
              label="List view"
            >
              <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
              <path d="M3.5 9h17M9 9v10.5M12 12.5h6M12 16h6" />
            </ViewLink>
            <ViewLink
              onClick={() => void setLayout('BOARD')}
              active={view.layout === 'BOARD'}
              label="Board view"
            >
              <rect
                x="4"
                y="4.5"
                width="6"
                height="15"
                rx="1.5"
                fill="currentColor"
                stroke="none"
              />
              <rect
                x="14"
                y="4.5"
                width="6"
                height="9"
                rx="1.5"
                fill="currentColor"
                stroke="none"
              />
            </ViewLink>
          </div>
        </div>
      </div>

      {(field || applied.length > 0 || filterMenu) && (
        <div ref={sortBar} className="relative mt-4 flex items-center gap-3">
          {field && (
            <button
              type="button"
              onClick={() => {
                setList(false);
                setPanel((value) => !value);
              }}
              aria-expanded={panel}
              className="border-accent bg-accent-soft text-accent flex h-[26px] items-center rounded-full border px-2 text-sm font-medium select-none"
            >
              <Arrow dir={dir} className="h-3.5 w-3.5" strokeWidth="2.6" />
              {field.label}
            </button>
          )}

          {applied.map((entry) => (
            <button
              key={entry.field}
              type="button"
              onClick={() => dropFilter(entry.field)}
              className="border-accent bg-accent-soft text-accent flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-sm font-medium select-none"
            >
              {entry.label}: {entry.value}
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          ))}

          {applied.length > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-accent h-[26px] text-sm font-medium hover:underline"
            >
              Clear all
            </button>
          )}

          <span aria-hidden className="bg-line h-6 w-px" />

          <AddFilter
            fields={filters}
            open={filterMenu}
            onOpenChange={setFilterMenu}
            onPick={addFilter}
          />

          {panel && field && (
            <div className="absolute top-full left-0 z-40 mt-1.5 w-[248px] rounded-lg bg-white p-3 shadow-xl ring-1 ring-black/10">
              <p className="text-muted mb-1.5 text-xs">Sort by</p>
              <div className="flex items-center gap-2">
                <FieldSelect
                  value={field}
                  onPick={(key) => {
                    setList(false);
                    apply({ sort: key });
                  }}
                  open={list}
                  onToggle={() => setList((value) => !value)}
                  onClose={() => setList(false)}
                />
                <Tip label={dir === 'asc' ? 'Ascending' : 'Descending'} side="right">
                  <button
                    type="button"
                    onClick={() => apply({ dir: dir === 'asc' ? 'desc' : 'asc' })}
                    aria-label={dir === 'asc' ? 'Sort descending' : 'Sort ascending'}
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-black/[0.05] transition-colors hover:bg-black/[0.09]"
                  >
                    <Arrow dir={dir} className="h-4 w-4" />
                  </button>
                </Tip>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * A select in spirit only: the native one renders OS chrome, which cannot be
 * styled to match the rest of the panel.
 */
function FieldSelect({
  value,
  open,
  onToggle,
  onClose,
  onPick,
}: {
  value: (typeof SORT_FIELDS)[number];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPick: (key: string) => void;
}) {
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, onClose]);

  return (
    <div ref={wrapper} className="relative flex-1">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-md bg-black/[0.05] px-2.5 text-[13px] transition-colors hover:bg-black/[0.08]"
      >
        {value.label}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="text-muted h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute top-full left-0 z-50 mt-1.5 max-h-[168px] w-full overflow-y-auto rounded-lg bg-white py-1 shadow-xl ring-1 ring-black/10"
        >
          {SORT_FIELDS.filter((item) => item.key !== value.key).map((item) => (
            <li key={item.key}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => onPick(item.key)}
                className="hover:bg-accent-soft/60 flex h-8 w-full items-center px-3 text-left text-[13px] transition-colors"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Picks a field, then one of the values that field actually holds — a filter
 * that can only ever select something the board can show.
 */
function AddFilter({
  fields,
  open,
  onOpenChange,
  onPick,
}: {
  fields: FilterField[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (key: string, value: string) => void;
}) {
  const [field, setField] = useState<FilterField | null>(null);
  const setOpen = onOpenChange;
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (wrapper.current?.contains(event.target as Node)) return;
      onOpenChange(false);
      setField(null);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, onOpenChange]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => {
          setField(null);
          setOpen(!open);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="hover:text-accent flex h-8 items-center gap-2 text-sm font-medium transition-colors"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add filter
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 z-50 mt-1.5 max-h-[220px] w-[220px] overflow-y-auto rounded-lg bg-white py-1 shadow-xl ring-1 ring-black/10"
        >
          {field === null ? (
            fields.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.values.length === 0}
                onClick={() => setField(item)}
                className="hover:bg-accent-soft/60 flex h-8 w-full items-center justify-between px-3 text-left text-[13px] transition-colors disabled:opacity-40"
              >
                {item.label}
                <span className="text-muted">›</span>
              </button>
            ))
          ) : (
            <>
              <button
                type="button"
                onClick={() => setField(null)}
                className="text-muted hover:bg-accent-soft/60 flex h-8 w-full items-center gap-1 px-3 text-left text-[13px] transition-colors"
              >
                ‹ {field.label}
              </button>
              {field.values.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    setField(null);
                    onPick(field.key, value);
                  }}
                  className="hover:bg-accent-soft/60 flex h-8 w-full items-center px-3 text-left text-[13px] transition-colors"
                >
                  {value}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Down for ascending, up for descending — the arrow is the direction. */
function Arrow({
  dir,
  className = 'h-4 w-4',
  strokeWidth = '1.8',
}: {
  dir: string;
  className?: string;
  strokeWidth?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dir === 'asc' ? (
        <path d="M12 5v14m0 0-5-5m5 5 5-5" />
      ) : (
        <path d="M12 19V5m0 0-5 5m5-5 5 5" />
      )}
    </svg>
  );
}

function IconButton({
  label,
  active,
  tinted,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  /** Sort wears its tile all the time, the way the reference toolbar does. */
  tinted?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          tinted ? 'bg-accent-soft text-accent' : 'text-foreground hover:bg-accent-soft/40'
        }`}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {children}
        </svg>
      </button>
    </Tip>
  );
}


function ViewLink({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={`flex h-8 w-9 items-center justify-center rounded-md transition-colors ${
          active ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'
        }`}
      >
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
          {children}
        </svg>
      </button>
    </Tip>
  );
}
