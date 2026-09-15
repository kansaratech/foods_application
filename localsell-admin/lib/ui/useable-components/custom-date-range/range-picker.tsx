'use client';
import { useEffect, useId, useState } from 'react';
import { Calendar, dateString, dateValue } from '../date-input/calendar';
import FieldShell from '../form/field-shell';
import './range-picker.css';

type Props = {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  label?: string;
  showLabel?: boolean;
  placeholder?: string;
  allowClear?: boolean;
};

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  label = 'Date range',
  showLabel = true,
  placeholder = 'Select date range',
  allowClear = false,
}: Props) {
  const id = useId();
  const [draft, setDraft] = useState<(Date | null)[]>([
    dateValue(startDate),
    dateValue(endDate),
  ]);
  useEffect(() => {
    setDraft([dateValue(startDate), dateValue(endDate)]);
  }, [startDate, endDate]);
  return (
    <FieldShell
      htmlFor={id}
      label={label}
      showLabel={showLabel}
      className="shared-date-range"
    >
      <Calendar
        inputId={id}
        ariaLabel={label}
        value={draft[0] ? draft : null}
        selectionMode="range"
        placeholder={placeholder}
        hideOnRangeSelection
        showButtonBar={allowClear}
        onChange={(event) => {
          const next = (event.value ?? []) as (Date | null)[];
          setDraft(next);
          if (next[0] && next[1])
            onChange(dateString(next[0]), dateString(next[1]));
          else if (!next[0] && allowClear) onChange('', '');
        }}
        onHide={() => setDraft([dateValue(startDate), dateValue(endDate)])}
      />
    </FieldShell>
  );
}
