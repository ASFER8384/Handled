'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { STAGE_LABELS } from '@/components/ui';
import { ACTION_LABELS, TRIGGER_LABELS } from '@/lib/automation-labels';
import { automationActions, automationTriggers, projectStages } from '@/lib/validation';
import type { ProjectStage } from '@/generated/prisma/enums';

type Step = {
  action: (typeof automationActions)[number];
  delayMinutes: number;
  subject: string;
  body: string;
  targetStage: ProjectStage;
};

type Draft = {
  name: string;
  trigger: (typeof automationTriggers)[number];
  triggerStage: ProjectStage;
  status: 'ACTIVE' | 'INACTIVE';
  steps: Step[];
};

const BLANK_STEP: Step = {
  action: 'CREATE_TASK',
  delayMinutes: 0,
  subject: '',
  body: '',
  targetStage: 'BOOKED',
};

/** Delays are entered in days but stored in minutes, so a 0 is testable. */
const DELAY_CHOICES = [
  { label: 'Immediately', minutes: 0 },
  { label: 'After 1 hour', minutes: 60 },
  { label: 'After 1 day', minutes: 1440 },
  { label: 'After 2 days', minutes: 2880 },
  { label: 'After 3 days', minutes: 4320 },
  { label: 'After 1 week', minutes: 10080 },
];

export function AutomationBuilder({
  id,
  initial,
  locked,
}: {
  id: string;
  initial: Draft;
  locked: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  }

  function updateStep(index: number, patch: Partial<Step>) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    }));
    setSaved(false);
  }

  function moveStep(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= draft.steps.length) return;
    const steps = [...draft.steps];
    [steps[index], steps[target]] = [steps[target], steps[index]];
    update({ steps });
  }

  async function save() {
    setSaving(true);
    setError(null);
    const { error: failure } = await api(`/api/automations/${id}`, {
      method: 'PATCH',
      body: {
        name: draft.name,
        trigger: draft.trigger,
        triggerStage: draft.trigger === 'PROJECT_STAGE_CHANGED' ? draft.triggerStage : undefined,
        status: draft.status,
        steps: draft.steps.map((step) => ({
          action: step.action,
          delayMinutes: step.delayMinutes,
          subject: step.action === 'MOVE_STAGE' ? undefined : step.subject,
          body: step.action === 'SEND_EMAIL' ? step.body : undefined,
          targetStage: step.action === 'MOVE_STAGE' ? step.targetStage : undefined,
        })),
      },
    });
    setSaving(false);
    if (failure) {
      setError(failure.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <fieldset disabled={locked} className="space-y-4 disabled:opacity-60">
        {/* --- trigger ------------------------------------------------- */}
        <div className="card p-5">
          <p className="text-accent text-xs font-semibold tracking-widest uppercase">When</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select
              aria-label="Trigger"
              className="input"
              value={draft.trigger}
              onChange={(event) => update({ trigger: event.target.value as Draft['trigger'] })}
            >
              {automationTriggers.map((value) => (
                <option key={value} value={value}>
                  {TRIGGER_LABELS[value]}
                </option>
              ))}
            </select>

            {draft.trigger === 'PROJECT_STAGE_CHANGED' && (
              <select
                aria-label="Trigger stage"
                className="input"
                value={draft.triggerStage}
                onChange={(event) => update({ triggerStage: event.target.value as ProjectStage })}
              >
                {projectStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* --- steps ---------------------------------------------------- */}
        {draft.steps.map((step, index) => (
          <div key={index} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-accent text-xs font-semibold tracking-widest uppercase">
                Step {index + 1}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveStep(index, -1)}
                  aria-label={`Move step ${index + 1} up`}
                  className="text-muted hover:bg-accent-soft rounded px-2 py-0.5 text-sm"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, 1)}
                  aria-label={`Move step ${index + 1} down`}
                  className="text-muted hover:bg-accent-soft rounded px-2 py-0.5 text-sm"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() =>
                    update({ steps: draft.steps.filter((_, i) => i !== index) })
                  }
                  aria-label={`Remove step ${index + 1}`}
                  className="rounded px-2 py-0.5 text-sm text-red-700 hover:bg-red-50"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <select
                aria-label={`Step ${index + 1} timing`}
                className="input"
                value={step.delayMinutes}
                onChange={(event) =>
                  updateStep(index, { delayMinutes: Number(event.target.value) })
                }
              >
                {DELAY_CHOICES.map((choice) => (
                  <option key={choice.minutes} value={choice.minutes}>
                    {choice.label}
                  </option>
                ))}
              </select>

              <select
                aria-label={`Step ${index + 1} action`}
                className="input"
                value={step.action}
                onChange={(event) =>
                  updateStep(index, { action: event.target.value as Step['action'] })
                }
              >
                {automationActions.map((action) => (
                  <option key={action} value={action}>
                    {ACTION_LABELS[action]}
                  </option>
                ))}
              </select>
            </div>

            {step.action === 'MOVE_STAGE' ? (
              <select
                aria-label={`Step ${index + 1} target stage`}
                className="input mt-3"
                value={step.targetStage}
                onChange={(event) =>
                  updateStep(index, { targetStage: event.target.value as ProjectStage })
                }
              >
                {projectStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label={`Step ${index + 1} ${step.action === 'SEND_EMAIL' ? 'subject' : 'task title'}`}
                className="input mt-3"
                placeholder={step.action === 'SEND_EMAIL' ? 'Subject' : 'Task title'}
                value={step.subject}
                onChange={(event) => updateStep(index, { subject: event.target.value })}
              />
            )}

            {step.action === 'SEND_EMAIL' && (
              <textarea
                aria-label={`Step ${index + 1} body`}
                className="input mt-3 h-24"
                placeholder="Body — recorded on the run timeline until delivery is wired up."
                value={step.body}
                onChange={(event) => updateStep(index, { body: event.target.value })}
              />
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => update({ steps: [...draft.steps, { ...BLANK_STEP }] })}
          className="btn-ghost w-full"
        >
          + Add step
        </button>
      </fieldset>

      {/* --- save panel ------------------------------------------------- */}
      <aside>
        <div className="card space-y-3 p-5">
          <div>
            <label className="label" htmlFor="builder-name">
              Name
            </label>
            <input
              id="builder-name"
              className="input"
              value={draft.name}
              disabled={locked}
              onChange={(event) => update({ name: event.target.value })}
            />
          </div>

          <div>
            <label className="label" htmlFor="builder-status">
              Status
            </label>
            <select
              id="builder-status"
              className="input"
              value={draft.status}
              onChange={(event) => update({ status: event.target.value as Draft['status'] })}
            >
              <option value="INACTIVE">Inactive</option>
              <option value="ACTIVE">Active</option>
            </select>
            <p className="text-muted mt-1 text-xs">
              Changes apply to runs started from now on, never to ones already going.
            </p>
          </div>

          {error && <p className="field-error">{error}</p>}
          {saved && <p className="text-xs text-emerald-700">Saved.</p>}

          <button
            type="button"
            onClick={save}
            disabled={saving || locked}
            className="btn-primary w-full"
          >
            {saving ? 'Saving…' : 'Save automation'}
          </button>
        </div>
      </aside>
    </div>
  );
}
