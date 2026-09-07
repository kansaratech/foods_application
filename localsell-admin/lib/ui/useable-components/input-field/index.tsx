// Interfaces
import { ITextFieldProps } from '@/lib/utils/interfaces';

// Prime React
import { InputText } from 'primereact/inputtext';
import { twMerge } from 'tailwind-merge';
import FieldShell from '../form/field-shell';

export default function CustomTextField({
  className,
  placeholder,
  showLabel,
  isLoading = false,
  error,
  name,
  ...props
}: ITextFieldProps) {
  return (
    <FieldShell
      htmlFor={name}
      label={placeholder}
      showLabel={showLabel}
      error={error}
      isLoading={isLoading}
    >
      <InputText
        id={name}
        name={name}
        className={twMerge('ls-field', error && 'ls-field-invalid', className)}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
    </FieldShell>
  );
}
