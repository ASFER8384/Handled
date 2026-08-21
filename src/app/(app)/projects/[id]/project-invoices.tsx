'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { ConfirmDialog } from '@/components/confirm';
import { Select } from '@/components/select';
import { StatusBadge, formatDate } from '@/components/ui';
import { daysLate, isOverdue } from '@/lib/invoices';
import { formatMoney, parseMoneyToCents } from '@/lib/money';
import { api } from '@/lib/client-fetch';
import { placeUnder, type Placement } from '@/lib/place-under';
import { InvoiceMenuPanel, invoiceActions, menuHeight } from '@/components/invoice-menu';
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
  /** An email carrying it has gone out, so 'sent' can no longer be undone. */
  emailed: boolean;
  /** The steps it is paid in, already read against the money in. Empty is the
      ordinary invoice, paid once. */
  schedule: {
    label: string;
    amountCents: number;
    paidCents: number;
    dueAt: string | null;
    state: string;
  }[];
};

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
  projectId,
  clientEmail,
}: {
  invoices: ProjectInvoice[];
  currency: string;
  projectId: string;
  /** Who the project bills. Without one, nothing can be emailed to them. */
  clientEmail: string | null;
}) {
  const router = useRouter();
  const [gone, setGone] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [menuAt, setMenuAt] = useState<Placement | null>(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState<ProjectInvoice | null>(null);
  const [doomed, setDoomed] = useState<ProjectInvoice | null>(null);

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

  async function moveTo(invoice: ProjectInvoice, status: 'SENT' | 'DRAFT') {
    setMenu(null);
    setBusy(true);
    const { error } = await api(`/api/invoices/${invoice.id}`, {
      method: 'PATCH',
      body: { status },
    });
    setBusy(false);
    if (error) {
      alert(error.error);
      return;
    }
    router.refresh();
  }

  async function remove(invoice: ProjectInvoice) {
    setBusy(true);
    const { error } = await api(`/api/invoices/${invoice.id}`, { method: 'DELETE' });
    setBusy(false);
    if (error) {
      alert(error.error);
      return;
    }
    setDoomed(null);
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
                  <StatusBadge status={invoice.status} overdue={overdue(invoice)} />
                </div>
                <p className="text-muted mt-0.5 text-sm">{where(invoice, currency)}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-medium tabular-nums">
                  {formatMoney(invoice.totalCents, currency)}
                </span>

                {(() => {
                  // The same rules as the Invoices page, from the same place.
                  const actions = invoiceActions(
                    { ...invoice, projectId, clientEmail },
                    {
                      onSend: () => moveTo(invoice, 'SENT'),
                      onUnsend: () => moveTo(invoice, 'DRAFT'),
                      onRecordPayment: () => setPaying(invoice),
                      onDelete: () => setDoomed(invoice),
                    },
                  );
                  return (
                    <>
                      <button
                        type="button"
                        data-menu
                        aria-label={`More for ${invoice.number}`}
                        aria-expanded={menu === invoice.id}
                        onClick={(event) => {
                          setMenuAt(
                            placeUnder(
                              event.currentTarget.getBoundingClientRect(),
                              menuHeight(actions),
                            ),
                          );
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
              </div>
            </li>
          ))}
        </ul>
      </section>

      {doomed && (
        <ConfirmDialog
          title={`Delete ${doomed.number}`}
          body={`${doomed.number} will be gone for good. Only a draft can be deleted, so nothing has been sent to anyone.`}
          word="delete"
          busy={busy}
          onConfirm={() => void remove(doomed)}
          onClose={() => setDoomed(null)}
        />
      )}

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
  // With a schedule, what turned up is almost always the step that is next,
  // so that is what the form opens on. Without one, it is the whole balance:
  // saying an invoice is paid should be one click.
  const owed = invoice.schedule.filter((step) => step.paidCents < step.amountCents);
  const next = owed[0] ?? null;
  const [step, setStep] = useState<string | null>(next?.label ?? null);
  const [amount, setAmount] = useState(
    ((next ? next.amountCents - next.paidCents : invoice.balanceCents) / 100).toFixed(2),
  );
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [paidAt, setPaidAt] = useState('');
  const [reference, setReference] = useState(next?.label ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Written first, then read back. A payment cannot be taken off an invoice
  // once it is on, and the amount decides whether the invoice reads as paid,
  // so it is worth one look at what is about to be written down.
  const [checking, setChecking] = useState(false);
  const [typed, setTyped] = useState('');

  const cents = parseMoneyToCents(amount);
  const settles = cents !== null && cents >= invoice.balanceCents;

  function pick(label: string | null) {
    setStep(label);
    const chosen = owed.find((entry) => entry.label === label);
    setAmount(
      ((chosen ? chosen.amountCents - chosen.paidCents : invoice.balanceCents) / 100).toFixed(2),
    );
    setReference(chosen ? chosen.label : '');
  }

  function check() {
    if (cents === null || cents <= 0) {
      setError('Enter an amount');
      return;
    }
    if (cents > invoice.balanceCents) {
      setError('That is more than the outstanding balance');
      return;
    }
    setError(null);
    setChecking(true);
  }

  async function save() {
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
      title={checking ? `Record this against ${invoice.number}` : `Payment for ${invoice.number}`}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (checking ? setChecking(false) : onClose())}
            className="btn-ghost"
          >
            {checking ? 'Back' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={checking ? save : check}
            disabled={saving || (checking && typed.trim().toLowerCase() !== 'record')}
            className="btn-primary disabled:opacity-40"
          >
            {saving ? 'Recording…' : checking ? 'Record payment' : 'Continue'}
          </button>
        </div>
      }
    >
      {checking ? (
        <>
          <dl className="divide-line divide-y text-sm">
            <Line label="Amount" value={formatMoney(cents ?? 0, currency)} strong />
            <Line
              label="Method"
              value={METHODS.find((entry) => entry.value === method)?.label ?? method}
            />
            <Line label="Date received" value={paidAt || 'Today'} />
            {step && <Line label="Covers" value={step} />}
            {reference.trim() && !step && <Line label="Reference" value={reference.trim()} />}
            <Line
              label="Leaves outstanding"
              value={formatMoney(Math.max(0, invoice.balanceCents - (cents ?? 0)), currency)}
            />
          </dl>

          <p className="text-muted mt-4 text-sm">
            {settles
              ? `${invoice.number} will be marked paid in full.`
              : `${invoice.number} will be marked part paid.`}{' '}
            Recorded by mistake, it can be taken off again from the invoice.
          </p>

          <div className="mt-5">
            <label className="label" htmlFor="pay-confirm">
              Type <span className="text-foreground font-semibold">record</span> to confirm
            </label>
            <input
              id="pay-confirm"
              autoFocus
              autoComplete="off"
              className="input-soft"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && typed.trim().toLowerCase() === 'record') void save();
              }}
            />
          </div>

          {error && <p className="field-error mt-4">{error}</p>}
        </>
      ) : (
        <>
          <p className="text-muted text-sm">
            Outstanding{' '}
            <span className="text-foreground font-medium tabular-nums">
              {formatMoney(invoice.balanceCents, currency)}
            </span>
          </p>

          {owed.length > 1 && (
            <fieldset className="mt-5">
              <legend className="label">Which step is this?</legend>
              {/* Only worth asking when there is a choice: one step left, or
                  none at all, and the amount is already the answer. The money
                  still lands on the invoice as a whole — the steps fill from
                  the top — so this only fills the amount in. */}
              <div className="space-y-1.5">
                {owed.map((entry) => {
                  const left = entry.amountCents - entry.paidCents;
                  const chosen = step === entry.label;
                  return (
                    <button
                      key={entry.label}
                      type="button"
                      onClick={() => pick(entry.label)}
                      aria-pressed={chosen}
                      className={`border-line flex w-full items-center justify-between gap-4 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        chosen ? 'border-accent bg-accent-soft/40' : 'hover:border-accent'
                      }`}
                    >
                      <span>
                        <span className="font-medium">{entry.label}</span>
                        <span className="text-muted block text-xs">
                          {entry.dueAt ? `Due ${formatDate(entry.dueAt)}` : 'No date'}
                          {entry.paidCents > 0
                            ? ` · ${formatMoney(entry.paidCents, currency)} of ${formatMoney(entry.amountCents, currency)} in`
                            : ''}
                          {entry.state === 'OVERDUE' ? ' · overdue' : ''}
                        </span>
                      </span>
                      <span className="tabular-nums">{formatMoney(left, currency)}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => pick(null)}
                  aria-pressed={step === null}
                  className={`border-line block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    step === null ? 'border-accent bg-accent-soft/40' : 'hover:border-accent'
                  }`}
                >
                  Some other amount
                </button>
              </div>
            </fieldset>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pay-amount">
                Amount
              </label>
              <input
                id="pay-amount"
                className="input-soft"
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
                className="input-soft"
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
                className="input-soft"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </div>
          </div>

          {error && <p className="field-error mt-4">{error}</p>}
        </>
      )}
    </Dialog>
  );
}

/** One line of the read-back, before a payment goes on the record. */
function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className={`tabular-nums ${strong ? 'text-base font-semibold' : ''}`}>{value}</dd>
    </div>
  );
}

/** Where an invoice has got to, said the way you would say it out loud. */
/** Sent, still owed, and the date has gone by. */
function overdue(invoice: ProjectInvoice): boolean {
  return isOverdue(
    { status: invoice.status, dueAt: invoice.dueAt ? new Date(invoice.dueAt) : null },
    invoice.balanceCents,
  );
}

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
  if (overdue(invoice) && invoice.dueAt) {
    const days = daysLate(new Date(invoice.dueAt));
    return `${owing}, ${days} ${days === 1 ? 'day' : 'days'} late`;
  }
  return invoice.dueAt ? `${owing}, due ${formatDate(invoice.dueAt)}` : owing;
}

/** A draft opens where it is written; anything sent opens as the document. */
function openAt(invoice: ProjectInvoice): string {
  return invoice.status === 'DRAFT' ? `/invoices/${invoice.id}/edit` : `/invoices/${invoice.id}`;
}
