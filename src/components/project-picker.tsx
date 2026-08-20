'use client';

import { Select } from '@/components/select';

export type ProjectOption = { id: string; name: string };

/**
 * What a picked project is: one that exists, one to be opened under a typed
 * name, or nothing at all. Kept as a value rather than a loose string so the
 * caller never has to guess whether a name means an existing project — the
 * mistake that quietly opens a second project with the same name.
 */
export type ProjectChoice =
  | { kind: 'none' }
  | { kind: 'existing'; id: string; name: string }
  | { kind: 'new'; name: string };

/**
 * Type to search your projects. A name that matches nothing offers to open a
 * project under it, and nothing is offered at all until the list has arrived.
 */
export function ProjectPicker({
  id,
  value,
  projects,
  placeholder = 'Type to search',
  onChange,
}: {
  id: string;
  value: ProjectChoice;
  /** Null while they are still being fetched. */
  projects: ProjectOption[] | null;
  placeholder?: string;
  onChange: (choice: ProjectChoice) => void;
}) {
  // A project waiting to be opened is offered back as a row of its own, so the
  // field can show what was typed before anything has been created.
  const options = [
    ...(projects ?? []).map((project) => ({ value: project.id, label: project.name })),
    ...(value.kind === 'new' ? [{ value: `new:${value.name}`, label: value.name }] : []),
  ];

  return (
    <Select
      id={id}
      value={value.kind === 'none' ? null : value.kind === 'new' ? `new:${value.name}` : value.id}
      options={options}
      placeholder={projects === null ? 'Loading your projects…' : placeholder}
      disabled={projects === null}
      searchable
      createLabel={(typed) => `Create project ‘${typed}’`}
      onCreate={(typed) => onChange({ kind: 'new', name: typed })}
      onChange={(picked) => {
        const project = (projects ?? []).find((entry) => entry.id === picked);
        onChange(
          project ? { kind: 'existing', id: project.id, name: project.name } : { kind: 'none' },
        );
      }}
    />
  );
}
