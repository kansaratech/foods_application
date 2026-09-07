import { ICustomTextAreaField } from '@/lib/utils/interfaces/custom-text-area.interface';
import { InputTextarea } from 'primereact/inputtextarea';
import { twMerge } from 'tailwind-merge';
import FieldShell from '../form/field-shell';

export default function CustomTextAreaField({
  label,
  className,
  placeholder,
  showLabel,
  value,
  name,
  error,
  onChange,
  rows = 3,
  maxLength,
  ...props
}: ICustomTextAreaField) {
  return (
    <FieldShell
      htmlFor={name ?? 'text-area'}
      label={label}
      showLabel={showLabel}
      error={error}
    >
      <InputTextarea
        id={name}
        name={name}
        value={value}
        className={twMerge('ls-field', error && 'ls-field-invalid', className)}
        placeholder={placeholder}
        onChange={onChange}
        maxLength={maxLength}
        rows={rows}
        aria-invalid={!!error}
        {...props}
      />
    </FieldShell>
  );
}
