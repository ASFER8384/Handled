'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { Select } from '@/components/select';
import { STAGE_GROUPS } from '@/lib/stages';
import { PROJECT_PROPERTIES } from '@/lib/board-prefs';
import type { StageGroup } from '@/generated/prisma/enums';

export type TableRow = {
  id: string;
  name: string;
  stageId: string | null;
  serviceDate: string;
  endDate: string;
  type: string;
  contact: string;
  leadSource: string;
  location: string;
  description: string;
};

export type TableColumn = { id: string; name: string; group: StageGroup };

/**
 * The funnel across the top counts every stage and filters the table below it.
 * Selection drives the two bulk actions the API already supports: move, delete.
 */
export function TableView({
  columns,
  rows,
  stageId,
  showGroups,
  hiddenProps,
}: {
  columns: TableColumn[];
  rows: TableRow[];
  stageId: string | null;
  showGroups: boolean;
  hiddenProps: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Name is the row's handle, so only the rest can be switched off.
  const fields = PROJECT_PROPERTIES.filter((column) => !hiddenProps.includes(column.key));

  const shown = stageId ? rows.filter((row) => row.stageId === stageId) : rows;
  const allShown = shown.length > 0 && shown.every((row) => selected.includes(row.id));

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function filterHref(next: string | null) {
    const params = new URLSearchParams({ view: 'list' });
    if (next) params.set('stage', next);
    return `/projects?${params.toString()}`;
  }

  async function moveSelected(target: string) {
    if (!target) return;
    setBusy(true);
    await Promise.all(
      selected.map((id) =>
        api(`/api/projects/${id}`, { method: 'PATCH', body: { stageId: target } }),
      ),
    );
    setBusy(false);
    setSelected([]);
    router.refresh();
  }

  async function deleteSelected() {
    setBusy(true);
    await Promise.all(selected.map((id) => api(`/api/projects/${id}`, { method: 'DELETE' })));
    setBusy(false);
    setSelected([]);
    router.refresh();
  }

  const groupSpans = STAGE_GROUPS.map((group) => ({
    ...group,
    columns: columns.filter((column) => column.group === group.group),
  })).filter((group) => group.columns.length > 0);

  return (
    <>
      {/* --- the funnel ------------------------------------------------- */}
      <div className="-mx-8 mt-6 overflow-x-auto px-8 pb-2">
        <div className="flex min-w-max items-end">
          <FunnelTile
            href={filterHref(null)}
            count={rows.length}
            label="All"
            active={stageId === null}
            first
          />

          {groupSpans.map((group) => (
            <div key={group.group} className="flex flex-col gap-1.5">
              {showGroups && (
                <span
                  className={`sticky left-0 z-10 w-fit rounded-md px-2 py-0.5 text-xs font-medium ${group.chip}`}
                >
                  {group.label}
                </span>
              )}
              <div className="flex">
                {group.columns.map((column) => (
                  <FunnelTile
                    key={column.id}
                    href={filterHref(column.id)}
                    count={rows.filter((row) => row.stageId === column.id).length}
                    label={column.name}
                    active={stageId === column.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- the table --------------------------------------------------- */}
      <div className="card mt-4 overflow-hidden">
        <div className="border-line flex flex-wrap items-center gap-4 border-b px-5 py-4">
          <p className="text-sm font-medium">
            {shown.length} item{shown.length === 1 ? '' : 's'}
          </p>

          {selected.length > 0 && (
            <div className="ml-auto flex items-center gap-3">
              <span className="text-muted text-sm">{selected.length} selected</span>
              <Select
                ariaLabel="Move selected to stage"
                className="w-44"
                placeholder="Move to…"
                value={null}
                disabled={busy}
                options={columns.map((column) => ({ value: column.id, label: column.name }))}
                onChange={(stageId) => void moveSelected(stageId)}
              />
              <button
                type="button"
                onClick={() => void deleteSelected()}
                disabled={busy}
                className="text-accent text-sm font-medium hover:underline"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-line border-b">
                <th className="w-12 px-5 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    className="accent-foreground h-4 w-4"
                    checked={allShown}
                    onChange={() => setSelected(allShown ? [] : shown.map((row) => row.id))}
                  />
                </th>
                <th className="py-3 pr-4 font-medium">Name</th>
                {fields.map((field) => (
                  <th key={field.key} className="py-3 pr-4 font-medium">
                    {field.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {shown.map((row) => (
                <tr key={row.id} className="hover:bg-accent-soft/25">
                  <td className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.name}`}
                      className="accent-foreground h-4 w-4"
                      checked={selected.includes(row.id)}
                      onChange={() => toggle(row.id)}
                    />
                  </td>
                  <td className="py-3.5 pr-4 font-medium">{row.name}</td>
                  {fields.map((field) => (
                    <td
                      key={field.key}
                      className={`py-3.5 pr-4 ${
                        field.key === 'serviceDate' || field.key === 'endDate'
                          ? 'whitespace-nowrap'
                          : ''
                      } ${field.key === 'description' ? 'text-muted max-w-xs truncate' : ''}`}
                    >
                      {row[field.key]}
                    </td>
                  ))}
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={fields.length + 2} className="text-muted px-5 py-6">
                    Nothing in this stage.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/** Chevron tiles that interlock into a funnel, dark when they are the filter. */
function FunnelTile({
  href,
  count,
  label,
  active,
  first,
}: {
  href: string;
  count: number;
  label: string;
  active: boolean;
  first?: boolean;
}) {
  return (
    <a
      href={href}
      aria-current={active ? 'true' : undefined}
      style={{
        clipPath: first
          ? 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)'
          : 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)',
      }}
      className={`flex h-[86px] w-[168px] shrink-0 flex-col justify-center gap-1 py-2.5 transition-colors ${
        first ? 'pr-6 pl-5' : '-ml-3 pr-6 pl-8'
      } ${active ? 'bg-brand-ink text-white' : 'bg-surface hover:bg-accent-soft/50'}`}
    >
      <span className="text-2xl leading-none font-light tabular-nums">{count}</span>
      <span className="truncate text-sm font-medium">{label}</span>
    </a>
  );
}
