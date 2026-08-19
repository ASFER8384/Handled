import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, notFound, parseBody } from '@/lib/api';
import { projectFieldValuesSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

/** Answers arrive together; an empty one means the field was cleared. */
export const PUT = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  const { values } = await parseBody(request, projectFieldValuesSchema);

  const project = await prisma.project.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!project) notFound('Project');

  const mine = await prisma.customField.findMany({
    where: { workspaceId: ctx.workspaceId, id: { in: values.map((entry) => entry.fieldId) } },
    select: { id: true },
  });
  const allowed = new Set(mine.map((field) => field.id));

  for (const entry of values) {
    if (!allowed.has(entry.fieldId)) continue;
    if (entry.value.trim() === '') {
      await prisma.projectFieldValue.deleteMany({
        where: { projectId: id, fieldId: entry.fieldId },
      });
      continue;
    }
    await prisma.projectFieldValue.upsert({
      where: { projectId_fieldId: { projectId: id, fieldId: entry.fieldId } },
      create: { projectId: id, fieldId: entry.fieldId, value: entry.value },
      update: { value: entry.value },
    });
  }

  const saved = await prisma.projectFieldValue.findMany({ where: { projectId: id } });
  return NextResponse.json({ values: saved });
});
