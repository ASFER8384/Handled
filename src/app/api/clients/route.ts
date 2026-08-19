import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, parseBody } from '@/lib/api';
import { clientSchema } from '@/lib/validation';
import { fireTrigger } from '@/lib/automations';

export const GET = handler(async (ctx) => {
  const clients = await prisma.client.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ clients });
});

export const POST = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, clientSchema);
  const client = await prisma.client.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: data.name,
      email: data.email || null,
      phone: data.phone ?? null,
      company: data.company ?? null,
      jobTitle: data.jobTitle ?? null,
      website: data.website ?? null,
      address: data.address ?? null,
      lastInteractionAt: data.lastInteractionAt ?? null,
      notes: data.notes ?? null,
    },
  });
  await fireTrigger('CLIENT_CREATED', { workspaceId: ctx.workspaceId, clientId: client.id });

  return NextResponse.json({ client }, { status: 201 });
});
