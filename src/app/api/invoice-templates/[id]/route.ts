import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, HttpError } from '@/lib/api';

export const DELETE = handler(
  async (ctx, _request: Request, context: RouteContext<'/api/invoice-templates/[id]'>) => {
    const { id } = await context.params;

    // Scoped to the workspace in the count, not after it: deleting by id alone
    // would take another workspace's template with the same id.
    const { count } = await prisma.invoiceTemplate.deleteMany({
      where: { id, workspaceId: ctx.workspaceId },
    });
    if (count === 0) throw new HttpError(404, 'That template is gone already');

    return NextResponse.json({ ok: true });
  },
);
