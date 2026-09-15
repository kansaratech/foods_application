import { IDateTextField } from '@/lib/utils/interfaces';
import { useId } from 'react';
import { Calendar, dateString, dateValue } from './calendar';
import { twMerge } from 'tailwind-merge';
import FieldShell from '../form/field-shell';

const CustomDateInput = ({
  className,
  placeholder,
  showLabel,
  isLoading = false,
  value,
  name,
  error,
  onChange,
  ...props
}: IDateTextField & { name?: string; error?: string }) => {
  const generatedId = useId();
  const id = name ?? generatedId;
  return (
    <FieldShell
      htmlFor={id}
      label={placeholder}
      showLabel={showLabel}
      error={error}
      isLoading={isLoading}
    >
      <Calendar
        inputId={id}
        ariaLabel={placeholder || name || 'Choose date'}
        name={name}
        className={twMerge('ls-field', error && 'ls-field-invalid', className)}
        value={dateValue(value)}
        onChange={(e) => onChange(dateString(e.value as Date | null))}
        {...props}
      />
    </FieldShell>
  );
};

export default CustomDateInput;
