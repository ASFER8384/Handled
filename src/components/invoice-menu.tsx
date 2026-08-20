'use client';

import Link from 'next/link';
import type { InvoiceStatus } from '@/generated/prisma/enums';

/**
 * What can be done to an invoice, decided once.
 *
 * The same list is shown wherever an invoice appears — on the Invoices page
 * and on a project's Financials tab — and the rules are the reason this lives
 * in one file rather than being written out twice. What an invoice allows
 * follows from where it has got to:
 *
 *   - a draft is unfinished, so it is edited, sent and thrown away
 *   - once it is sent, the client is holding it: no more editing, no deleting
 *   - once money has landed against it, it stays on the record for good
 *
 * Emailing needs somewhere to send it from and someone to send it to, so it
 * is offered greyed out with the reason rather than quietly missing.
 */
export type InvoiceFacts = {
  id: string;
  status: InvoiceStatus;
  hasPayments: boolean;
  balanceCents: number;
  /** The email is written on the project, so an invoice without one cannot. */
  projectId: string | null;
  clientEmail: string | null;
};

export type InvoiceAction =
  | { kind: 'go'; label: string; href: string }
  /** Leaves the app: a download, so a plain anchor rather than a route. */
  | { kind: 'file'; label: string; href: string }
  | { kind: 'do'; label: string; run: () => void; danger?: boolean }
  | { kind: 'off'; label: string; why: string };

export function invoiceActions(
  invoice: InvoiceFacts,
  handlers: {
    /** Drafts only. Left out where marking sent makes no sense. */
    onSend?: () => void;
    /** Offered when there is a balance left to record against. */
    onRecordPayment?: () => void;
    onDelete?: () => void;
  },
): InvoiceAction[] {
  const draft = invoice.status === 'DRAFT';
  const actions: InvoiceAction[] = [
    { kind: 'go', label: 'Open', href: `/invoices/${invoice.id}` },
    { kind: 'file', label: 'Download PDF', href: `/api/invoices/${invoice.id}/pdf?download` },
  ];

  if (draft) {
    actions.push({ kind: 'go', label: 'Edit', href: `/invoices/${invoice.id}/edit` });
  }

  // Sent or paid, emailing it again is how a copy or a receipt is sent.
  if (!invoice.projectId) {
    actions.push({
      kind: 'off',
      label: 'Email to client',
      why: 'Put it on a project first',
    });
  } else if (!invoice.clientEmail) {
    actions.push({
      kind: 'off',
      label: 'Email to client',
      why: 'This client has no email address',
    });
  } else {
    actions.push({
      kind: 'go',
      label: 'Email to client',
      href: `/projects/${invoice.projectId}?tab=Email&compose=invoice:${invoice.id}`,
    });
  }

  if (draft && handlers.onSend) {
    actions.push({ kind: 'do', label: 'Mark as sent', run: handlers.onSend });
  }

  if (!draft && invoice.balanceCents > 0 && handlers.onRecordPayment) {
    actions.push({ kind: 'do', label: 'Record a payment', run: handlers.onRecordPayment });
  }

  if (draft && !invoice.hasPayments && handlers.onDelete) {
    actions.push({ kind: 'do', label: 'Delete', run: handlers.onDelete, danger: true });
  }

  return actions;
}

/** A row in the panel is 36px tall; the panel adds 12px of padding. */
export const MENU_ROW = 36;

export function menuHeight(actions: InvoiceAction[]): number {
  // A greyed-out row carries its reason on a second line, so it is taller.
  return actions.reduce((sum, action) => sum + (action.kind === 'off' ? 54 : MENU_ROW), 12);
}

/** The panel itself. Placement belongs to whoever opened it. */
export function InvoiceMenuPanel({
  actions,
  onPick,
  style,
}: {
  actions: InvoiceAction[];
  /** Closes the menu; the action has already run or is about to navigate. */
  onPick: () => void;
  style: React.CSSProperties;
}) {
  return (
    <div
      data-menu
      style={style}
      className="bg-surface fixed z-50 w-52 overflow-y-auto rounded-xl py-1.5 text-left text-sm shadow-2xl ring-1 ring-black/10"
    >
      {actions.map((action) => {
        if (action.kind === 'go') {
          return (
            <Link
              key={action.label}
              href={action.href}
              onClick={onPick}
              className="hover:bg-accent-soft/60 block px-4 py-2"
            >
              {action.label}
            </Link>
          );
        }
        if (action.kind === 'file') {
          return (
            <a
              key={action.label}
              href={action.href}
              onClick={onPick}
              className="hover:bg-accent-soft/60 block px-4 py-2"
            >
              {action.label}
            </a>
          );
        }
        if (action.kind === 'do') {
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                onPick();
                action.run();
              }}
              className={`hover:bg-accent-soft/60 block w-full px-4 py-2 text-left ${
                action.danger ? 'text-red-700' : ''
              }`}
            >
              {action.label}
            </button>
          );
        }
        return (
          <span
            key={action.label}
            className="text-muted/70 block cursor-not-allowed px-4 py-2"
            aria-disabled
          >
            {action.label}
            <span className="text-muted/60 block text-xs">{action.why}</span>
          </span>
        );
      })}
    </div>
  );
}
