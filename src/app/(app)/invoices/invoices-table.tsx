'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/select';
import { StatusBadge, formatDate } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { api } from '@/lib/client-fetch';
import { placeUnder, type Placement } from '@/lib/place-under';
import { ConfirmDialog } from '@/components/confirm';
import { InvoiceMenuPanel, invoiceActions, menuHeight } from '@/components/invoice-menu';
import { daysLate, isOverdue } from '@/lib/invoices';
import type { InvoiceStatus } from '@/generated/prisma/enums';

export type InvoiceRow = {
  id: string;
  number: string;
  status: InvoiceStatus;
  client: string;
  project: string | null;
  updatedAt: string;
  dueAt: string | null;
  totalCents: number;
  balanceCents: number;
  hasPayments: boolean;
  /** An email carrying it has gone out, so 'sent' can no longer be undone. */
  emailed: boolean;
  /** Both needed before it can be emailed: it is sent from the project. */
  projectId: string | null;
  clientEmail: string | null;
  /** Where this one could be filed, if it is not on a project yet. */
  clientProjects: { id: string; name: string }[];
  /** When it went out, which is not the same as when it was last touched. */
  issuedAt: string | null;
  /** How many payments have been recorded against it. */
  payments: number;
  /** Only for the invoices that are paid in steps. */
  schedule: {
    done: number;
    total: number;
    nextAt: string | null;
    nextLabel: string | null;
  } | null;
};

const STATUSES = [
  { value: 'all', label: 'Any status' },
  // Not a stored status: read off the date, and the one people come here for.
  { value: 'overdue', label: 'Overdue' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PARTIALLY_PAID', label: 'Part paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'VOID', label: 'Void' },
];

const WHENS = [
  { value: 'all', label: 'Any time' },
  { value: 'month', label: 'This month' },
  { value: '30', label: 'Last 30 days' },
  { value: 'year', label: 'This year' },
];

/**
 * Every invoice, filtered the two ways anybody actually looks for one: what
 * state it is in, and how recently it was touched.
 *
 * A row opens where the work is. A draft is unfinished, so it opens on the
 * page you write it on; anything sent opens as the document, because that is
 * the thing the other side is holding.
 */
/** Sent, still owed, and the date has gone by. Read, never stored. */
function late(row: InvoiceRow): boolean {
  return isOverdue(
    { status: row.status, dueAt: row.dueAt ? new Date(row.dueAt) : null },
    row.balanceCents,
  );
}

function lateBy(row: InvoiceRow): number {
  return row.dueAt ? daysLate(new Date(row.dueAt)) : 0;
}

/**
 * How far through paying it the client is.
 *
 * An invoice paid in steps says which step is next and when it is wanted,
 * because that is the question being asked of the row. One paid in one go has
 * only ever got a count to give.
 */
function Progress({ row }: { row: InvoiceRow }) {
  if (row.schedule) {
    const { done, total, nextAt, nextLabel } = row.schedule;
    return (
      <span className="block">
        <span className="flex items-center gap-2">
          <span className="tabular-nums">
            {done}/{total}
          </span>
          <span className="bg-accent-soft h-1.5 w-16 overflow-hidden rounded-full">
            <span
              className="block h-full rounded-full bg-emerald-500"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </span>
        </span>
        {nextAt && (
          <span className="text-muted mt-1 block text-xs">
            Next: {formatDate(nextAt)}
            {nextLabel ? ` · ${nextLabel}` : ''}
          </span>
        )}
      </span>
    );
  }

  if (row.payments === 0) return <span className="text-muted">—</span>;
  return (
    <span className="text-muted">
      {row.payments} {row.payments === 1 ? 'payment' : 'payments'}
    </span>
  );
}

export function InvoicesTable({ rows, currency }: { rows: InvoiceRow[]; currency: string }) {
  const router = useRouter();
  const [status, setStatus] = useState('all');
  const [when, setWhen] = useState('all');
  const [gone, setGone] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [menuAt, setMenuAt] = useState<Placement | null>(null);
  const [doomed, setDoomed] = useState<InvoiceRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const shown = useMemo(() => {
    const now = new Date();
    const since =
      when === 'month'
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : when === '30'
          ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          : when === 'year'
            ? new Date(now.getFullYear(), 0, 1)
            : null;

    return rows
      .filter((row) => !gone.includes(row.id))
      .filter((row) =>
        status === 'all' ? true : status === 'overdue' ? late(row) : row.status === status,
      )
      .filter((row) => !since || new Date(row.updatedAt) >= since);
  }, [rows, status, when, gone]);

  // A menu drawn inside the table is clipped by it: a box that scrolls one way
  // scrolls both, so the panel gets cut off and the table grows a scrollbar to
  // reach the rest of it. Portalled to the body, it is over the page instead.
  //
  // Anchored to where the button was, so it closes rather than drifts when the
  // page moves under it.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    function away(event: MouseEvent) {
      if (!(event.target as HTMLElement).closest('[data-menu]')) setMenu(null);
    }
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [menu]);

  const openAt = (row: InvoiceRow) =>
    row.status === 'DRAFT' ? `/invoices/${row.id}/edit` : `/invoices/${row.id}`;

  async function moveTo(row: InvoiceRow, status: 'SENT' | 'DRAFT') {
    setMenu(null);
    const { error } = await api(`/api/invoices/${row.id}`, {
      method: 'PATCH',
      body: { status },
    });
    if (error) {
      alert(error.error);
      return;
    }
    router.refresh();
  }

  async function remove(row: InvoiceRow) {
    setDeleting(true);
    const { error } = await api(`/api/invoices/${row.id}`, { method: 'DELETE' });
    setDeleting(false);
    setDoomed(null);
    if (error) {
      alert(error.error);
      return;
    }
    setGone((current) => [...current, row.id]);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          ariaLabel="Status"
          className="w-[150px]"
          value={status}
          options={STATUSES}
          onChange={setStatus}
        />
        <Select
          ariaLabel="When"
          className="w-[150px]"
          value={when}
          options={WHENS}
          onChange={setWhen}
        />
        <p className="text-muted ml-1 text-sm">
          {shown.length} {shown.length === 1 ? 'invoice' : 'invoices'}
        </p>
      </div>

      <div className="card mt-4 overflow-x-auto">
        {/* Nothing wraps: a row is read across, and a status folded onto two
            lines is harder to scan than a table you push sideways. The card
            scrolls when the columns will not fit. */}
        <table className="w-full min-w-[76rem] text-sm whitespace-nowrap">
          <thead className="text-muted border-line border-b text-left">
            <tr className="text-xs tracking-widest uppercase">
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-5 py-3 font-medium">Last edited</th>
              <th className="px-5 py-3 font-medium">Sent</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Project</th>
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 font-medium">Payments</th>
              <th className="px-5 py-3 text-right font-medium">Amount</th>
              <th className="px-5 py-3 text-right font-medium">Balance</th>
              <th className="w-12 px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {shown.map((row) => (
              <tr key={row.id} className="hover:bg-accent-soft/25 transition-colors">
                <td className="px-5 py-3">
                  <Link href={openAt(row)} className="font-medium hover:underline">
                    {row.number}
                  </Link>
                </td>
                <td className="text-muted px-5 py-3">{formatDate(row.updatedAt)}</td>
                <td className="text-muted px-5 py-3">
                  {row.issuedAt ? formatDate(row.issuedAt) : '—'}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={row.status} overdue={late(row)} />
                  {late(row) && (
                    <span className="mt-1 block text-xs text-red-700">
                      {lateBy(row)} {lateBy(row) === 1 ? 'day' : 'days'} late
                    </span>
                  )}
                </td>
                <td className="text-muted px-5 py-3">
                  {row.project ?? <FileOnProject row={row} onFiled={() => router.refresh()} />}
                </td>
                <td className="px-5 py-3">{row.client}</td>
                <td className="px-5 py-3">
                  <Progress row={row} />
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {formatMoney(row.totalCents, currency)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {row.balanceCents > 0 ? (
                    <span className={late(row) ? 'font-medium text-red-700' : ''}>
                      {formatMoney(row.balanceCents, currency)}
                    </span>
                  ) : (
                    <span className="text-muted">{formatMoney(0, currency)}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {(() => {
                    const actions = invoiceActions(row, {
                      onSend: () => moveTo(row, 'SENT'),
                      onUnsend: () => moveTo(row, 'DRAFT'),
                      onDelete: () => setDoomed(row),
                    });
                    return (
                      <>
                        <button
                          type="button"
                          data-menu
                          aria-label={`More for ${row.number}`}
                          aria-expanded={menu === row.id}
                          onClick={(event) => {
                            setMenuAt(
                              placeUnder(
                                event.currentTarget.getBoundingClientRect(),
                                menuHeight(actions),
                              ),
                            );
                            setMenu(menu === row.id ? null : row.id);
                          }}
                          className="text-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-black/[0.05]"
                        >
                          <svg
                            aria-hidden
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <path d="M12 6h.01M12 12h.01M12 18h.01" />
                          </svg>
                        </button>

                        {menu === row.id &&
                          menuAt &&
                          typeof document !== 'undefined' &&
                          createPortal(
                            <InvoiceMenuPanel
                              actions={actions}
                              style={menuAt.style}
                              onPick={() => setMenu(null)}
                            />,
                            document.body,
                          )}
                      </>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {doomed && (
          <ConfirmDialog
            title={`Delete ${doomed.number}`}
            body={`${doomed.number} for ${doomed.client} will be gone for good. Only a draft can be deleted, so nothing has been sent to anyone.`}
            word="delete"
            busy={deleting}
            onConfirm={() => void remove(doomed)}
            onClose={() => setDoomed(null)}
          />
        )}

        {shown.length === 0 && (
          <p className="text-muted px-5 py-8 text-center text-sm">
            Nothing matches those two filters.
          </p>
        )}
      </div>
    </>
  );
}

/**
 * An invoice standing on its own, offered the projects it could belong to.
 *
 * Which project an invoice is filed under is not part of the document, so it
 * can be answered later - and later is usually when you know. A client with no
 * projects is told so rather than shown an empty list.
 */
function FileOnProject({ row, onFiled }: { row: InvoiceRow; onFiled: () => void }) {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  if (row.clientProjects.length === 0) {
    return <span className="text-muted/70">No projects</span>;
  }

  async function file(projectId: string) {
    setSaving(true);
    setFailed(false);
    const { error } = await api(`/api/invoices/${row.id}/project`, {
      method: 'PATCH',
      body: { projectId },
    });
    setSaving(false);
    if (error) {
      setFailed(true);
      return;
    }
    onFiled();
  }

  return (
    <span className="block max-w-[190px]">
      <Select
        ariaLabel={`Put ${row.number} on a project`}
        value={null}
        disabled={saving}
        placeholder={saving ? 'Filing…' : 'Add to project'}
        options={row.clientProjects.map((project) => ({ value: project.id, label: project.name }))}
        onChange={file}
      />
      {failed && <span className="field-error">Could not file it</span>}
    </span>
  );
}
