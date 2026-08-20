'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { Select } from '@/components/select';
import { StatusBadge, formatDate } from '@/components/ui';
import { formatMoney, parseMoneyToCents } from '@/lib/money';
import { api } from '@/lib/client-fetch';
import { placeUnder, type Placement } from '@/lib/place-under';
import type { InvoiceStatus } from '@/generated/prisma/enums';

export type ProjectInvoice = {
  id: string;
  number: string;
  status: InvoiceStatus;
  issuedAt: string | null;
  dueAt: string | null;
  totalCents: number;
  balanceCents: number;
  hasPayments: boolean;
};

/** Five rows and the padding around them: which way the panel opens. */
const MENU_HEIGHT = 5 * 36 + 12;

/**
 * The invoices raised against this project, newest first.
 *
 * Each row says where the invoice has got to rather than only what it is
 * worth: a draft nobody has sent and an invoice a client is sitting on look
 * nothing alike from your side of the desk. What you can do to it follows from
 * that — a draft is edited and sent, a sent one takes a payment — so the menu
 * only offers the moves that exist for the state it is in.
 */
export function ProjectInvoices({
  invoices,
  currency,
}: {
  invoices: ProjectInvoice[];
  currency: string;
}) {
  const router = useRouter();
  const [gone, setGone] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [menuAt, setMenuAt] = useState<Placement | null>(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState<ProjectInvoice | null>(null);

  const shown = invoices.filter((invoice) => !gone.includes(invoice.id));

  // Anchored to where the button was, so it closes rather than drifts when the
  // page moves under it.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    function away(event: MouseEvent) {
      if (!(event.target as HTMLElement).closest('[data-menu]')) setMenu(null);
    }
    document.addEventListener('mousedown', away);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('mousedown', away);
    };
  }, [menu]);

  async function send(invoice: ProjectInvoice) {
    setMenu(null);
    setBusy(true);
    const { error } = await api(`/api/invoices/${invoice.id}`, {
      method: 'PATCH',
      body: { status: 'SENT' },
    });
    setBusy(false);
    if (error) {
      alert(error.error);
      return;
    }
    router.refresh();
  }

  async function remove(invoice: ProjectInvoice) {
    setMenu(null);
    setBusy(true);
    const { error } = await api(`/api/invoices/${invoice.id}`, { method: 'DELETE' });
    setBusy(false);
    if (error) {
      alert(error.error);
      return;
    }
    setGone((current) => [...current, invoice.id]);
    router.refresh();
  }

  return (
    <>
      <section className="card p-0">
        <div className="border-line flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">Invoices</h2>
          <p className="text-muted text-sm">
            {shown.length} {shown.length === 1 ? 'invoice' : 'invoices'}
          </p>
        </div>

        <ul className="divide-line divide-y">
          {shown.map((invoice) => (
            <li
              key={invoice.id}
              className="hover:bg-accent-soft/25 flex items-center justify-between gap-4 px-5 py-4 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <Link
                    href={openAt(invoice)}
                    className="font-medium hover:underline"
                    onClick={(event) => busy && event.preventDefault()}
                  >
                    {invoice.number}
                  </Link>
                  <StatusBadge status={invoice.status} />
                </div>
                <p className="text-muted mt-0.5 text-sm">{where(invoice, currency)}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-medium tabular-nums">
                  {formatMoney(invoice.totalCents, currency)}
                </span>

                <button
                  type="button"
                  data-menu
                  aria-label={`More for ${invoice.number}`}
                  aria-expanded={menu === invoice.id}
                  onClick={(event) => {
                    setMenuAt(placeUnder(event.currentTarget.getBoundingClientRect(), MENU_HEIGHT));
                    setMenu(menu === invoice.id ? null : invoice.id);
                  }}
                  className="text-muted hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors hover:bg-black/[0.05]"
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

                {menu === invoice.id &&
                  menuAt &&
                  typeof document !== 'undefined' &&
                  createPortal(
                    <div
                      data-menu
                      style={menuAt.style}
                      className="bg-surface fixed z-50 w-48 overflow-y-auto rounded-xl py-1.5 text-left text-sm shadow-2xl ring-1 ring-black/10"
                    >
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="hover:bg-accent-soft/60 block px-4 py-2"
                      >
                        Open
                      </Link>

                      {invoice.status === 'DRAFT' && (
                        <>
                          <Link
                            href={`/invoices/${invoice.id}/edit`}
                            className="hover:bg-accent-soft/60 block px-4 py-2"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`?tab=Email&compose=invoice:${invoice.id}`}
                            className="hover:bg-accent-soft/60 block px-4 py-2"
                          >
                            Email to client
                          </Link>
                          <button
                            type="button"
                            onClick={() => send(invoice)}
                            className="hover:bg-accent-soft/60 block w-full px-4 py-2 text-left"
                          >
                            Mark as sent
                          </button>
                        </>
                      )}

                      {invoice.status !== 'DRAFT' && invoice.balanceCents > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenu(null);
                            setPaying(invoice);
                          }}
                          className="hover:bg-accent-soft/60 block w-full px-4 py-2 text-left"
                        >
                          Record a payment
                        </button>
                      )}

                      {!invoice.hasPayments && (
                        <button
                          type="button"
                          onClick={() => remove(invoice)}
                          className="hover:bg-accent-soft/60 block w-full px-4 py-2 text-left text-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>,
                    document.body,
                  )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {paying && (
        <PaymentDialog
          invoice={paying}
          currency={currency}
          onClose={() => setPaying(null)}
          onDone={() => {
            setPaying(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

const METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

/**
 * Money in, recorded from the project rather than from the invoice.
 *
 * The amount starts at the whole balance, because most of the time that is
 * what turned up: saying an invoice is paid should be one click, and a part
 * payment is the thing you have to type.
 */
function PaymentDialog({
  invoice,
  currency,
  onClose,
  onDone,
}: {
  invoice: ProjectInvoice;
  currency: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState((invoice.balanceCents / 100).toFixed(2));
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [paidAt, setPaidAt] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const cents = parseMoneyToCents(amount);
    if (cents === null || cents <= 0) {
      setError('Enter an amount');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: failure } = await api(`/api/invoices/${invoice.id}/payments`, {
      method: 'POST',
      body: { amountCents: cents, method, reference, paidAt },
    });
    setSaving(false);
    if (failure) {
      setError(failure.error);
      return;
    }
    onDone();
  }

  return (
    <Dialog
      fit
      title={`Payment for ${invoice.number}`}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Recording…' : 'Record payment'}
          </button>
        </div>
      }
    >
      <p className="text-muted text-sm">
        Outstanding{' '}
        <span className="text-foreground font-medium tabular-nums">
          {formatMoney(invoice.balanceCents, currency)}
        </span>
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pay-amount">
            Amount
          </label>
          <input
            id="pay-amount"
            className="input"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="pay-method">
            Method
          </label>
          <Select id="pay-method" value={method} options={METHODS} onChange={setMethod} />
        </div>

        <div>
          <label className="label" htmlFor="pay-date">
            Date received
          </label>
          <input
            id="pay-date"
            type="date"
            className="input"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
          />
          <p className="text-muted mt-1.5 text-xs">Left empty, it is today.</p>
        </div>

        <div>
          <label className="label" htmlFor="pay-reference">
            Reference
          </label>
          <input
            id="pay-reference"
            className="input"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </div>
      </div>

      {error && <p className="field-error mt-4">{error}</p>}
    </Dialog>
  );
}

/** Where an invoice has got to, said the way you would say it out loud. */
function where(invoice: ProjectInvoice, currency: string): string {
  if (invoice.status === 'DRAFT') {
    return 'Not sent yet';
  }
  if (invoice.status === 'VOID') {
    return 'Cancelled';
  }
  if (invoice.balanceCents <= 0) {
    return `Paid in full${invoice.issuedAt ? `, sent ${formatDate(invoice.issuedAt)}` : ''}`;
  }
  const owing = `${formatMoney(invoice.balanceCents, currency)} outstanding`;
  return invoice.dueAt ? `${owing}, due ${formatDate(invoice.dueAt)}` : owing;
}

/** A draft opens where it is written; anything sent opens as the document. */
function openAt(invoice: ProjectInvoice): string {
  return invoice.status === 'DRAFT' ? `/invoices/${invoice.id}/edit` : `/invoices/${invoice.id}`;
}
