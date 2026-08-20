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
  /** An empty id means the kind is settled but the project is not picked yet. */
  | { kind: 'existing'; id: string; name: string }
  | { kind: 'new'; name: string };

/** A choice with everything it needs — what the callers actually act on. */
export type ChosenProject =
  { kind: 'existing'; id: string; name: string } | { kind: 'new'; name: string };

/** Whether a choice is finished enough to act on, and narrows it if it is. */
export function projectChosen(choice: ProjectChoice): choice is ChosenProject {
  if (choice.kind === 'existing') return choice.id !== '';
  if (choice.kind === 'new') return choice.name.trim() !== '';
  return false;
}

/**
 * Which project a contact goes on, asked the same way wherever it is asked.
 *
 * The two answers do different things, and the difference is the one people
 * trip over: a project opened here is opened *for* them, so they are its
 * client and cannot be taken off it again; a project they join already has a
 * client, so they are simply on it and can leave. That is said in words under
 * the field rather than left to be discovered from a padlock afterwards.
 *
 * It is a choice rather than a guess at what was typed. Inferring it is how a
 * name close to an existing project quietly opens a second one beside it.
 */
export function ProjectChoiceFields({
  prefix,
  value,
  onChange,
  projects,
  /** Projects they are already on, which cannot be picked twice. */
  exclude = [],
  /** Offers "No project" as well, for a contact who need not be on one. */
  optional,
  contactName,
}: {
  prefix: string;
  value: ProjectChoice;
  onChange: (choice: ProjectChoice) => void;
  /** Null while they are still being fetched. */
  projects: ProjectOption[] | null;
  exclude?: string[];
  optional?: boolean;
  /** Named in the explanations where there is a name to use. */
  contactName?: string;
}) {
  const them = contactName ?? 'this contact';
  const open = (projects ?? []).filter((project) => !exclude.includes(project.id));

  const modes: { kind: ProjectChoice['kind']; label: string }[] = [
    ...(optional ? [{ kind: 'none' as const, label: 'No project' }] : []),
    { kind: 'new', label: 'New project' },
    { kind: 'existing', label: 'Existing project' },
  ];

  function pick(kind: ProjectChoice['kind']) {
    if (kind === value.kind) return;
    if (kind === 'new') onChange({ kind: 'new', name: '' });
    else if (kind === 'existing') onChange({ kind: 'existing', id: '', name: '' });
    else onChange({ kind: 'none' });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
        {modes.map((mode) => (
          <label key={mode.kind} className="flex items-center gap-2.5 text-sm">
            <input
              type="radio"
              name={`${prefix}-project-mode`}
              checked={value.kind === mode.kind}
              onChange={() => pick(mode.kind)}
              className="accent-brand-ink h-[18px] w-[18px]"
            />
            {mode.label}
          </label>
        ))}
      </div>

      {value.kind === 'new' && (
        <div className="mt-4">
          <label className="sr-only" htmlFor={`${prefix}-project-name`}>
            Project name
          </label>
          <input
            id={`${prefix}-project-name`}
            value={value.name}
            maxLength={140}
            onChange={(event) => onChange({ kind: 'new', name: event.target.value })}
            placeholder="Project name"
            className="input-soft"
          />
          <p className="text-muted mt-1.5 text-sm">
            A new project, opened for {them}. They will be its client, which cannot be undone from
            the contact — a project is always for somebody.
          </p>
        </div>
      )}

      {value.kind === 'existing' && (
        <div className="mt-4">
          <Select
            id={`${prefix}-project-existing`}
            ariaLabel="Existing project"
            placeholder={projects === null ? 'Loading your projects…' : 'Pick a project'}
            disabled={projects === null}
            searchable
            value={value.id || null}
            options={open.map((project) => ({ value: project.id, label: project.name }))}
            onChange={(id) => {
              const project = open.find((entry) => entry.id === id);
              onChange(
                project ? { kind: 'existing', ...project } : { kind: 'existing', id: '', name: '' },
              );
            }}
          />
          <p className="text-muted mt-1.5 text-sm">
            {projects === null
              ? 'Fetching what you have open.'
              : open.length === 0
                ? `${them} is already on every project you have.`
                : 'It already has a client, so they join it alongside them — and can be taken off again.'}
          </p>
        </div>
      )}

      {value.kind === 'none' && optional && (
        <p className="text-muted mt-4 text-sm">
          Saved to your contacts and nothing more. A project can be added whenever the work turns
          up.
        </p>
      )}
    </div>
  );
}
