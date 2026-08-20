import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, parseBody } from '@/lib/api';
import { bankSchema } from '@/lib/validation';

export const PATCH = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, bankSchema);

  await prisma.workspace.update({
    where: { id: ctx.workspaceId },
    data: {
      bankName: data.bankName ?? null,
      bankAccountName: data.bankAccountName ?? null,
      bankAccountNumber: data.bankAccountNumber ?? null,
      bankIban: data.bankIban ?? null,
      bankSwift: data.bankSwift ?? null,
      bankNotes: data.bankNotes ?? null,
      taxLabel: data.taxLabel || 'VAT',
      taxNumber: data.taxNumber ?? null,
      taxRateBp: data.taxRateBp ?? 0,
    },
  });

  // Drafts follow the current rate; anything sent keeps the rate it went out
  // with, which is the whole reason the invoice carries its own copy.
  await prisma.invoice.updateMany({
    where: { workspaceId: ctx.workspaceId, status: 'DRAFT' },
    data: { taxRateBp: data.taxRateBp ?? 0, taxLabel: data.taxLabel || 'VAT' },
  });

  return NextResponse.json({ ok: true });
});
