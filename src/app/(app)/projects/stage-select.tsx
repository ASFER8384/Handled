'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectStage } from '@/generated/prisma/enums';
import { projectStages } from '@/lib/validation';
import { STAGE_LABELS } from '@/components/ui';
import { api } from '@/lib/client-fetch';

export function StageSelect({ id, stage }: { id: string; stage: ProjectStage }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Optimistic so the board doesn't flicker back while the round trip runs.
  const [value, setValue] = useState<ProjectStage>(stage);

  return (
    <select
      aria-label="Project stage"
      className="input w-40 py-1.5 text-sm"
      value={value}
      disabled={pending}
      onChange={(event) => {
        const next = event.target.value as ProjectStage;
        const previous = value;
        setValue(next);
        startTransition(async () => {
          const { error } = await api(`/api/projects/${id}`, {
            method: 'PATCH',
            body: { stage: next },
          });
          if (error) setValue(previous);
          else router.refresh();
        });
      }}
    >
      {projectStages.map((option) => (
        <option key={option} value={option}>
          {STAGE_LABELS[option]}
        </option>
      ))}
    </select>
  );
}
