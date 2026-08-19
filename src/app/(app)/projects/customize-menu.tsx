'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { StagesDialog, type StageDraft } from './stages-dialog';
import { CARD_PROPERTIES, TABLE_COLUMNS, type ViewPrefs } from '@/lib/board-prefs';

export function CustomizeMenu({ stages, view }: { stages: StageDraft[]; view: ViewPrefs }) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<'stages' | 'properties' | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && panel !== 'properties') return;
    function onPointerDown(event: MouseEvent) {
      if (wrapper.current?.contains(event.target as Node)) return;
      setOpen(false);
      setPanel((current) => (current === 'properties' ? null : current));
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, panel]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => {
          setPanel(null);
          setOpen((value) => !value);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`hover:bg-accent-soft/70 flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          open ? 'bg-accent-soft/70' : ''
        }`}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M4 7h3M11 7h9M4 12h9M17 12h3M4 17h3M11 17h9" />
          <path d="M9 5v4M15 10v4M9 15v4" />
        </svg>
        Customize
      </button>

      {open && (
        <div
          role="menu"
          className="bg-surface absolute top-full right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl py-1.5 shadow-2xl ring-1 ring-black/10"
        >
          <MenuItem
            label="Edit pipeline stages"
            icon={<path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />}
            onClick={() => {
              setPanel('stages');
              setOpen(false);
            }}
          />
          <MenuItem
            label={view.layout === 'LIST' ? 'Table column visibility' : 'Card property visibility'}
            icon={
              <>
                <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6" />
                <circle cx="12" cy="12" r="2.6" />
              </>
            }
            onClick={() => {
              setPanel('properties');
              setOpen(false);
            }}
          />
        </div>
      )}

      {panel === 'stages' && (
        <StagesDialog initial={stages} view={view} onClose={() => setPanel(null)} />
      )}
      {panel === 'properties' && <PropertiesPanel view={view} />}
    </div>
  );
}

function MenuItem({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="hover:bg-accent-soft/60 flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors"
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
}

/**
 * A panel, not a dialog: every tick saves onto the view straight away, so
 * there is nothing to confirm and no Save button to forget.
 */
function PropertiesPanel({ view }: { view: ViewPrefs }) {
  const router = useRouter();
  const list = view.layout === 'LIST';
  const properties = list ? TABLE_COLUMNS : CARD_PROPERTIES;
  const [hidden, setHidden] = useState<string[]>(view.hiddenProps);
  const [showGroups, setShowGroups] = useState(view.showGroups);

  async function persist(body: { hiddenProps?: string[]; showGroups?: boolean }) {
    await api(`/api/project-views/${view.id}`, { method: 'PATCH', body });
    router.refresh();
  }

  function toggle(key: string) {
    const next = hidden.includes(key) ? hidden.filter((item) => item !== key) : [...hidden, key];
    setHidden(next);
    void persist({ hiddenProps: next });
  }

  return (
    <div className="bg-surface absolute top-full right-0 z-40 mt-2 max-h-[380px] w-64 overflow-y-auto rounded-xl py-2 shadow-2xl ring-1 ring-black/10">
      <p className="px-4 pt-1 pb-2 text-[15px] font-medium">
        {list ? 'Table column visibility' : 'Card property visibility'}
      </p>

      {list && <Toggle label="Name" checked locked onChange={() => {}} />}

      {properties.map((property) => (
        <Toggle
          key={property.key}
          label={property.label}
          checked={!hidden.includes(property.key)}
          onChange={() => toggle(property.key)}
        />
      ))}

      {!list && (
        <Toggle
          label="Group chips"
          checked={showGroups}
          onChange={(next) => {
            setShowGroups(next);
            void persist({ showGroups: next });
          }}
        />
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  locked,
  onChange,
}: {
  label: string;
  checked: boolean;
  locked?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      title={locked ? 'This column always shows' : undefined}
      className={`flex h-11 items-center gap-3 px-4 text-[15px] ${
        locked ? 'text-muted cursor-default' : 'hover:bg-accent-soft/50'
      }`}
    >
      <input
        type="checkbox"
        className="accent-foreground h-[18px] w-[18px]"
        checked={checked}
        disabled={locked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
