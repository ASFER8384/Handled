'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { Tip } from '@/components/ui';

export type ViewTab = { id: string; name: string; isDefault: boolean };

/**
 * One tab per saved view, above whatever list the view is of. The default
 * view is fixed: it is the one a workspace can always fall back to, so it
 * cannot be renamed or deleted.
 *
 * The tabs know nothing about what they are tabs of. Projects and Contacts
 * both keep saved views, and they should not drift into two ideas of what a
 * view is, so the page says where its list lives and which endpoint owns its
 * views, and this draws the rest.
 */
export function ViewTabs({
  views,
  activeId,
  basePath,
  endpoint,
}: {
  views: ViewTab[];
  activeId: string;
  /** Where the list lives, e.g. `/projects`. */
  basePath: string;
  /** Which API owns these views, e.g. `/api/project-views`. */
  endpoint: string;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setMenu(null);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menu]);

  function open(id: string) {
    router.push(`${basePath}?view=${id}`);
  }

  async function add(duplicateOf?: string) {
    setBusy(true);
    const { data, error } = await api<{ view: { id: string } }>(endpoint, {
      method: 'POST',
      body: duplicateOf ? { duplicateOf } : {},
    });
    setBusy(false);
    setMenu(null);
    if (error || !data) return;
    router.refresh();
    router.push(`${basePath}?view=${data.view.id}`);
  }

  async function rename(id: string) {
    const name = draft.trim();
    setRenaming(null);
    if (!name) return;
    setBusy(true);
    await api(`${endpoint}/${id}`, { method: 'PATCH', body: { name } });
    setBusy(false);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    const { error } = await api(`${endpoint}/${id}`, { method: 'DELETE' });
    setBusy(false);
    setMenu(null);
    if (error) return;
    const fallback = views.find((view) => view.isDefault) ?? views[0];
    router.refresh();
    router.push(`${basePath}?view=${fallback.id}`);
  }

  return (
    <div ref={wrapper} className="border-line mt-6 flex items-center gap-6 border-b">
      {views.map((view) => {
        const active = view.id === activeId;

        return (
          <div key={view.id} className="relative flex items-center gap-1">
            {renaming === view.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => void rename(view.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void rename(view.id);
                  if (event.key === 'Escape') setRenaming(null);
                }}
                aria-label="View name"
                className="border-accent mb-3 w-32 border-b bg-transparent font-semibold outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => open(view.id)}
                aria-current={active ? 'page' : undefined}
                className={`-mb-px flex items-center gap-2 border-b-2 pb-3 transition-colors ${
                  active
                    ? 'border-accent font-semibold'
                    : 'text-muted hover:text-foreground border-transparent'
                }`}
              >
                {view.isDefault && (
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" />
                  </svg>
                )}
                {view.name}
              </button>
            )}

            {active && renaming !== view.id && (
              <button
                type="button"
                onClick={() => setMenu(menu === view.id ? null : view.id)}
                aria-label={`${view.name} options`}
                aria-expanded={menu === view.id}
                className="text-muted hover:bg-accent-soft/70 mb-3 rounded px-1 leading-none"
              >
                ⋮
              </button>
            )}

            {menu === view.id && (
              <div
                role="menu"
                className="bg-surface absolute top-full left-0 z-40 mt-1 w-52 overflow-hidden rounded-xl py-1.5 shadow-2xl ring-1 ring-black/10"
              >
                <Item
                  label="Rename"
                  disabled={view.isDefault}
                  hint={view.isDefault ? 'This view cannot be renamed' : undefined}
                  onClick={() => {
                    setDraft(view.name);
                    setRenaming(view.id);
                    setMenu(null);
                  }}
                  icon={<path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />}
                />
                <Item
                  label="Duplicate"
                  disabled={busy}
                  onClick={() => void add(view.id)}
                  icon={
                    <>
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V5h10" />
                    </>
                  }
                />
                <Item
                  label="Delete"
                  danger
                  disabled={view.isDefault || busy}
                  hint={view.isDefault ? 'This view cannot be deleted' : undefined}
                  onClick={() => void remove(view.id)}
                  icon={<path d="M4 7h16M10 7V5h4v2M6 7l1 13h10l1-13" />}
                />
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => void add()}
        disabled={busy}
        aria-label="Add a view"
        className="text-muted hover:text-foreground pb-3 text-xl leading-none"
      >
        +
      </button>
    </div>
  );
}

function Item({
  label,
  icon,
  onClick,
  disabled,
  danger,
  hint,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Why it cannot be pressed, in the dark tooltip rather than the browser's. */
  hint?: string;
}) {
  const button = (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`hover:bg-accent-soft/60 flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors disabled:pointer-events-auto disabled:opacity-40 ${
        danger ? 'text-accent' : ''
      }`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon}
      </svg>
      {label}
    </button>
  );

  return hint ? (
    <Tip label={hint} side="right">
      {button}
    </Tip>
  ) : (
    button
  );
}
