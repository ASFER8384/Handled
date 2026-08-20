'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { Select } from '@/components/select';

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
    <Select
      ariaLabel="Project stage"
      className="w-40"
      placeholder="No stage"
      value={value || null}
      disabled={pending}
      options={stages.map((option) => ({ value: option.id, label: option.name }))}
      onChange={(next) => {
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
    />
  );
}
