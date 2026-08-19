/**
 * Sending is not wired to a provider yet. Everything written is stored either
 * way, so turning delivery on later is a matter of setting credentials: this
 * is the only file that has to know which provider is in use.
 *
 * SendGrid (Twilio) is the expected one. Set SENDGRID_API_KEY and MAIL_FROM.
 */
export type SendResult = { delivered: boolean; detail: string };

export type OutgoingEmail = {
  to: string[];
  subject: string;
  /** Plain text, always present, for clients that will not render HTML. */
  body: string;
  /** The formatted version, when the message was written with formatting. */
  bodyHtml?: string;
  attachments?: { filename: string; type: string; content: string }[];
};

export async function sendEmail(message: OutgoingEmail): Promise<SendResult> {
  const key = process.env.SENDGRID_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!key || !from) {
    return {
      delivered: false,
      detail: 'Saved. No email provider is connected yet, so it was not sent.',
    };
  }

  // Plain text first: SendGrid treats the last part as the preferred one.
  const content = [{ type: 'text/plain', value: message.body }];
  if (message.bodyHtml) content.push({ type: 'text/html', value: message.bodyHtml });

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: message.to.map((email) => ({ email })) }],
      from: { email: from },
      subject: message.subject,
      content,
      ...(message.attachments?.length
        ? {
            attachments: message.attachments.map((file) => ({
              filename: file.filename,
              type: file.type,
              content: file.content,
              disposition: 'attachment',
            })),
          }
        : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return { delivered: false, detail: `Provider refused it: ${response.status} ${detail}`.trim() };
  }
  return { delivered: true, detail: 'Delivered to the provider.' };
}
