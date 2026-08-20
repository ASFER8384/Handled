import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, parseBody } from '@/lib/api';
import { contactPrefsPatchSchema } from '@/lib/validation';

/**
 * How this workspace likes its Contacts table: the columns it leaves off and
 * the column it is ordered by. Kept on the workspace rather than the browser,
 * so the table opens the same way on the next machine.
 */
export const PATCH = handler(async (ctx, request: Request) => {
  const data = await parseBody(request, contactPrefsPatchSchema);

  const workspace = await prisma.workspace.update({
    where: { id: ctx.workspaceId },
    data: {
      contactHiddenColumns: data.hiddenColumns,
      contactSortField: data.sortField,
      contactSortDir: data.sortDir,
    },
    select: {
      contactHiddenColumns: true,
      contactSortField: true,
      contactSortDir: true,
    },
  });

  return NextResponse.json({ prefs: workspace });
});
