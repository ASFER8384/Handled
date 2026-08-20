import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, parseBody } from '@/lib/api';
import { accountSchema } from '@/lib/validation';

export const PATCH = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, accountSchema);

  // The email is left alone here: it is what you sign in with, and changing it
  // belongs with the password, behind whatever proves it is still you.
  await prisma.user.update({
    where: { id: ctx.userId },
    data: {
      name: data.name,
      jobTitle: data.jobTitle ?? null,
      phoneCode: data.phoneCode ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
    },
  });
  return NextResponse.json({ ok: true });
});
