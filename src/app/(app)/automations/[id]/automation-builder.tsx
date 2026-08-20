'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { Select } from '@/components/select';
import { ACTION_LABELS, TRIGGER_LABELS } from '@/lib/automation-labels';
import { automationActions, automationTriggers } from '@/lib/validation';

export type StageOption = { id: string; name: string };

type Step = {
  action: (typeof automationActions)[number];
  delayMinutes: number;
  subject: string;
  body: string;
  targetStageId: string;
};

type Draft = {
  name: string;
  trigger: (typeof automationTriggers)[number];
  triggerStageId: string;
  status: 'ACTIVE' | 'INACTIVE';
  steps: Step[];
};

const BLANK_STEP: Step = {
  action: 'CREATE_TASK',
  delayMinutes: 0,
  subject: '',
  body: '',
  targetStageId: '',
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
  stages,
}: {
  id: string;
  initial: Draft;
  locked: boolean;
  stages: StageOption[];
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
        triggerStageId:
          draft.trigger === 'PROJECT_STAGE_CHANGED' ? draft.triggerStageId : undefined,
        status: draft.status,
        steps: draft.steps.map((step) => ({
          action: step.action,
          delayMinutes: step.delayMinutes,
          subject: step.action === 'MOVE_STAGE' ? undefined : step.subject,
          body: step.action === 'SEND_EMAIL' ? step.body : undefined,
          targetStageId: step.action === 'MOVE_STAGE' ? step.targetStageId : undefined,
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
            <Select
              ariaLabel="Trigger"
              value={draft.trigger}
              options={automationTriggers.map((value) => ({
                value,
                label: TRIGGER_LABELS[value],
              }))}
              onChange={(picked) => update({ trigger: picked as Draft['trigger'] })}
            />

            {draft.trigger === 'PROJECT_STAGE_CHANGED' && (
              <Select
                ariaLabel="Trigger stage"
                value={draft.triggerStageId}
                options={stages.map((stage) => ({ value: stage.id, label: stage.name }))}
                onChange={(triggerStageId) => update({ triggerStageId })}
              />
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
              <Select
                ariaLabel={`Step ${index + 1} timing`}
                value={String(step.delayMinutes)}
                options={DELAY_CHOICES.map((choice) => ({
                  value: String(choice.minutes),
                  label: choice.label,
                }))}
                onChange={(minutes) => updateStep(index, { delayMinutes: Number(minutes) })}
              />

              <Select
                ariaLabel={`Step ${index + 1} action`}
                value={step.action}
                options={automationActions.map((action) => ({
                  value: action,
                  label: ACTION_LABELS[action],
                }))}
                onChange={(picked) => updateStep(index, { action: picked as Step['action'] })}
              />
            </div>

            {step.action === 'MOVE_STAGE' ? (
              <Select
                ariaLabel={`Step ${index + 1} target stage`}
                className="mt-3"
                value={step.targetStageId}
                options={stages.map((stage) => ({ value: stage.id, label: stage.name }))}
                onChange={(targetStageId) => updateStep(index, { targetStageId })}
              />
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
                placeholder="Body, recorded on the run timeline until delivery is wired up."
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
            <Select
              id="builder-status"
              value={draft.status}
              options={[
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'ACTIVE', label: 'Active' },
              ]}
              onChange={(picked) => update({ status: picked as Draft['status'] })}
            />
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
