'use client';

import { Dialog } from 'primereact/dialog';
import type { ReactNode } from 'react';

const WIDTHS = {
  sm: '28rem',
  md: '34rem',
  lg: '44rem',
} as const;

export interface FormDialogProps {
  visible: boolean;
  onHide: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** dialog width — sm ≈ 1 col, md ≈ 1–2 cols, lg ≈ 2 cols */
  size?: keyof typeof WIDTHS;
  /** footer content (submit / cancel). Keep the Formik submit button inside
      `children` and its `<Form>`, or give the button `form="<id>"`. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * The one modal for short forms (≤ 4 fields). Longer forms get a dedicated
 * route via <FormPage> — see ADMIN_UI_CONSISTENCY.md.
 */
export default function FormDialog({
  visible,
  onHide,
  title,
  subtitle,
  size = 'md',
  footer,
  children,
}: FormDialogProps) {
  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      modal
      dismissableMask
      draggable={false}
      resizable={false}
      blockScroll
      className="ls-form-dialog"
      style={{ width: WIDTHS[size], maxWidth: '95vw' }}
      contentClassName="ls-form-dialog-body"
      header={
        <div>
          <span className="text-lg font-semibold text-content dark:text-white">
            {title}
          </span>
          {subtitle && (
            <p className="mt-0.5 text-xs font-normal text-content-muted">
              {subtitle}
            </p>
          )}
        </div>
      }
      footer={footer}
    >
      {children}
    </Dialog>
  );
}
