import type { ReactNode } from 'react';
import InputSkeleton from '../custom-skeletons/inputfield.skeleton';

/**
 * The shared shell every form field renders: optional label, the control,
 * and an error / help line. Every field wrapper in this folder uses it so
 * spacing, label style and error style are identical app-wide.
 *
 * The control itself is styled by `.ls-field` (app/form-controls.css) — pass
 * `ls-field` on the PrimeReact/native control, not bespoke height/border classes.
 */
export interface FieldShellProps {
  /** id of the control, used for the label's `htmlFor` and `${id}-error` */
  htmlFor?: string;
  label?: ReactNode;
  /** show the label above the control (kept for back-compat with `showLabel`) */
  showLabel?: boolean;
  required?: boolean;
  error?: string;
  help?: ReactNode;
  isLoading?: boolean;
  /** extra classes on the outer wrapper */
  className?: string;
  children: ReactNode;
}

export default function FieldShell({
  htmlFor,
  label,
  showLabel = true,
  required = false,
  error,
  help,
  isLoading = false,
  className,
  children,
}: FieldShellProps) {
  if (isLoading) return <InputSkeleton />;

  return (
    <div className={`flex w-full flex-col gap-y-1 ${className ?? ''}`}>
      {showLabel && label != null && label !== '' && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-content dark:text-white"
        >
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          className="text-xs text-red-500"
        >
          {error}
        </p>
      ) : help ? (
        <p className="text-xs text-content-muted">{help}</p>
      ) : null}
    </div>
  );
}
