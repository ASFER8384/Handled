'use client';

import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Select, type SelectOption } from '@/components/select';

/**
 * The same dropdown, bound to a react-hook-form field. `register` only works
 * on real inputs, so a custom control has to be driven through Controller.
 */
export function FormSelect<T extends FieldValues>({
  control,
  name,
  options,
  id,
  placeholder,
  ariaLabel,
  className,
  required,
  searchable,
}: {
  control: Control<T>;
  name: Path<T>;
  options: SelectOption[];
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  /** Message shown when nothing is picked, matching the other fields. */
  required?: string;
  searchable?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      rules={required ? { required } : undefined}
      render={({ field }) => (
        <Select
          id={id}
          className={className}
          placeholder={placeholder}
          ariaLabel={ariaLabel}
          searchable={searchable}
          options={options}
          value={(field.value as string) || null}
          onChange={field.onChange}
        />
      )}
    />
  );
}
