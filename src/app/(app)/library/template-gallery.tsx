'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { EmptyState } from '@/components/ui';
import { InvoiceSheet } from '@/components/invoice-sheet';
import { api } from '@/lib/client-fetch';

export type GalleryTemplate = {
  id: string;
  name: string;
  blurb: string;
  dueInDays: number;
  notes: string;
  items: { description: string; quantity: number; sampleCents?: number }[];
  /** Saved by this workspace, so it can be thrown away again. */
  mine: boolean;
};

/** The letterhead the previews wear, so they look like your invoices. */
export type GalleryBrand = {
  name: string;
  contact: string;
  address: string | null;
  logo: string | null;
  themeColor: string;
  themeFont: string;
  taxLabel: string;
  taxRateBp: number;
  currency: string;
};

/** The width a sheet is drawn at before it is scaled down into a card. */
const SHEET_WIDTH = 780;

/**
 * The templates you can start an invoice from, each shown as the invoice it
 * makes.
 *
 * A card is the thing itself, shrunk — your letterhead, your colours, its
 * lines priced as an example. A name and a list of line descriptions tells you
 * what a template contains; only a picture of it tells you what a client will
 * be looking at.
 */
export function TemplateGallery({
  templates,
  brand,
}: {
  templates: GalleryTemplate[];
  brand: GalleryBrand;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<GalleryTemplate | null>(null);
  const [gone, setGone] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shown = templates.filter((template) => !gone.includes(template.id));

  async function remove(template: GalleryTemplate) {
    setWorking(true);
    setError(null);
    const { error: failure } = await api(`/api/invoice-templates/${template.id}`, {
      method: 'DELETE',
    });
    setWorking(false);
    if (failure) {
      setError(failure.error);
      return;
    }

    // Dropped here as well as on the server: a refresh takes seconds, and the
    // card sitting there afterwards reads as a delete that did not work.
    setGone((current) => [...current, template.id]);
    setOpen(null);
    router.refresh();
  }

  if (shown.length === 0) {
    return <EmptyState title="No templates" body="Save one from an invoice you have written." />;
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((template) => (
          // A div, not a button: the card holds a whole invoice, and a document
          // is not phrasing content. The name below is the real button, and it
          // stretches over the card so the picture is clickable too.
          <div
            key={template.id}
            className="border-line hover:border-accent relative overflow-hidden rounded-xl border transition-colors"
          >
            <Thumbnail template={template} brand={brand} />

            <div className="border-line bg-surface border-t px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(template)}
                  className="font-semibold after:absolute after:inset-0"
                >
                  {template.name}
                </button>
                {template.mine && (
                  <span className="bg-accent-soft text-accent rounded-full px-2 py-0.5 text-xs font-medium">
                    Yours
                  </span>
                )}
              </div>
              <p className="text-muted mt-0.5 text-sm">{template.blurb}</p>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <Dialog title={open.name} onClose={() => setOpen(null)} width={860}>
          <Sheet template={open} brand={brand} />

          <p className="text-muted mt-5 text-sm">
            Due {open.dueInDays} days out. The prices above are an example — yours are asked for
            when you write the invoice.
          </p>

          {error && <p className="field-error">{error}</p>}

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/invoices/new?start=${open.id}`)}
              className="btn-primary"
            >
              Use template
            </button>
            {open.mine && (
              <button
                type="button"
                disabled={working}
                onClick={() => remove(open)}
                className="text-muted text-sm hover:text-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}

/** The top of the invoice, shrunk to fit a card and not clickable inside it. */
function Thumbnail({ template, brand }: { template: GalleryTemplate; brand: GalleryBrand }) {
  return (
    <div className="h-[280px] overflow-hidden bg-white">
      <div className="origin-top-left" style={{ width: SHEET_WIDTH, transform: 'scale(0.46)' }}>
        <Sheet template={template} brand={brand} plain />
      </div>
    </div>
  );
}

/** One template drawn as the invoice it makes, priced with its example. */
function Sheet({
  template,
  brand,
  plain,
}: {
  template: GalleryTemplate;
  brand: GalleryBrand;
  /** Inside a card: no border or shadow of its own, and nothing to click. */
  plain?: boolean;
}) {
  const items = template.items.map((item, index) => ({
    id: String(index),
    description: item.description,
    quantity: item.quantity,
    unitPriceCents: item.sampleCents ?? 100000,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  const tax = Math.round((subtotal * brand.taxRateBp) / 10000);

  const due = new Date();
  due.setDate(due.getDate() + template.dueInDays);

  return (
    <div
      className={
        plain
          ? 'pointer-events-none [&_.invoice-sheet]:rounded-none [&_.invoice-sheet]:border-0'
          : ''
      }
    >
      <InvoiceSheet
        number="INV-0000"
        from={brand.name}
        fromEmail={brand.contact}
        fromAddress={brand.address}
        logo={brand.logo}
        billTo={{ name: 'Your client', company: null, address: null, email: null }}
        issuedAt={new Date()}
        dueAt={due}
        items={items}
        subtotal={subtotal}
        tax={tax}
        taxLabel={brand.taxLabel}
        taxRateBp={brand.taxRateBp}
        paid={0}
        balance={subtotal + tax}
        currency={brand.currency}
        notes={template.notes}
        themeColor={brand.themeColor}
        themeFont={brand.themeFont}
      />
    </div>
  );
}
