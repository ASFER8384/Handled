'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { FormSelect } from '@/components/form-select';
import { api } from '@/lib/client-fetch';

type Values = { title: string; projectId: string; dueAt: string };

export function TaskForm({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>();

  async function onSubmit(values: Values) {
    setFormError(null);
    const { error } = await api('/api/tasks', {
      method: 'POST',
      body: { title: values.title, projectId: values.projectId || undefined, dueAt: values.dueAt },
    });
    if (error) {
      setFormError(error.error);
      return;
    }
    reset({ title: '', projectId: values.projectId, dueAt: '' });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3" noValidate>
      <div>
        <label className="label" htmlFor="task-title">
          Task
        </label>
        <input
          id="task-title"
          className="input"
          {...register('title', { required: 'What needs doing?' })}
        />
        {errors.title && <p className="field-error">{errors.title.message}</p>}
      </div>

      <div>
        <label className="label" htmlFor="task-project">
          Project
        </label>
        <FormSelect
          id="task-project"
          control={control}
          name="projectId"
          placeholder="No project"
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
        />
      </div>

      <div>
        <label className="label" htmlFor="task-due">
          Due
        </label>
        <input id="task-due" type="date" className="input" {...register('dueAt')} />
      </div>

      {formError && <p className="field-error">{formError}</p>}

      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Adding…' : 'Add task'}
      </button>
    </form>
  );
}
