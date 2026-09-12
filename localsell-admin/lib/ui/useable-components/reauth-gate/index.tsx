'use client';

import { useContext, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Dialog } from 'primereact/dialog';
import { useTranslations } from 'next-intl';

import { VERIFY_MY_PASSWORD } from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import CustomButton from '@/lib/ui/useable-components/button';

interface ReauthGateProps {
  open: boolean;
  title?: string;
  description?: string;
  onVerified: () => void;
  onCancel: () => void;
}

/**
 * Blocks a sensitive action (e.g. editing a store) until the signed-in admin
 * re-enters their own password. Verified server-side via `verifyMyPassword`.
 */
export default function ReauthGate({
  open,
  title,
  description,
  onVerified,
  onCancel,
}: ReauthGateProps) {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);
  const [password, setPassword] = useState('');

  const [verify, { loading }] = useMutation(VERIFY_MY_PASSWORD, {
    onCompleted: (data) => {
      if (data?.verifyMyPassword) {
        setPassword('');
        onVerified();
      } else {
        showToast({
          type: 'error',
          title: t('Confirm your password'),
          message: t('incorrect_password_please_try_again'),
        });
      }
    },
    onError: () => {
      showToast({
        type: 'error',
        title: t('Confirm your password'),
        message: t('incorrect_password_please_try_again'),
      });
    },
  });

  const submit = () => {
    if (!password || loading) return;
    verify({ variables: { password } });
  };

  return (
    <Dialog
      visible={open}
      onHide={onCancel}
      header={title ?? t('Confirm your password')}
      className="w-[92%] max-w-sm"
      draggable={false}
      dismissableMask={false}
    >
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-300">
        {description ??
          t('for_security_reenter_your_password_to_make_this')}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('Password')}
          className="mb-4 h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary-color dark:border-dark-600 dark:bg-dark-950 dark:text-white"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-md border border-gray-300 px-4 text-sm text-slate-700 dark:border-dark-600 dark:text-white"
          >
            {t('Cancel')}
          </button>
          <CustomButton
            type="submit"
            label={t('Confirm')}
            loading={loading}
            className="h-9 bg-primary-color px-5 text-sm text-white"
          />
        </div>
      </form>
    </Dialog>
  );
}
