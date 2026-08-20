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
