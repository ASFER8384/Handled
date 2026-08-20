import { prisma } from '@/lib/prisma';
import { companyBrand } from '@/lib/company';
import { balanceCents, paidCents, subtotalCents, taxCents } from '@/lib/money';

/**
 * One invoice, gathered into the shape anything outside the app needs it in.
 *
 * The PDF, the email and the covering note all have to say the same numbers.
 * Reading them from one place is how they stay saying it: a total worked out
 * twice is a total that will disagree with itself eventually.
 */
export type InvoiceView = {
  id: string;
  number: string;
  business: string;
  businessContact: string;
  businessAddress: string | null;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  issuedAt: Date | null;
  dueAt: Date | null;
  items: { description: string; quantity: number; unitPriceCents: number }[];
  subtotalCents: number;
  taxCents: number;
  taxLabel: string;
  taxRateBp: number;
  paidCents: number;
  balanceCents: number;
  currency: string;
  notes: string | null;
  themeColor: string | null;
  /** Bank details from the company settings: label and value, in order. */
  pay: [string, string][];
  payNotes: string | null;
};

export async function invoiceView(
  invoiceId: string,
  workspaceId: string,
  userEmail: string,
  currency: string,
): Promise<InvoiceView | null> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    include: { items: { orderBy: { position: 'asc' } }, payments: true, client: true },
  });
  if (!invoice) return null;

  const brand = await companyBrand(workspaceId, userEmail);

  return {
    id: invoice.id,
    number: invoice.number,
    business: brand.name,
    businessContact: brand.contact,
    businessAddress: brand.address,
    clientName: invoice.client.name,
    clientCompany: invoice.client.company,
    clientEmail: invoice.client.email,
    issuedAt: invoice.issuedAt,
    dueAt: invoice.dueAt,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    })),
    subtotalCents: subtotalCents(invoice.items),
    taxCents: taxCents(invoice.items, invoice.taxRateBp),
    taxLabel: invoice.taxLabel ?? brand.taxLabel,
    taxRateBp: invoice.taxRateBp,
    paidCents: paidCents(invoice.payments),
    balanceCents: balanceCents(invoice.items, invoice.payments, invoice.taxRateBp),
    currency,
    notes: invoice.notes,
    themeColor: invoice.themeColor,
    pay: brand.pay,
    payNotes: brand.payNotes,
  };
}
