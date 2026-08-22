import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { readUpload } from '@/lib/uploads';
import { invoiceView } from '@/lib/invoice-view';
import { invoicePdf } from '@/lib/invoice-pdf';

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
    const bytes = await readUpload(file.storageKey);
    if (!bytes) continue;
    carried.push({
      filename: file.name,
      type: file.mimeType ?? 'application/octet-stream',
      content: bytes.toString('base64'),
    });
  }

  // An invoice travels as the document, not as a description of one. It is
  // drawn at the moment it goes out, so what lands is the invoice as it
  // stands rather than a copy taken when the email was written.
  if (message.invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: message.invoiceId },
      select: { workspaceId: true, number: true, workspace: { select: { currency: true } } },
    });
    // Only used as the fallback contact line when the workspace has no email
    // of its own, so the oldest member is the right one to ask.
    const owner = invoice
      ? await prisma.membership.findFirst({
          where: { workspaceId: invoice.workspaceId },
          orderBy: { createdAt: 'asc' },
          select: { user: { select: { email: true } } },
        })
      : null;
    const view = invoice
      ? await invoiceView(
          message.invoiceId,
          invoice.workspaceId,
          owner?.user.email ?? '',
          invoice.workspace.currency,
        )
      : null;
    if (view) {
      carried.push({
        filename: `${view.number}.pdf`,
        type: 'application/pdf',
        content: (await invoicePdf(view)).toString('base64'),
      });
    }
  }

  const result = await sendEmail({
    to: message.to
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean),
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
