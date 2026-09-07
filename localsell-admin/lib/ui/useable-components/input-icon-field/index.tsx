'use client';

// Interfaces
import { IIconTextFieldProps } from '@/lib/utils/interfaces';

// Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Prime React
import { InputText } from 'primereact/inputtext';
import { twMerge } from 'tailwind-merge';

import FieldShell from '../form/field-shell';

export default function CustomIconTextField({
  className,
  iconProperties,
  placeholder,
  showLabel,
  isLoading = false,
  name,
  error,
  ...props
}: IIconTextFieldProps) {
  const { icon, position, style } = iconProperties;
  const isLeft = position === 'left';

  return (
    <FieldShell
      htmlFor={name}
      label={placeholder}
      showLabel={showLabel}
      error={error}
      isLoading={isLoading}
    >
      <div className="relative flex items-center">
        <span
          aria-hidden
          style={style}
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-content-muted ${
            isLeft ? 'left-3' : 'right-3'
          }`}
        >
          <FontAwesomeIcon icon={icon} />
        </span>
        <InputText
          id={name}
          name={name}
          className={twMerge(
            'ls-field',
            isLeft ? 'pl-9' : 'pr-9',
            error && 'ls-field-invalid',
            className
          )}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          {...props}
        />
      </div>
    </FieldShell>
  );
}
