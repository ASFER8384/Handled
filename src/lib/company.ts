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
      phone: true,
      website: true,
      address: true,
      themeColor: true,
      themeFont: true,
    },
  });

  const contact = [workspace?.email || fallbackEmail, workspace?.phone, workspace?.website]
    .filter(Boolean)
    .join('  |  ');

  return {
    name: workspace?.name ?? '',
    contact,
    address: workspace?.address ?? null,
    themeColor: workspace?.themeColor ?? DEFAULT_COLOUR,
    themeFont: workspace?.themeFont ?? DEFAULT_FONT,
  };
}
