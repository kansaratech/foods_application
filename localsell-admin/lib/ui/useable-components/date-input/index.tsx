import { IDateTextField } from '@/lib/utils/interfaces';
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
  const id = name ?? 'date-input';
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
        type="date"
        className={twMerge('ls-field', error && 'ls-field-invalid', className)}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </FieldShell>
  );
};

export default CustomDateInput;
