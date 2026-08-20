'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { api } from '@/lib/client-fetch';
import { Select } from '@/components/select';
import { EyeIcon, EyeOffIcon, TrashIcon } from './editor-kit';

export type FieldType = 'TEXT' | 'LONG_TEXT' | 'DATE' | 'NUMBER' | 'LINK' | 'SELECT';

export type CustomField = {
  id: string;
  name: string;
  type: FieldType;
  options: string[];
  visibleToClient: boolean;
};

const TYPES: { value: FieldType; label: string }[] = [
  { value: 'TEXT', label: 'Text' },
  { value: 'LONG_TEXT', label: 'Long text' },
  { value: 'DATE', label: 'Date' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'LINK', label: 'Link' },
  { value: 'SELECT', label: 'Single select' },
];

/** The fields every project answers: the built-in ones, and your own. */
const BUILT_IN = [
  { name: 'Project name', kind: 'Text field' },
  { name: 'Project type', kind: 'Single select' },
  { name: 'Date', kind: 'Date field' },
  { name: 'Location', kind: 'Text field' },
  { name: 'Description', kind: 'Text field' },
];

export function ManageFieldsDialog({
  fields,
  onClose,
}: {
  fields: CustomField[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(fields);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setRows((now) => now.filter((field) => field.id !== id));
    await api(`/api/custom-fields/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  async function toggle(field: CustomField) {
    const visibleToClient = !field.visibleToClient;
    setRows((now) =>
      now.map((entry) => (entry.id === field.id ? { ...entry, visibleToClient } : entry)),
    );
    await api(`/api/custom-fields/${field.id}`, { method: 'PATCH', body: { visibleToClient } });
    router.refresh();
  }

  const shown = rows.filter((field) => field.visibleToClient);
  const hidden = rows.filter((field) => !field.visibleToClient);

  return (
    <Dialog
      title="Manage project fields"
      onClose={onClose}
      width={620}
      footer={
        <button type="button" onClick={onClose} className="btn-primary px-5">
          Done
        </button>
      }
    >
      <p className="text-muted">
        Project details are kept in fields, and can be used in templates, emails and files.
      </p>

      <button
        type="button"
        onClick={() => setAdding(true)}
        className="text-accent mt-4 flex items-center gap-2 font-medium hover:underline"
      >
        <span aria-hidden className="text-lg leading-none">
          +
        </span>
        Add custom field
      </button>

      <Group icon={<EyeIcon className="h-4 w-4" />} label="Visible to clients">
        {BUILT_IN.map((field) => (
          <Row key={field.name} name={field.name} kind={field.kind} />
        ))}
        {shown.map((field) => (
          <Row
            key={field.id}
            name={field.name}
            kind={TYPES.find((type) => type.value === field.type)?.label ?? 'Text'}
            onHide={() => void toggle(field)}
            onRemove={() => void remove(field.id)}
          />
        ))}
      </Group>

      <Group icon={<EyeOffIcon className="h-4 w-4" />} label="Not visible to clients">
        {hidden.length === 0 ? (
          <p className="text-muted text-sm">Fields kept back here are only ever visible to you.</p>
        ) : (
          hidden.map((field) => (
            <Row
              key={field.id}
              name={field.name}
              kind={TYPES.find((type) => type.value === field.type)?.label ?? 'Text'}
              onShow={() => void toggle(field)}
              onRemove={() => void remove(field.id)}
            />
          ))
        )}
      </Group>

      {error && <p className="field-error mt-3">{error}</p>}

      {adding && (
        <AddFieldDialog
          onClose={() => setAdding(false)}
          onAdded={(field) => {
            setRows((now) => [...now, field]);
            setAdding(false);
            router.refresh();
          }}
          onFailed={setError}
        />
      )}
    </Dialog>
  );
}

function Group({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h3 className="text-muted flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
        {icon}
        {label}
      </h3>
      <div className="mt-3 space-y-2.5">{children}</div>
    </section>
  );
}

function Row({
  name,
  kind,
  onHide,
  onShow,
  onRemove,
}: {
  name: string;
  kind: string;
  onHide?: () => void;
  onShow?: () => void;
  onRemove?: () => void;
}) {
  const built = !onRemove;
  return (
    <div className="border-line flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-muted text-xs">{kind}</p>
      </div>

      {built ? (
        <span className="text-muted">
          <LockIcon className="h-4 w-4" />
        </span>
      ) : (
        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={onHide ?? onShow}
            aria-label={onHide ? `Hide ${name} from clients` : `Show ${name} to clients`}
            className="text-muted hover:text-foreground transition-colors"
          >
            {onHide ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Delete ${name}`}
            className="text-muted hover:text-accent transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </span>
      )}
    </div>
  );
}

function AddFieldDialog({
  onClose,
  onAdded,
  onFailed,
}: {
  onClose: () => void;
  onAdded: (field: CustomField) => void;
  onFailed: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FieldType>('TEXT');
  const [options, setOptions] = useState('');
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const { data, error } = await api<{ field: CustomField }>('/api/custom-fields', {
      method: 'POST',
      body: {
        name,
        type,
        visibleToClient: visible,
        options:
          type === 'SELECT'
            ? options
                .split(',')
                .map((option) => option.trim())
                .filter(Boolean)
            : [],
      },
    });
    setBusy(false);
    if (error || !data) {
      onFailed(error?.error ?? 'Could not add that field');
      return;
    }
    onAdded(data.field);
  }

  return (
    <Dialog
      title="Add custom field"
      onClose={onClose}
      width={480}
      footer={
        <div className="flex w-full items-center justify-between">
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={visible}
              onChange={(event) => setVisible(event.target.checked)}
              className="accent-brand-ink h-[18px] w-[18px]"
            />
            Visible to clients
          </label>
          <span className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void add()}
              disabled={busy || !name.trim()}
              className="btn-primary px-5 disabled:opacity-40"
            >
              {busy ? 'Adding…' : 'Add'}
            </button>
          </span>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <label className="label" htmlFor="field-name">
            Field name <span aria-hidden>*</span>
          </label>
          <input
            id="field-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Add field name"
            className="input-soft"
          />
        </div>

        <div>
          <label className="label" htmlFor="field-type">
            Field type <span aria-hidden>*</span>
          </label>
          <Select
            id="field-type"
            value={type}
            options={TYPES.map((option) => ({ value: option.value, label: option.label }))}
            onChange={(picked) => setType(picked as FieldType)}
          />
          <p className="text-muted mt-1.5 text-xs">
            The type is fixed once the field exists, so answers already given stay readable.
          </p>
        </div>

        {type === 'SELECT' && (
          <div>
            <label className="label" htmlFor="field-options">
              Choices
            </label>
            <input
              id="field-options"
              value={options}
              onChange={(event) => setOptions(event.target.value)}
              placeholder="Bronze, Silver, Gold"
              className="input-soft"
            />
            <p className="text-muted mt-1.5 text-xs">Separate each choice with a comma.</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
