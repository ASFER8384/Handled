'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { Select } from '@/components/select';

export type ProjectTask = {
  id: string;
  title: string;
  done: boolean;
  /** ISO, or null when no date has been set. */
  dueAt: string | null;
  dueHasTime: boolean;
  assigneeId: string | null;
};

export type Member = { id: string; name: string };

/**
 * Tasks are edited where they are read: the title, the date, the time and the
 * person are each saved on their own the moment they are changed.
 */
export function TasksTab({
  projectId,
  tasks,
  members,
  me,
}: {
  projectId: string;
  tasks: ProjectTask[];
  members: Member[];
  me: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(tasks);
  const [error, setError] = useState<string | null>(null);
  /** The row to put the caret in once it has been added. */
  const [fresh, setFresh] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [filters, setFilters] = useState({ due: '', status: '', assignee: '' });
  const [panel, setPanel] = useState(false);

  const [sort, setSort] = useState<'asc' | 'desc' | null>(null);

  const active = Object.values(filters).filter(Boolean).length;
  const shown = rows.filter((task) => matches(task, filters));
  if (sort) {
    // Undated tasks sit at the bottom either way: they answer neither order.
    shown.sort((a, b) => {
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return sort === 'asc' ? a.dueAt.localeCompare(b.dueAt) : b.dueAt.localeCompare(a.dueAt);
    });
  }

  async function add() {
    // Guarded: a second click while the first is in flight made two tasks.
    if (adding) return;
    setAdding(true);
    const { data, error: failure } = await api<{ task: ProjectTask }>('/api/tasks', {
      method: 'POST',
      body: { title: 'Task name', projectId, assigneeId: me },
    });
    setAdding(false);
    if (failure || !data) {
      setError(failure?.error ?? 'Could not add that task');
      return;
    }
    setRows((current) => [...current, data.task]);
    setFresh(data.task.id);
    router.refresh();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...(body as Partial<ProjectTask>) } : row)),
    );
    const { error: failure } = await api(`/api/tasks/${id}`, { method: 'PATCH', body });
    if (failure) setError(failure.error);
    router.refresh();
  }

  async function remove(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
    await api(`/api/tasks/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  useEffect(() => {
    if (!panel) return;
    function away(event: MouseEvent) {
      if (!(event.target as HTMLElement).closest('[data-filter]')) setPanel(false);
    }
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [panel]);

  if (rows.length === 0) {
    return (
      <div className="py-20 text-center">
        <TaskArt />
        <h2 className="mt-6 text-lg font-semibold">No tasks yet</h2>
        <p className="text-muted mx-auto mt-2 max-w-md">
          Keep track of what this project needs, all in one place.
        </p>
        <button
          type="button"
          onClick={() => void add()}
          disabled={adding}
          className="text-accent mx-auto mt-5 flex items-center gap-2 font-medium hover:underline disabled:opacity-50"
        >
          <span aria-hidden className="text-lg leading-none">
            +
          </span>
          Create a task
        </button>
        {error && <p className="field-error mt-3">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted">Everything this project still needs doing.</p>
        <button
          type="button"
          onClick={() => void add()}
          disabled={adding}
          className="border-line hover:border-accent rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          Add task
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-muted text-sm">
          {active > 0 ? (
            <>
              {shown.length} of <span className="text-foreground font-medium">{rows.length}</span>{' '}
              {rows.length === 1 ? 'task' : 'tasks'}
            </>
          ) : (
            <>
              {rows.length} {rows.length === 1 ? 'task' : 'tasks'}
            </>
          )}
        </p>

        <div className="relative" data-filter>
          {active > 0 && (
            <span className="bg-accent absolute -top-2 -right-2 z-10 flex h-[20px] min-w-[20px] items-center justify-center rounded-md px-1 text-[11px] font-semibold text-white">
              {active}
            </span>
          )}
          <button
            type="button"
            onClick={() => setPanel((open) => !open)}
            aria-expanded={panel}
            className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              panel || active > 0 ? 'bg-accent-soft text-accent' : 'hover:bg-black/[0.05]'
            }`}
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            >
              <path d="M4 7h16M7 12h10M10 17h4" />
            </svg>
            Filter
          </button>

          {panel && (
            <div className="border-line bg-surface absolute top-full right-0 z-30 mt-2 w-[300px] rounded-xl border p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-muted text-xs font-semibold tracking-widest uppercase">
                  Filter by
                </h3>
                <button
                  type="button"
                  onClick={() => setFilters({ due: '', status: '', assignee: '' })}
                  className="hover:text-accent flex items-center gap-1.5 text-sm font-medium transition-colors"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                  Clear all
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <Choice
                  label="Due date"
                  value={filters.due}
                  onChange={(due) => setFilters((current) => ({ ...current, due }))}
                  options={[
                    ['overdue', 'Overdue'],
                    ['today', 'Today'],
                    ['week', 'This week'],
                    ['month', 'This month'],
                    ['none', 'No date'],
                  ]}
                />
                <Choice
                  label="Status"
                  value={filters.status}
                  onChange={(status) => setFilters((current) => ({ ...current, status }))}
                  options={[
                    ['open', 'Open'],
                    ['done', 'Done'],
                  ]}
                />
                <Choice
                  label="Assigned to"
                  value={filters.assignee}
                  onChange={(assignee) => setFilters((current) => ({ ...current, assignee }))}
                  options={[
                    ...members.map((member) => [member.id, member.name] as [string, string]),
                    ['nobody', 'Nobody yet'],
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="border-line mt-3 rounded-xl border py-16 text-center">
          <h3 className="font-semibold">No results found</h3>
          <p className="text-muted mt-2">Change or remove filters to broaden your search.</p>
        </div>
      ) : (
        <table className="mt-3 w-full border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-muted text-left text-xs tracking-widest uppercase">
              <th className="w-10" />
              <th className="py-1 font-semibold">Title</th>
              <th className="w-[170px] py-1 font-semibold">
                <button
                  type="button"
                  onClick={() => setSort(sort === 'asc' ? 'desc' : sort === 'desc' ? null : 'asc')}
                  aria-label={`Sort by due date, ${sort ?? 'off'}`}
                  className="hover:text-foreground flex items-center gap-1.5 tracking-widest uppercase transition-colors"
                >
                  Due date
                  <SortMark dir={sort} />
                </button>
              </th>
              <th className="w-[130px] py-1 font-semibold">Due time</th>
              <th className="w-[170px] py-1 font-semibold">Assigned to</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {shown.map((task) => (
              <Row
                key={task.id}
                task={task}
                members={members}
                autoFocus={task.id === fresh}
                onPatch={(body) => void patch(task.id, body)}
                onRemove={() => void remove(task.id)}
              />
            ))}
          </tbody>
        </table>
      )}

      {error && <p className="field-error mt-3">{error}</p>}
    </div>
  );
}

/** One filled dropdown, reading "Select" until it is set. */
function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="label" htmlFor={`filter-${label}`}>
        {label}
      </label>
      <Select
        id={`filter-${label}`}
        value={value || null}
        options={options.map(([key, text]) => ({ value: key, label: text }))}
        onChange={onChange}
      />
    </div>
  );
}

/** Whether a task survives the filters. An unset filter waves everything through. */
function matches(
  task: ProjectTask,
  filters: { due: string; status: string; assignee: string },
): boolean {
  if (filters.status === 'open' && task.done) return false;
  if (filters.status === 'done' && !task.done) return false;

  if (filters.assignee === 'nobody' && task.assigneeId) return false;
  if (filters.assignee && filters.assignee !== 'nobody' && task.assigneeId !== filters.assignee) {
    return false;
  }

  if (filters.due) {
    if (filters.due === 'none') return task.dueAt === null;
    if (!task.dueAt) return false;

    const due = new Date(task.dueAt);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filters.due === 'overdue') return due < startOfToday && !task.done;
    if (filters.due === 'today') {
      const tomorrow = new Date(startOfToday);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return due >= startOfToday && due < tomorrow;
    }
    if (filters.due === 'week') {
      const end = new Date(startOfToday);
      end.setDate(end.getDate() + 7);
      return due >= startOfToday && due < end;
    }
    if (filters.due === 'month') {
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return due >= startOfToday && due < end;
    }
  }

  return true;
}

function Row({
  task,
  members,
  autoFocus,
  onPatch,
  onRemove,
}: {
  task: ProjectTask;
  members: Member[];
  autoFocus: boolean;
  onPatch: (body: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) input.current?.select();
  }, [autoFocus]);

  useEffect(() => {
    if (!open) return;
    function away(event: MouseEvent) {
      if (!(event.target as HTMLElement).closest('[data-row-menu]')) setOpen(false);
    }
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  // Both halves are read back in local time: slicing the ISO string shows
  // yesterday for anyone east of UTC once the clock passes their offset.
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const date = due ? due.toLocaleDateString('en-CA') : '';
  const time = due && task.dueHasTime ? due.toTimeString().slice(0, 5) : '';

  /** Date and time live in one column, so each edit rebuilds the whole stamp. */
  function stamp(nextDate: string, nextTime: string) {
    if (!nextDate) {
      onPatch({ dueAt: null, dueHasTime: false });
      return;
    }
    const when = new Date(`${nextDate}T${nextTime || '00:00'}`);
    onPatch({ dueAt: when.toISOString(), dueHasTime: Boolean(nextTime) });
  }

  return (
    <tr className="[&>td]:border-line [&>td]:bg-surface [&>td]:border-y [&>td]:py-4">
      <td className="rounded-l-lg border-l pl-4">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
          onClick={() => onPatch({ done: !task.done })}
          className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border transition-colors ${
            task.done ? 'border-accent bg-accent text-white' : 'border-muted/60 hover:border-accent'
          }`}
        >
          {task.done && (
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="m5 13 4 4L19 7" />
            </svg>
          )}
        </button>
      </td>

      <td className="pr-4">
        <input
          ref={input}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => title.trim() && title !== task.title && onPatch({ title: title.trim() })}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          aria-label="Task title"
          className={`w-full rounded px-2 py-1.5 h-9 transition-colors outline-none hover:bg-black/[0.05] focus:bg-black/[0.05] ${
            task.done ? 'text-muted line-through' : ''
          }`}
        />
      </td>

      <td className="pr-4">
        {/* The native control keeps its picker; the empty state reads as a
            prompt rather than as an unfilled mm/dd/yyyy mask. */}
        <span className="relative block">
          <input
            type="date"
            value={date}
            onChange={(event) => stamp(event.target.value, time)}
            aria-label="Due date"
            className={`w-full rounded px-2 py-1.5 h-9 transition-colors outline-none hover:bg-black/[0.05] focus:bg-black/[0.05] ${
              date ? '' : 'text-transparent'
            }`}
          />
          {!date && (
            <span className="text-muted pointer-events-none absolute top-1.5 left-2">Set date</span>
          )}
        </span>
      </td>

      <td className="pr-4">
        <span className="group/time relative block">
          <input
            type="time"
            value={time}
            disabled={!date}
            onChange={(event) => stamp(date, event.target.value)}
            aria-label="Due time"
            className={`w-full rounded px-2 py-1.5 h-9 transition-colors outline-none hover:bg-black/[0.05] focus:bg-black/[0.05] disabled:cursor-not-allowed ${
              time ? '' : 'text-transparent'
            }`}
          />
          {!time && (
            <span className="text-muted pointer-events-none absolute top-1.5 left-2">Select</span>
          )}
          {!date && (
            <span className="bg-brand-ink pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-[210px] -translate-x-1/2 rounded-md px-3 py-2 text-xs text-white opacity-0 transition-opacity group-hover/time:opacity-100">
              Select a due date before selecting a due time
            </span>
          )}
        </span>
      </td>

      <td className="pr-4">
        <label className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-xs font-semibold">
            {(members.find((member) => member.id === task.assigneeId)?.name ?? '?')
              .slice(0, 1)
              .toUpperCase()}
          </span>
          <Select
            ariaLabel="Assigned to"
            placeholder="Nobody yet"
            value={task.assigneeId}
            options={members.map((member) => ({ value: member.id, label: member.name }))}
            onChange={(assigneeId) => onPatch({ assigneeId: assigneeId || null })}
          />
        </label>
      </td>

      <td className="relative rounded-r-lg border-r pr-2 text-right" data-row-menu>
        <button
          type="button"
          onClick={() => setOpen((shown) => !shown)}
          aria-label="Task actions"
          className="text-muted hover:text-foreground px-2 transition-colors"
        >
          ⋮
        </button>
        {open && (
          <div className="border-line bg-surface absolute top-full right-2 z-20 mt-1 w-[150px] rounded-md border py-1 text-left shadow-lg">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onPatch({ done: !task.done });
              }}
              className="block w-full px-3 py-1.5 text-left hover:bg-black/[0.05]"
            >
              {task.done ? 'Mark as open' : 'Mark as done'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onRemove();
              }}
              className="text-accent block w-full px-3 py-1.5 text-left hover:bg-black/[0.05]"
            >
              Delete task
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

/** Both arrows, with the live direction picked out. */
function SortMark({ dir }: { dir: 'asc' | 'desc' | null }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 5v14m0-14 3 3M8 5 5 8" className={dir === 'asc' ? 'text-accent' : 'opacity-40'} />
      <path
        d="M16 19V5m0 14 3-3m-3 3-3-3"
        className={dir === 'desc' ? 'text-accent' : 'opacity-40'}
      />
    </svg>
  );
}

function TaskArt() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 120"
      className="mx-auto h-24 w-24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="24" y="18" width="62" height="84" rx="8" className="text-line" />
      <path d="M38 40h12M38 60h12M38 80h12" className="text-muted/50" />
      <path d="M60 40h20M60 60h20M60 80h14" className="text-muted/50" />
      <path d="m84 74 14-16" className="text-accent" />
      <path d="m92 52 8-9 7 6-8 9z" className="text-accent" />
    </svg>
  );
}
