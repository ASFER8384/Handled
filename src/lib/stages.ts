import type { StageGroup } from '@/generated/prisma/enums';

/**
 * The pipeline every new workspace starts with. Stages are data, not an enum,
 * so this is a starting point rather than the set of possibilities.
 */
export const DEFAULT_STAGES: {
  name: string;
  group: StageGroup;
  position: number;
  hidden?: boolean;
}[] = [
  { name: 'New', group: 'OPPORTUNITY', position: 0 },
  { name: 'Discovery', group: 'OPPORTUNITY', position: 1 },
  { name: 'Proposal', group: 'OPPORTUNITY', position: 2 },
  { name: 'Contract signed', group: 'OPPORTUNITY', position: 3 },
  { name: 'Kick off', group: 'PROJECT', position: 4 },
  { name: 'Planning', group: 'PROJECT', position: 5 },
  { name: 'Delivery', group: 'PROJECT', position: 6 },
  { name: 'Complete', group: 'PROJECT', position: 7 },
  { name: 'Archived', group: 'PROJECT', position: 8, hidden: true },
];

export const STAGE_GROUPS: {
  group: StageGroup;
  label: string;
  tint: string;
  chip: string;
  /** The outline around the group's stages in the pipeline editor. */
  outline: string;
}[] = [
  {
    group: 'OPPORTUNITY',
    label: 'Opportunities',
    tint: 'bg-brand-sky',
    chip: 'bg-brand-sky/40 text-brand-ink',
    outline: 'border-brand-sky',
  },
  {
    group: 'PROJECT',
    label: 'Projects',
    tint: 'bg-brand-sage',
    chip: 'bg-brand-sage/50 text-brand-ink',
    outline: 'border-brand-sage',
  },
];

/** What new workspaces can pick from. A workspace's own types join this list. */
export const PROJECT_TYPES = [
  'Corporate',
  'Event',
  'Other',
  'Party',
  'Permanent Makeup',
  'Photoshoot',
  'Wedding',
];
