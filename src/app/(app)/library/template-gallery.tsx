'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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
        <Preview
          template={open}
          brand={brand}
          error={error}
          working={working}
          onUse={() => router.push(`/invoices/new?start=${open.id}`)}
          onDelete={() => remove(open)}
          onClose={() => setOpen(null)}
        />
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

/**
 * A template opened: what it is on the left, the invoice itself on the right.
 *
 * The picture is the point, so it gets the room — the pane scrolls the whole
 * sheet at full size rather than shrinking it into a column of text. What the
 * words are for is the part a picture cannot say: how long it gives the client
 * to pay, and what happens after it is sent.
 */
function Preview({
  template,
  brand,
  error,
  working,
  onUse,
  onDelete,
  onClose,
}: {
  template: GalleryTemplate;
  brand: GalleryBrand;
  error: string | null;
  working: boolean;
  onUse: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const tags = [template.kind, ...template.industries];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={template.name}
        className="bg-surface relative flex h-[calc(100vh-4rem)] w-full max-w-[1140px] overflow-hidden rounded-2xl shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted hover:text-foreground absolute top-5 right-5 z-10 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>

        {/* --- what it is ------------------------------------------------ */}
        <div className="flex w-[380px] shrink-0 flex-col overflow-y-auto p-8">
          <h2 className="font-display text-2xl leading-tight font-bold">{template.name}</h2>
          <p className="text-muted mt-2 text-sm">
            {template.mine ? 'Saved from one of your invoices' : 'Built into Handled'}
          </p>

          <p className="mt-5 text-sm leading-relaxed">{template.blurb}</p>

          <p className="text-muted mt-8 text-xs tracking-widest uppercase">What it does</p>
          <ol className="mt-3 space-y-3 text-sm">
            <li className="flex gap-3">
              <Dot />
              <span>
                Writes the invoice with {template.items.length}{' '}
                {template.items.length === 1 ? 'line' : 'lines'}, due in {template.dueInDays} days.
              </span>
            </li>
            <li className="flex gap-3">
              <Dot />
              <span>Takes the payment, and records it against the project.</span>
            </li>
          </ol>

          <p className="text-muted mt-8 text-xs tracking-widest uppercase">Tags</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="bg-background rounded-full px-3 py-1 text-xs">
                {tag}
              </span>
            ))}
          </div>

          {error && <p className="field-error mt-6">{error}</p>}

          <div className="mt-auto flex items-center gap-3 pt-8">
            <button type="button" onClick={onUse} className="btn-primary">
              Use this template
            </button>
            {template.mine && (
              <button
                type="button"
                disabled={working}
                onClick={onDelete}
                className="text-muted text-sm hover:text-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* --- the invoice itself ---------------------------------------- */}
        <div className="bg-background flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 justify-center gap-1 pt-5">
            <DeviceButton
              label="Desktop"
              active={device === 'desktop'}
              onClick={() => setDevice('desktop')}
            >
              <rect x="2.5" y="4" width="19" height="13" rx="1.5" />
              <path d="M9 20h6M12 17v3" strokeLinecap="round" />
            </DeviceButton>
            <DeviceButton
              label="Mobile"
              active={device === 'mobile'}
              onClick={() => setDevice('mobile')}
            >
              <rect x="7" y="2.5" width="10" height="19" rx="2" />
              <path d="M10.5 5.5h3" strokeLinecap="round" />
            </DeviceButton>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-8">
            {/* The sheet lays itself out from the width of this box rather than
                the window, so the narrow one is the real narrow invoice. */}
            <div
              className="mx-auto transition-[max-width] duration-200"
              style={{ maxWidth: device === 'mobile' ? 390 : 640 }}
            >
              <Sheet template={template} brand={brand} />
              <p className="text-muted mt-4 text-center text-xs">
                The prices are an example. Yours are asked for when you write the invoice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The step marker down the left of the list of what a template does. */
function Dot() {
  return (
    <span
      aria-hidden
      className="border-accent mt-1.5 h-2 w-2 shrink-0 rounded-full border-2 bg-white"
    />
  );
}

/** Desktop or phone, drawn as the thing itself rather than named. */
function DeviceButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} width`}
      aria-pressed={active}
      className={`relative px-5 pt-2 pb-3 transition-colors after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-full ${
        active
          ? 'text-foreground after:bg-accent'
          : 'text-muted hover:text-foreground after:bg-transparent'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        {children}
      </svg>
    </button>
  );
}
