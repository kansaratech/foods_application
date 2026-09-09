import type { FocusEvent } from 'react';
import { IPasswordTextFieldProps } from '@/lib/utils/interfaces';
import { Password } from 'primereact/password';
import { twMerge } from 'tailwind-merge';
import { useTranslations } from 'next-intl';

import FieldShell from '../form/field-shell';
import PasswordFeedback from './password-feedback';

export default function CustomPasswordTextField({
  className,
  placeholder,
  showLabel,
  feedback = true,
  isLoading = false,
  name,
  error,
  ...props
}: IPasswordTextFieldProps & { name?: string; error?: string }) {
  const t = useTranslations();

  // Trim trailing whitespace on blur, but only when it actually changes the
  // value, and re-emit a change event that still carries `name`/`id` — the old
  // `{...e.target}` spread dropped those, so Formik couldn't map the change back
  // to the field and password/confirm-password drifted out of sync (#60).
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const trimmed = e.target.value.trim();
    if (trimmed !== e.target.value && props.onChange) {
      props.onChange({
        ...e,
        target: Object.assign(e.target, { name: name ?? e.target.name, value: trimmed }),
        currentTarget: e.currentTarget,
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
    props.onBlur?.(e);
  };

  return (
    <FieldShell
      htmlFor={name}
      label={placeholder}
      showLabel={showLabel}
      error={error}
      isLoading={isLoading}
    >
      <Password
        inputId={name}
        className={twMerge(
          'ls-field icon-right',
          error && 'ls-field-invalid',
          className
        )}
        placeholder={placeholder}
        toggleMask
        promptLabel={t('enter_password.enter_a_password')}
        weakLabel={t('enter_password.weak')}
        strongLabel={t('enter_password.strong')}
        mediumLabel={t('enter_password.medium')}
        strongRegex="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$"
        feedback={feedback}
        footer={feedback ? <PasswordFeedback /> : null}
        aria-invalid={!!error}
        {...props}
        onBlur={handleBlur}
      />
    </FieldShell>
  );
}
