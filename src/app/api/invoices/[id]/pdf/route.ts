import { handler, notFound } from '@/lib/api';
import { invoiceView } from '@/lib/invoice-view';
import { invoicePdf } from '@/lib/invoice-pdf';

type Params = { params: Promise<{ id: string }> };

/** The invoice as a file: what gets attached to the email, and downloaded. */
export const GET = handler(async (ctx, request: Request, { params }: Params) => {
  const { id } = await params;
  // Shown in a frame by default; asked for with ?download it is saved instead.
  const saving = new URL(request.url).searchParams.has('download');
  const invoice = await invoiceView(id, ctx.workspaceId, ctx.userEmail, ctx.currency);
  if (!invoice) notFound('Invoice');

  const file = await invoicePdf(invoice);

  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${saving ? 'attachment' : 'inline'}; filename="${invoice.number}.pdf"`,
      // It changes as the invoice does, and it is nobody else's to hold.
      'Cache-Control': 'private, no-store',
    },
  });
});
