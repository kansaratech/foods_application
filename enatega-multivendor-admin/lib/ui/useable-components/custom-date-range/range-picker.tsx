'use client';
import { useEffect, useId, useState } from 'react';
import { Calendar } from 'primereact/calendar';
import './range-picker.css';

type Props = {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
};
const parse = (value: string) => (value ? new Date(`${value}T00:00:00`) : null);
const format = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
}: Props) {
  const id = useId();
  const [draft, setDraft] = useState<(Date | null)[]>([
    parse(startDate),
    parse(endDate),
  ]);
  useEffect(() => {
    setDraft([parse(startDate), parse(endDate)]);
  }, [startDate, endDate]);
  return (
    <div className="shared-date-range">
      <label htmlFor={id}>Date range</label>
      <Calendar
        inputId={id}
        value={draft}
        selectionMode="range"
        readOnlyInput
        showIcon
        dateFormat="dd M yy"
        placeholder="Select date range"
        panelClassName="shared-date-range-panel"
        hideOnRangeSelection
        onChange={(event) => {
          const next = (event.value ?? []) as (Date | null)[];
          setDraft(next);
          if (next[0] && next[1]) onChange(format(next[0]), format(next[1]));
        }}
        onHide={() => setDraft([parse(startDate), parse(endDate)])}
      />
    </div>
  );
}
