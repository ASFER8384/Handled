import { prisma } from '@/lib/prisma';
import { DEFAULT_COLOUR, DEFAULT_FONT } from '@/lib/invoice-theme';

/**
 * The business as it appears at the top of anything a client is sent, and what
 * a new file starts out looking like.
 *
 * One place, so the invoice, its editor and its printed form cannot disagree
 * about who sent it.
 */
export async function companyBrand(workspaceId: string, fallbackEmail: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      name: true,
      email: true,
      phoneCode: true,
      phone: true,
      website: true,
      address: true,
      street: true,
      city: true,
      postcode: true,
      region: true,
      country: true,
      logoKey: true,
      bankName: true,
      bankAccountName: true,
      bankAccountNumber: true,
      bankIban: true,
      bankSwift: true,
      bankNotes: true,
      taxLabel: true,
      taxNumber: true,
      taxRateBp: true,
      themeColor: true,
      themeFont: true,
    },
  });

  const phone = [workspace?.phoneCode, workspace?.phone].filter(Boolean).join(' ').trim();
  const contact = [workspace?.email || fallbackEmail, phone, workspace?.website]
    .filter(Boolean)
    .join('  |  ');

  // The parts, if they were filled in; the single free-text line otherwise, so
  // an address typed before this page existed still prints.
  const parts = [
    workspace?.street,
    [workspace?.city, workspace?.region].filter(Boolean).join(', '),
    [workspace?.postcode, workspace?.country].filter(Boolean).join(' '),
  ]
    .map((line) => (line ?? '').trim())
    .filter(Boolean);

  // Only the lines that were filled in, in the order a payer reads them.
  const pay = [
    ['Bank', workspace?.bankName],
    ['Account name', workspace?.bankAccountName],
    ['Account number', workspace?.bankAccountNumber],
    ['IBAN', workspace?.bankIban],
    ['SWIFT', workspace?.bankSwift],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return {
    name: workspace?.name ?? '',
    pay,
    payNotes: workspace?.bankNotes ?? null,
    taxLabel: workspace?.taxLabel ?? 'VAT',
    taxNumber: workspace?.taxNumber ?? null,
    taxRateBp: workspace?.taxRateBp ?? 0,
    contact,
    address: parts.length > 0 ? parts.join('\n') : (workspace?.address ?? null),
    logo: workspace?.logoKey ? '/api/settings/company/logo/main' : null,
    themeColor: workspace?.themeColor ?? DEFAULT_COLOUR,
    themeFont: workspace?.themeFont ?? DEFAULT_FONT,
  };
}
