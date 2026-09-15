'use client';

import { Calendar as PrimeCalendar, CalendarProps } from 'primereact/calendar';
import { useId } from 'react';

/** Shared calendar chrome; preserves PrimeReact's single/range value contracts. */
export function Calendar(props: CalendarProps) {
  const id = useId();
  return (
    <PrimeCalendar
      showIcon
      readOnlyInput
      dateFormat="dd M yy"
      {...props}
      inputId={props.inputId ?? id}
      ariaLabel={props.ariaLabel ?? props.placeholder ?? 'Choose date'}
      className={`ls-field ls-calendar ${props.className ?? ''}`}
      panelClassName={`ls-calendar-panel ${props.panelClassName ?? ''}`}
    />
  );
}

export function dateValue(value?: string | null): Date | null {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Calendar dates are local days, not UTC instants. */
export function dateString(date?: Date | null): string {
  return date && !Number.isNaN(date.getTime())
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : '';
}
