'use client';

import { Dialog } from 'primereact/dialog';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const ActionTarget = createContext<HTMLDivElement | null>(null);

/** Keeps Formik context while moving actions outside the scrolling body.
 * Submit buttons must reference their form with the HTML form attribute. */
export function FormDialogActions({ children }: { children: ReactNode }) {
  const target = useContext(ActionTarget);
  return target ? createPortal(children, target) : null;
}

const WIDTHS = {
  sm: '28rem',
  md: '34rem',
  lg: '44rem',
  xl: '65rem',
} as const;

export interface FormDialogProps {
  visible: boolean;
  className?: string;
  /** Legacy caller option. Form dialogs are always centered. */
  position?: 'left' | 'right' | 'top' | 'bottom';
  onHide: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** dialog width — sm ≈ 1 col, md ≈ 1–2 cols, lg ≈ 2 cols */
  size?: keyof typeof WIDTHS;
  /** footer content (submit / cancel). Keep the Formik submit button inside
      `children` and its `<Form>`, or give the button `form="<id>"`. */
  footer?: ReactNode;
  children: ReactNode;
  portalActions?: boolean;
}

/** Shared centered form surface, including compact and multi-step editors. */
export default function FormDialog({
  visible,
  onHide,
  title,
  subtitle,
  size = 'md',
  footer,
  children,
  className = '',
  portalActions = false,
}: FormDialogProps) {
  const [actionTarget, setActionTarget] = useState<HTMLDivElement | null>(null);
  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      modal
      dismissableMask={false}
      draggable={false}
      resizable={false}
      blockScroll
      className={`ls-form-dialog admin-form-dialog ${className}`}
      style={{ width: WIDTHS[size], maxWidth: 'calc(100vw - 24px)' }}
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
      footer={
        portalActions ? (
          <div ref={setActionTarget} className="admin-dialog-action-target" />
        ) : (
          footer
        )
      }
    >
      <ActionTarget.Provider value={actionTarget}>
        {children}
      </ActionTarget.Provider>
    </Dialog>
  );
}
