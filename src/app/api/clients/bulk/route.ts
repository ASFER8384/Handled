import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, parseBody } from '@/lib/api';

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  action: z.enum(['delete', 'addTags', 'removeTags']),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

/**
 * What the selection bar does. Every write is scoped by workspace, so an id
 * from somewhere else simply misses rather than reaching another tenant.
 */
export const POST = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, bulkSchema);
  const where = { id: { in: data.ids }, workspaceId: ctx.workspaceId };

  if (data.action === 'delete') {
    const { count } = await prisma.client.deleteMany({ where });
    return NextResponse.json({ changed: count });
  }

  // Tags are a list on each row, so they are read, changed and written back
  // one at a time rather than in a single statement.
  const rows = await prisma.client.findMany({ where, select: { id: true, tags: true } });
  let changed = 0;
  for (const row of rows) {
    const tags =
      data.action === 'addTags'
        ? [...row.tags, ...data.tags.filter((tag) => !row.tags.includes(tag))]
        : row.tags.filter((tag) => !data.tags.includes(tag));
    if (tags.length === row.tags.length && data.action === 'removeTags') continue;
    await prisma.client.update({ where: { id: row.id }, data: { tags } });
    changed += 1;
  }

  return NextResponse.json({ changed });
});
