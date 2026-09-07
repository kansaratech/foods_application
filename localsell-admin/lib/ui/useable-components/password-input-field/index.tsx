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
        onBlur={(e) => {
          props.onChange?.({
            ...e,
            target: { ...e.target, value: e.target.value.trim() },
          });
        }}
      />
    </FieldShell>
  );
}
