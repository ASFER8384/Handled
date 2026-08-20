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
      phoneCode: data.phoneCode ?? null,
      phone: data.phone ?? null,
      website: data.website ?? null,
      address: data.address ?? null,
      street: data.street ?? null,
      city: data.city ?? null,
      postcode: data.postcode ?? null,
      region: data.region ?? null,
      country: data.country ?? null,
      timezone: data.timezone ?? null,
      oneLiner: data.oneLiner ?? null,
      about: data.about ?? null,
      ...(data.brandColor ? { brandColor: data.brandColor } : {}),
      // Only what was filled in is kept, so an emptied box really empties.
      socials: Object.fromEntries(
        Object.entries(data.socials ?? {}).filter(([, value]) => (value ?? '').trim() !== ''),
      ),
      ...(data.currency ? { currency: data.currency.toUpperCase() } : {}),
      ...(data.themeColor ? { themeColor: data.themeColor } : {}),
      ...(data.themeFont ? { themeFont: data.themeFont } : {}),
    },
  });
  return NextResponse.json({ ok: true });
});
