'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { api } from '@/lib/client-fetch';

/**
 * Keeps an invoice's lines and terms for the next one like it.
 *
 * The prices, the client and the dates are deliberately left behind: those
 * belong to this job. What is worth keeping is the shape of it.
 */
export function SaveAsTemplate({
  suggestedName,
  notes,
  items,
}: {
  suggestedName: string;
  notes: string;
  items: { description: string; quantity: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(suggestedName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const { error: failure } = await api('/api/invoice-templates', {
      method: 'POST',
      body: { name, notes, dueInDays: 14, items },
    });
    setSaving(false);
    if (failure) {
      setError(failure.error);
      return;
    }
    setOpen(false);
    router.push('/library');
  }

  return (
    <>
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        Save as template
      </button>

      {open && (
        <Dialog title="Save as template" onClose={() => setOpen(false)} width={460} fit>
          <label className="label" htmlFor="template-name">
            Name
          </label>
          <input
            id="template-name"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            className="input"
          />

          <p className="text-muted mt-4 text-sm">
            {items.length} {items.length === 1 ? 'line' : 'lines'} and the notes are kept. Prices,
            client and dates are not — they belong to this invoice.
          </p>

          {error && <p className="field-error">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={saving || name.trim() === ''}
              onClick={save}
            >
              {saving ? 'Saving…' : 'Save template'}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
