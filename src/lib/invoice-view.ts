import { readFile } from 'node:fs/promises';
import { prisma } from '@/lib/prisma';
import { storagePath } from '@/lib/uploads';
import { companyBrand } from '@/lib/company';
import { balanceCents, paidCents, subtotalCents, taxCents } from '@/lib/money';
import { shows } from '@/lib/invoice-parts';
import { scheduleRows, type InstalmentRow } from '@/lib/invoice-schedule';

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
  /**
   * The logo as bytes, ready to be drawn into a file that travels on its own.
   * A PDF has nowhere to fetch a URL from, so the picture goes inside it.
   */
  logo: { dataUri: string } | null;
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
  /** The sheet design it was written in, so the file matches the screen. */
  design: string;
  /** Bank details from the company settings: label and value, in order. */
  pay: [string, string][];
  payNotes: string | null;
  taxNumber: string | null;
  /** The steps it is paid in, read against the money already in. */
  schedule: InstalmentRow[];
};

export async function invoiceView(
  invoiceId: string,
  workspaceId: string,
  userEmail: string,
  currency: string,
): Promise<InvoiceView | null> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    include: {
      items: { orderBy: { position: 'asc' } },
      instalments: { orderBy: { position: 'asc' } },
      payments: true,
      client: true,
    },
  });
  if (!invoice) return null;

  const brand = await companyBrand(workspaceId, userEmail);

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { logoKey: true, logoMime: true },
  });
  // Parts turned off on this invoice never reach the PDF or the email: they
  // are dropped here rather than checked again at each place that draws one.
  const off = invoice.hidden;
  const logo = shows(off, 'logo')
    ? await logoBytes(workspace?.logoKey ?? null, workspace?.logoMime ?? null)
    : null;

  return {
    id: invoice.id,
    number: invoice.number,
    business: brand.name,
    businessContact: shows(off, 'contact') ? brand.contact : '',
    businessAddress: shows(off, 'address') ? brand.address : null,
    logo,
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
    notes: shows(off, 'notes') ? invoice.notes : null,
    themeColor: invoice.themeColor,
    design: invoice.design,
    pay: shows(off, 'pay') ? brand.pay : [],
    payNotes: shows(off, 'pay') ? brand.payNotes : null,
    taxNumber: shows(off, 'taxNumber') ? brand.taxNumber : null,
    schedule: scheduleRows(invoice.instalments, paidCents(invoice.payments)),
  };
}

/**
 * The logo, if there is one that a PDF can actually draw.
 *
 * PNG and JPEG only: the renderer cannot rasterise SVG or WebP, and a picture
 * that fails to draw takes the whole document down with it. A logo it cannot
 * read is left out rather than risking the invoice.
 */
async function logoBytes(
  key: string | null,
  mime: string | null,
): Promise<{ dataUri: string } | null> {
  if (!key || !mime) return null;
  if (mime !== 'image/png' && mime !== 'image/jpeg') return null;

  const bytes = await readFile(storagePath(key)).catch(() => null);
  if (!bytes) return null;
  return { dataUri: `data:${mime};base64,${bytes.toString('base64')}` };
}
