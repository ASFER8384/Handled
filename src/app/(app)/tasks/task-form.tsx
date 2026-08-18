'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/client-fetch';

type Values = { title: string; projectId: string; dueAt: string };

export function TaskForm({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
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
        <select id="task-project" className="input" {...register('projectId')}>
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
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
