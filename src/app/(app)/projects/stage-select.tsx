'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';

export function StageSelect({
  id,
  stageId,
  stages,
}: {
  id: string;
  stageId: string | null;
  stages: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Optimistic so the row doesn't flicker back while the round trip runs.
  const [value, setValue] = useState(stageId ?? '');

  return (
    <select
      aria-label="Project stage"
      className="input w-40 py-1.5 text-sm"
      value={value}
      disabled={pending}
      onChange={(event) => {
        const next = event.target.value;
        const previous = value;
        setValue(next);
        startTransition(async () => {
          const { error } = await api(`/api/projects/${id}`, {
            method: 'PATCH',
            body: { stageId: next },
          });
          if (error) setValue(previous);
          else router.refresh();
        });
      }}
    >
      {value === '' && <option value="">No stage</option>}
      {stages.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  );
}
