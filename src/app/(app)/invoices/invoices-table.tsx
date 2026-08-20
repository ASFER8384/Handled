'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/select';
import { StatusBadge, formatDate } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { api } from '@/lib/client-fetch';
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
};

const STATUSES = [
  { value: 'all', label: 'Any status' },
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
export function InvoicesTable({ rows, currency }: { rows: InvoiceRow[]; currency: string }) {
  const router = useRouter();
  const [status, setStatus] = useState('all');
  const [when, setWhen] = useState('all');
  const [gone, setGone] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);

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
      .filter((row) => status === 'all' || row.status === status)
      .filter((row) => !since || new Date(row.updatedAt) >= since);
  }, [rows, status, when, gone]);

  const openAt = (row: InvoiceRow) =>
    row.status === 'DRAFT' ? `/invoices/${row.id}/edit` : `/invoices/${row.id}`;

  async function remove(row: InvoiceRow) {
    setMenu(null);
    const { error } = await api(`/api/invoices/${row.id}`, { method: 'DELETE' });
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
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="text-muted border-line border-b text-left">
            <tr className="text-xs tracking-widest uppercase">
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-5 py-3 font-medium">Last edited</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Project</th>
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 text-right font-medium">Total</th>
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
                <td className="px-5 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="text-muted px-5 py-3">{row.project ?? '—'}</td>
                <td className="px-5 py-3">{row.client}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {formatMoney(row.totalCents, currency)}
                </td>
                <td className="relative px-5 py-3 text-right">
                  <button
                    type="button"
                    aria-label={`More for ${row.number}`}
                    onClick={() => setMenu(menu === row.id ? null : row.id)}
                    className="text-muted hover:text-foreground px-1"
                  >
                    ⋮
                  </button>

                  {menu === row.id && (
                    <div
                      className="bg-surface absolute top-10 right-4 z-30 w-44 rounded-xl py-1.5 text-left shadow-2xl ring-1 ring-black/10"
                      onMouseLeave={() => setMenu(null)}
                    >
                      <Link
                        href={`/invoices/${row.id}`}
                        className="hover:bg-accent-soft/60 block px-4 py-2"
                      >
                        Open
                      </Link>
                      {row.status === 'DRAFT' && (
                        <Link
                          href={`/invoices/${row.id}/edit`}
                          className="hover:bg-accent-soft/60 block px-4 py-2"
                        >
                          Edit
                        </Link>
                      )}
                      {!row.hasPayments && (
                        <button
                          type="button"
                          onClick={() => remove(row)}
                          className="hover:bg-accent-soft/60 block w-full px-4 py-2 text-left text-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {shown.length === 0 && (
          <p className="text-muted px-5 py-8 text-center text-sm">
            Nothing matches those two filters.
          </p>
        )}
      </div>
    </>
  );
}
