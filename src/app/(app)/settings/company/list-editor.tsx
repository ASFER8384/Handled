'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';

/**
 * The lists this business picks from: the kinds of work it does, and where
 * the work comes from.
 *
 * A photographer's project types and a caterer's have almost nothing in
 * common, so neither gets a list written by us and lived with. They are chips
 * rather than a textarea because the order is the order they appear in the
 * dropdown, and a chip can be dragged out of it without editing a line of
 * commas.
 */
export function ListEditor({
  label,
  hint,
  field,
  initial,
  placeholder,
}: {
  label: string;
  hint: string;
  /** Which of the workspace's lists this is. */
  field: 'projectTypes' | 'leadSources';
  initial: string[];
  placeholder: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [typed, setTyped] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function add() {
    const name = typed.trim();
    if (!name) return;
    // The same thing twice in a dropdown is a bug you have to scroll to find.
    if (items.some((item) => item.toLowerCase() === name.toLowerCase())) {
      setTyped('');
      return;
    }
    setItems((current) => [...current, name]);
    setTyped('');
    setSaved(false);
  }

  function remove(name: string) {
    setItems((current) => current.filter((item) => item !== name));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const { error: failure } = await api('/api/settings/lists', {
      method: 'PUT',
      body: { [field]: items },
    });
    setSaving(false);
    if (failure) {
      setError(failure.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div>
      <p className="font-medium">{label}</p>
      <p className="text-muted mt-1 text-sm">{hint}</p>

      <ul className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="bg-accent-soft/60 flex items-center gap-2 rounded-full py-1.5 pr-2 pl-3.5 text-sm"
          >
            {item}
            <button
              type="button"
              aria-label={`Remove ${item}`}
              onClick={() => remove(item)}
              className="text-muted hover:text-red-700"
            >
              ✕
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-muted text-sm">
            Empty, so the list Handled ships with is used instead.
          </li>
        )}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          className="input-soft w-full max-w-[280px]"
          placeholder={placeholder}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
        />
        <button type="button" onClick={add} className="btn-ghost">
          Add
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-muted text-sm">Saved.</span>}
      </div>

      {error && <p className="field-error mt-3">{error}</p>}
    </div>
  );
}
