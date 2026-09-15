'use client';
import { ICustomNumberTippingProps } from '@/lib/utils/interfaces';
import { InputText } from 'primereact/inputtext';
import FieldShell from '../form/field-shell';
export default function CustomCommissionTextField({
  className,
  placeholder,
  name,
  value,
  onChange,
  showLabel,
  loading,
  ...props
}: ICustomNumberTippingProps) {
  return (
    <FieldShell
      htmlFor={name}
      label={placeholder}
      showLabel={showLabel}
      isLoading={loading}
    >
      <InputText
        id={name}
        aria-label={placeholder || 'Commission rate (%)'}
        className={`ls-field ${className ?? ''}`}
        name={name}
        value={value}
        onChange={onChange}
        {...props}
        type="number"
        min={0}
        max={100}
        step="0.01"
      />
    </FieldShell>
  );
}
