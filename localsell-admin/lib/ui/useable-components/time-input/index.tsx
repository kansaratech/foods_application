import { ITimeTextField } from '@/lib/utils/interfaces';
import { twMerge } from 'tailwind-merge';
import FieldShell from '../form/field-shell';

const CustomTimeInput = ({
  className,
  placeholder,
  showLabel,
  isLoading = false,
  value,
  name,
  error,
  onChange,
  ...props
}: ITimeTextField & { name?: string; error?: string }) => {
  const id = name ?? 'time-input';
  return (
    <FieldShell
      htmlFor={id}
      label={placeholder}
      showLabel={showLabel}
      error={error}
      isLoading={isLoading}
    >
      <input
        id={id}
        name={name}
        type="time"
        className={twMerge('ls-field', error && 'ls-field-invalid', className)}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </FieldShell>
  );
};

export default CustomTimeInput;
