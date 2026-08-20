'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { EmptyState } from '@/components/ui';
import { api } from '@/lib/client-fetch';

export type GalleryTemplate = {
  id: string;
  name: string;
  blurb: string;
  dueInDays: number;
  notes: string;
  items: { description: string; quantity: number }[];
  /** Saved by this workspace, so it can be thrown away again. */
  mine: boolean;
};

/**
 * The templates you can start an invoice from, and what each one says.
 *
 * A card is a look at the lines rather than a name to guess from: what a
 * template is worth knowing is what it will write for you, which is short
 * enough to simply show.
 */
export function TemplateGallery({ templates }: { templates: GalleryTemplate[] }) {
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
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => setOpen(template)}
            className="card hover:border-accent flex flex-col p-5 text-left transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="font-semibold">{template.name}</span>
              {template.mine && (
                <span className="bg-accent-soft text-accent rounded-full px-2 py-0.5 text-xs font-medium">
                  Yours
                </span>
              )}
            </span>
            <span className="text-muted mt-1 text-sm">{template.blurb}</span>

            <span className="border-line mt-4 block space-y-1.5 border-t pt-4">
              {template.items.slice(0, 3).map((item, index) => (
                <span key={index} className="flex justify-between gap-3 text-sm">
                  <span className="truncate">{item.description}</span>
                  <span className="text-muted shrink-0 tabular-nums">×{item.quantity}</span>
                </span>
              ))}
              {template.items.length > 3 && (
                <span className="text-muted block text-sm">
                  +{template.items.length - 3} more lines
                </span>
              )}
            </span>

            <span className="text-muted mt-4 text-xs">
              Due {template.dueInDays} days after it is written
            </span>
          </button>
        ))}
      </div>

      {open && (
        <Dialog title={open.name} onClose={() => setOpen(null)} width={540} fit>
          <ul className="space-y-2">
            {open.items.map((item, index) => (
              <li key={index} className="border-line flex justify-between gap-4 border-b pb-2">
                <span>{item.description}</span>
                <span className="text-muted shrink-0 tabular-nums">×{item.quantity}</span>
              </li>
            ))}
          </ul>

          {open.notes && <p className="text-muted mt-4 text-sm">{open.notes}</p>}

          <p className="text-muted mt-4 text-sm">
            Due {open.dueInDays} days out. Prices are yours to fill in.
          </p>

          {error && <p className="field-error">{error}</p>}

          <div className="mt-6 flex items-center gap-3">
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
