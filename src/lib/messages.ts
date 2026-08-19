import { readFile } from 'node:fs/promises';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { storagePath } from '@/lib/uploads';

/**
 * Sending, in one place, so a message goes out the same way whether it was
 * written and sent there and then, scheduled for later, or a draft picked back
 * up. Nothing is claimed as sent unless a provider actually accepted it.
 */
export async function deliver(messageId: string): Promise<{ delivered: boolean; detail: string }> {
  const message = await prisma.projectMessage.findUnique({ where: { id: messageId } });
  if (!message) return { delivered: false, detail: 'That message is gone.' };

  const attachments = Array.isArray(message.attachments)
    ? (message.attachments as { id: string; name: string }[])
    : [];

  const files = attachments.length
    ? await prisma.projectFile.findMany({ where: { id: { in: attachments.map((a) => a.id) } } })
    : [];

  // Uploaded files travel as base64; a linked one stays a link in the body.
  const carried = [];
  for (const file of files) {
    if (!file.storageKey) continue;
    const bytes = await readFile(storagePath(file.storageKey)).catch(() => null);
    if (!bytes) continue;
    carried.push({
      filename: file.name,
      type: file.mimeType ?? 'application/octet-stream',
      content: bytes.toString('base64'),
    });
  }

  const result = await sendEmail({
    to: message.to.split(',').map((address) => address.trim()).filter(Boolean),
    subject: message.subject,
    body: message.body,
    bodyHtml: message.bodyHtml ?? undefined,
    attachments: carried,
  });

  await prisma.projectMessage.update({
    where: { id: messageId },
    data: {
      status: result.delivered ? 'SENT' : 'QUEUED',
      detail: result.detail,
      sentAt: result.delivered ? new Date() : null,
      scheduledFor: null,
    },
  });
  return result;
}

/**
 * Sends whatever was scheduled for a time that has now passed. Called from a
 * page load, the same way automations catch up: safe to call often, and does
 * nothing when nothing is due.
 */
export async function sweepDueEmails(workspaceId: string): Promise<number> {
  try {
    const due = await prisma.projectMessage.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { lte: new Date() },
        project: { workspaceId },
      },
      orderBy: { scheduledFor: 'asc' },
      select: { id: true },
      take: 50,
    });

    for (const message of due) await deliver(message.id);
    return due.length;
  } catch {
    // A sweep is a courtesy: it must never take the page down with it.
    return 0;
  }
}
