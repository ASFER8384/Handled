'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { Select } from '@/components/select';
import { EmptyState } from '@/components/ui';
import { InvoiceSheet } from '@/components/invoice-sheet';
import { api } from '@/lib/client-fetch';

export type GalleryTemplate = {
  id: string;
  name: string;
  blurb: string;
  dueInDays: number;
  notes: string;
  /** What kind of file it is: Invoice, and later contracts and the rest. */
  kind: string;
  /** The trades it was written for. */
  industries: string[];
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

  const [query, setQuery] = useState('');
  const [industry, setIndustry] = useState('all');
  const [kind, setKind] = useState('all');

  const alive = templates.filter((template) => !gone.includes(template.id));

  // Built from what is actually here, so the lists can never offer a filter
  // that empties the page.
  const industries = useMemo(
    () => [...new Set(alive.flatMap((template) => template.industries))].sort(),
    [alive],
  );
  const kinds = useMemo(() => [...new Set(alive.map((template) => template.kind))].sort(), [alive]);

  const wanted = query.trim().toLowerCase();
  const shown = alive.filter((template) => {
    if (industry !== 'all' && !template.industries.includes(industry)) return false;
    if (kind !== 'all' && template.kind !== kind) return false;
    if (!wanted) return true;
    // The line descriptions are searched too: you look for 'travel', not for
    // the name of the template that happens to have a travel line in it.
    const haystack = [template.name, template.blurb, ...template.items.map((i) => i.description)]
      .join(' ')
      .toLowerCase();
    return haystack.includes(wanted);
  });

  const filtered = wanted !== '' || industry !== 'all' || kind !== 'all';

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

  return (
    <>
      <div className="mx-auto max-w-xl text-center">
        <h2 className="font-display text-3xl leading-tight font-bold sm:text-4xl">
          Templates that do the writing,
          <br />
          so you only fill in the price.
        </h2>
        <p className="text-muted mx-auto mt-3 max-w-md text-sm">
          Each one is a finished invoice in your own letterhead. Pick one and it opens filled in,
          ready to send.
        </p>
      </div>

      <div className="mx-auto mt-8 mb-10 flex max-w-2xl flex-col items-center gap-3 sm:flex-row">
        <div className="relative w-full sm:flex-1">
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="text-muted pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            aria-label="Search templates"
            placeholder="Explore templates…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="border-line focus:border-accent focus:ring-accent/20 h-11 w-full rounded-full border bg-white pr-4 pl-11 text-sm outline-none focus:ring-2 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <Select
          ariaLabel="Industry"
          className="[&>button]:border-line w-full sm:w-[180px] [&>button]:h-11 [&>button]:rounded-full [&>button]:border [&>button]:bg-white [&>button]:px-5"
          value={industry}
          onChange={setIndustry}
          options={[
            { value: 'all', label: 'Industry' },
            ...industries.map((name) => ({ value: name, label: name })),
          ]}
        />

        <Select
          ariaLabel="Type"
          className="[&>button]:border-line w-full sm:w-[150px] [&>button]:h-11 [&>button]:rounded-full [&>button]:border [&>button]:bg-white [&>button]:px-5"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: 'Type' },
            ...kinds.map((name) => ({ value: name, label: name })),
          ]}
        />
      </div>

      {shown.length === 0 && (
        <EmptyState
          title="Nothing matches"
          body={
            filtered
              ? 'Clear the search or the filters to see the rest.'
              : 'Save one from an invoice you have written.'
          }
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((template) => (
          // A div, not a button: the card holds a whole invoice, and a document
          // is not phrasing content. The name below is the real button, and it
          // stretches over the card so the picture is clickable too.
          <div
            key={template.id}
            className="border-line group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <Thumbnail template={template} brand={brand} />

            <div className="border-line border-t px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(template)}
                  className="group-hover:text-accent text-left text-sm font-semibold transition-colors after:absolute after:inset-0"
                >
                  {template.name}
                </button>
                {template.mine && (
                  <span className="bg-accent-soft text-accent shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
                    Yours
                  </span>
                )}
              </div>
              <p className="text-muted mt-1 line-clamp-2 text-[13px] leading-snug">
                {template.blurb}
              </p>
              <span className="bg-background text-muted mt-2.5 inline-block rounded-md px-2 py-0.5 text-[11px]">
                {template.kind}
              </span>
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

/**
 * The top of the invoice, shrunk to the width of its card.
 *
 * The scale is measured rather than guessed: a fixed one leaves a white margin
 * on a wide card and cuts the sheet off on a narrow one. The bottom fades out,
 * so the crop reads as a page carrying on rather than a row sliced in half.
 */
function Thumbnail({ template, brand }: { template: GalleryTemplate; brand: GalleryBrand }) {
  const box = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const node = box.current;
    if (!node) return;
    const watch = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / SHEET_WIDTH);
    });
    watch.observe(node);
    return () => watch.disconnect();
  }, []);

  return (
    <div ref={box} className="relative aspect-[5/4] overflow-hidden bg-white">
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: SHEET_WIDTH, transform: `scale(${scale})`, opacity: scale ? 1 : 0 }}
      >
        <Sheet template={template} brand={brand} plain />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
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
