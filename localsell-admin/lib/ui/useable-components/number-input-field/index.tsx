// Interfaces
import { INumberTextFieldProps } from '@/lib/utils/interfaces';

// Prime React
import { InputNumber, InputNumberChangeEvent } from 'primereact/inputnumber';
import { twMerge } from 'tailwind-merge';
import FieldShell from '../form/field-shell';

// Hooks
import useToast from '@/lib/hooks/useToast';

export default function CustomNumberField({
  className,
  placeholder,
  name,
  showLabel,
  onChange,
  onChangeFieldValue,
  isLoading = false,
  disabled = false,
  error,
  min,
  max,
  ...props
}: INumberTextFieldProps & { error?: string }) {
  const { showToast } = useToast();

  const onNumberChangeHandler = (e: InputNumberChangeEvent) => {
    if (onChange) onChange(name, e.value);
    else if (onChangeFieldValue) onChangeFieldValue(name, e.value ?? 0);
  };

  return (
    <FieldShell
      htmlFor={name}
      label={placeholder}
      showLabel={showLabel}
      error={error}
      isLoading={isLoading}
    >
      <InputNumber
        inputId={name}
        name={name}
        className={twMerge('ls-field', error && 'ls-field-invalid', className)}
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
        onKeyDown={(e) => {
          if (max !== undefined && Number(e.currentTarget.value) > max) {
            e.preventDefault();
            return showToast({
              type: 'error',
              title: 'Value out of range',
              message: `Please choose a value from ${min ?? 0} to ${max}.`,
            });
          }
          if (e.key === '.' || e.key === 'e' || e.key === '-') e.preventDefault();
        }}
        onChange={onNumberChangeHandler}
        {...props}
      />
    </FieldShell>
  );
}
