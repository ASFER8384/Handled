'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';

export function TaskRow({
  id,
  title,
  done,
  meta,
}: {
  id: string;
  title: string;
  done: boolean;
  meta: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [checked, setChecked] = useState(done);

  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <input
        type="checkbox"
        checked={checked}
        aria-label={`Mark "${title}" done`}
        className="accent-accent size-4"
        onChange={(event) => {
          const next = event.target.checked;
          setChecked(next);
          startTransition(async () => {
            const { error } = await api(`/api/tasks/${id}`, {
              method: 'PATCH',
              body: { done: next },
            });
            if (error) setChecked(!next);
            else router.refresh();
          });
        }}
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate ${checked ? 'text-muted line-through' : ''}`}>{title}</p>
        {meta && <p className="text-muted truncate text-xs">{meta}</p>}
      </div>
      <button
        type="button"
        className="text-muted text-sm hover:text-red-700"
        onClick={() => {
          startTransition(async () => {
            await api(`/api/tasks/${id}`, { method: 'DELETE' });
            router.refresh();
          });
        }}
      >
        Delete
      </button>
    </li>
  );
}
