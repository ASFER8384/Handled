'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/client-fetch';
import { STAGE_LABELS } from '@/components/ui';
import { automationTriggers, projectStages } from '@/lib/validation';
import { TRIGGER_LABELS } from '@/lib/automation-labels';

type Values = { name: string; trigger: (typeof automationTriggers)[number]; triggerStage: string };

export function NewAutomationForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  // Tracked in local state rather than react-hook-form's watch(), which the
  // React Compiler cannot memoize safely.
  const [trigger, setTrigger] = useState<Values['trigger']>('PROJECT_CREATED');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues: { trigger: 'PROJECT_CREATED', triggerStage: 'BOOKED' } });

  async function onSubmit(values: Values) {
    setFormError(null);
    const { data, error } = await api<{ automation: { id: string } }>('/api/automations', {
      method: 'POST',
      body: {
        name: values.name,
        trigger: values.trigger,
        triggerStage: values.trigger === 'PROJECT_STAGE_CHANGED' ? values.triggerStage : undefined,
        steps: [],
      },
    });
    if (error) {
      setFormError(error.error);
      return;
    }
    // Straight into the builder — an automation with no steps does nothing.
    router.push(`/automations/${data.automation.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3" noValidate>
      <div>
        <label className="label" htmlFor="automation-name">
          Name
        </label>
        <input
          id="automation-name"
          className="input"
          placeholder="New enquiry follow-up"
          {...register('name', { required: 'Name this automation' })}
        />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>

      <div>
        <label className="label" htmlFor="automation-trigger">
          When
        </label>
        <select
          id="automation-trigger"
          className="input"
          {...register('trigger', {
            onChange: (event) => setTrigger(event.target.value as Values['trigger']),
          })}
        >
          {automationTriggers.map((value) => (
            <option key={value} value={value}>
              {TRIGGER_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      {trigger === 'PROJECT_STAGE_CHANGED' && (
        <div>
          <label className="label" htmlFor="automation-stage">
            Stage
          </label>
          <select id="automation-stage" className="input" {...register('triggerStage')}>
            {projectStages.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
        </div>
      )}

      {formError && <p className="field-error">{formError}</p>}

      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create and add steps'}
      </button>
    </form>
  );
}
