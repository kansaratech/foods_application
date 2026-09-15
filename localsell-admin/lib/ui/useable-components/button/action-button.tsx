import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
};

/** Native action API for legacy forms; shares the PrimeReact button tokens. */
export default function ActionButton({
  variant = 'primary',
  type,
  className = '',
  ...props
}: Props) {
  return (
    <button
      {...props}
      type={type}
      className={`ls-action ls-action-${variant} ${className}`}
    />
  );
}
