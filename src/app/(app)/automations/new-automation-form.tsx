'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { FormSelect } from '@/components/form-select';
import { Select } from '@/components/select';
import { api } from '@/lib/client-fetch';
import { automationTriggers } from '@/lib/validation';
import { TRIGGER_LABELS } from '@/lib/automation-labels';

type Values = {
  name: string;
  trigger: (typeof automationTriggers)[number];
  triggerStageId: string;
};

export function NewAutomationForm({ stages }: { stages: { id: string; name: string }[] }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  // Tracked in local state rather than react-hook-form's watch(), which the
  // React Compiler cannot memoize safely.
  const [trigger, setTrigger] = useState<Values['trigger']>('PROJECT_CREATED');
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: { trigger: 'PROJECT_CREATED', triggerStageId: stages[0]?.id ?? '' },
  });

  async function onSubmit(values: Values) {
    setFormError(null);
    const { data, error } = await api<{ automation: { id: string } }>('/api/automations', {
      method: 'POST',
      body: {
        name: values.name,
        trigger: values.trigger,
        triggerStageId:
          values.trigger === 'PROJECT_STAGE_CHANGED' ? values.triggerStageId : undefined,
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
        <Controller
          control={control}
          name="trigger"
          render={({ field }) => (
            <Select
              id="automation-trigger"
              value={field.value}
              options={automationTriggers.map((value) => ({
                value,
                label: TRIGGER_LABELS[value],
              }))}
              onChange={(picked) => {
                field.onChange(picked);
                setTrigger(picked as Values['trigger']);
              }}
            />
          )}
        />
      </div>

      {trigger === 'PROJECT_STAGE_CHANGED' && (
        <div>
          <label className="label" htmlFor="automation-stage">
            Stage
          </label>
          <FormSelect
            id="automation-stage"
            control={control}
            name="triggerStageId"
            options={stages.map((stage) => ({ value: stage.id, label: stage.name }))}
          />
        </div>
      )}

      {formError && <p className="field-error">{formError}</p>}

      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create and add steps'}
      </button>
    </form>
  );
}
