import type { Prisma } from '@/generated/prisma/client';
import type { InvoiceStatus } from '@/generated/prisma/enums';
import { paidCents, totalCents, type LineItem } from '@/lib/money';

type Tx = Prisma.TransactionClient;

/**
 * Sequential per workspace: INV-0001, INV-0002, ... Derived from the highest
 * number already issued rather than a count, so voiding an invoice never causes
 * a collision with one that still exists.
 */
export async function nextInvoiceNumber(tx: Tx, workspaceId: string): Promise<string> {
  const latest = await tx.invoice.findFirst({
    where: { workspaceId },
    orderBy: { number: 'desc' },
    select: { number: true },
  });

  const previous = latest ? Number.parseInt(latest.number.replace(/\D/g, ''), 10) : 0;
  const next = Number.isFinite(previous) ? previous + 1 : 1;
  return `INV-${String(next).padStart(4, '0')}`;
}

/**
 * Past its date, with money still owed.
 *
 * Overdue is not a status an invoice is put into — nothing happens on the day
 * it turns, and a stored one would need something to run at midnight to keep
 * it true. It is read off the invoice each time it is shown: sent, still owed,
 * and the date has gone by.
 *
 * The comparison is by day, not by moment: an invoice due today is not late
 * at nine in the morning.
 */
export function isOverdue(
  invoice: { status: InvoiceStatus; dueAt: Date | null },
  balance: number,
  today = new Date(),
): boolean {
  if (invoice.status !== 'SENT' && invoice.status !== 'PARTIALLY_PAID') return false;
  if (balance <= 0 || !invoice.dueAt) return false;
  return startOfDay(invoice.dueAt) < startOfDay(today);
}

/** Whole days between the due date and today, for saying how late it is. */
export function daysLate(dueAt: Date, today = new Date()): number {
  const day = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(today).getTime() - startOfDay(dueAt).getTime()) / day);
}

function startOfDay(value: Date): Date {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Payment state is derived, never hand-set: the stored status only records
 * whether the invoice was sent or voided.
 */
export function deriveStatus(
  stored: InvoiceStatus,
  items: readonly LineItem[],
  payments: readonly { amountCents: number }[],
  /// Tax is part of what is owed, so it is part of what settles it.
  taxRateBp = 0,
): InvoiceStatus {
  if (stored === 'DRAFT' || stored === 'VOID') return stored;

  const total = totalCents(items, taxRateBp);
  const paid = paidCents(payments);
  if (paid <= 0) return 'SENT';
  if (paid >= total) return 'PAID';
  return 'PARTIALLY_PAID';
}

export async function resyncInvoiceStatus(tx: Tx, invoiceId: string): Promise<InvoiceStatus> {
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { items: true, payments: true },
  });
  const status = deriveStatus(invoice.status, invoice.items, invoice.payments, invoice.taxRateBp);
  if (status !== invoice.status) {
    await tx.invoice.update({ where: { id: invoiceId }, data: { status } });
  }
  return status;
}
