import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, parseBody } from '@/lib/api';
import { companySchema } from '@/lib/validation';

export const PATCH = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, companySchema);

  await prisma.workspace.update({
    where: { id: ctx.workspaceId },
    data: {
      name: data.name,
      trade: data.trade ?? null,
      email: data.email || null,
      phone: data.phone ?? null,
      website: data.website ?? null,
      address: data.address ?? null,
      ...(data.currency ? { currency: data.currency.toUpperCase() } : {}),
      ...(data.themeColor ? { themeColor: data.themeColor } : {}),
      ...(data.themeFont ? { themeFont: data.themeFont } : {}),
    },
  });
  return NextResponse.json({ ok: true });
});
