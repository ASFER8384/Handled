import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, HttpError, parseBody, workHeldBy } from '@/lib/api';

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
    // All or nothing: quietly deleting the free ones and leaving the rest
    // reads as a half-done job with no way to tell which half.
    const held = await workHeldBy(ctx.workspaceId, data.ids);
    if (held.size > 0) {
      const names = await prisma.client.findMany({
        where: { id: { in: [...held.keys()] } },
        select: { name: true },
      });
      throw new HttpError(
        409,
        held.size === 1
          ? `${names[0]?.name ?? 'One of them'} is still on a project. Take them off first, or delete the project.`
          : `${held.size} of them are still on projects. Take them off first, or delete those projects.`,
      );
    }

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
