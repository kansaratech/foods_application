'use client';

// Interfaces
import { IPhoneTextFieldProps } from '@/lib/utils/interfaces';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

// Hooks
import { useState } from 'react';

// Components & Skeletons
import InputSkeleton from '../custom-skeletons/inputfield.skeleton';

export default function CustomPhoneTextField({
  className,
  style,
  showLabel,
  placeholder = '',
  isLoading = false,
  value,
  onChange,
  defaultCountry = 'au',
  name,
  error,
}: IPhoneTextFieldProps) {
  const [, setPhone] = useState('');

  const handlePhoneInputChange = (phone: string) => {
    setPhone(phone);
    onChange?.(phone);
  };

  const errorId = error ? `${name ?? 'phone'}-error` : undefined;
  const borderColor = error ? '#ef4444' : (style?.borderColor as string) || '#d1d5db';

  return !isLoading ? (
    <div className="relative flex w-full flex-col justify-center gap-y-1">
      {showLabel && (
        <label htmlFor={name ?? 'phone'} className="text-sm font-[500]">
          {placeholder}
        </label>
      )}
      {/* Themed through react-international-phone's own CSS custom properties
          instead of inline-overriding just the number input — that's what was
          making the country selector and the number box read as two
          disconnected inputs (mismatched height/border/radius between them). */}
      <PhoneInput
        defaultCountry={defaultCountry}
        value={value ?? ''}
        onChange={handlePhoneInputChange}
        name={name}
        inputProps={{
          id: name ?? 'phone',
          'aria-invalid': !!error,
          'aria-describedby': errorId,
        }}
        className={`w-full ${className ?? ''}`}
        inputClassName="min-w-0 flex-1"
        style={
          {
            '--react-international-phone-height': '40px',
            '--react-international-phone-border-radius': '8px',
            '--react-international-phone-border-color': borderColor,
            '--react-international-phone-font-size': '14px',
          } as React.CSSProperties
        }
      />
      {error && <p id={errorId} className="text-sm text-red-500">{error}</p>}
    </div>
  ) : (
    <InputSkeleton />
  );
}
