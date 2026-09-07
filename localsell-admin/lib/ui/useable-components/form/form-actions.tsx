'use client';

import { Button } from 'primereact/button';
import { useTranslations } from 'next-intl';

export interface FormActionsProps {
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  /** align the row; forms in a dialog footer pass `end` (default) */
  align?: 'end' | 'between';
}

/**
 * The one Cancel / Save row for every form. Kill ad-hoc
 * `<button className="bg-black …">` submit buttons.
 */
export default function FormActions({
  onCancel,
  cancelLabel,
  submitLabel,
  loading = false,
  disabled = false,
  align = 'end',
}: FormActionsProps) {
  const t = useTranslations();
  return (
    <div
      className={`mt-2 flex items-center gap-2 ${
        align === 'between' ? 'justify-between' : 'justify-end'
      }`}
    >
      {onCancel && (
        <Button
          type="button"
          label={cancelLabel ?? t('Cancel')}
          onClick={onCancel}
          outlined
          className="ls-btn"
        />
      )}
      <Button
        type="submit"
        label={submitLabel ?? t('Save')}
        loading={loading}
        disabled={disabled}
        className="ls-btn"
      />
    </div>
  );
}
