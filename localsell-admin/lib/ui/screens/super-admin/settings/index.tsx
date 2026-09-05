'use client';

import { useContext, useState } from 'react';
import { useMutation, useApolloClient } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { CHANGE_MY_PASSWORD } from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import { useUserContext } from '@/lib/hooks/useUser';
import CustomButton from '@/lib/ui/useable-components/button';
import CustomPasswordTextField from '@/lib/ui/useable-components/password-input-field';
import { clearStoredSessionState } from '@/lib/utils/methods/auth';

export default function SettingsScreen() {
  const t = useTranslations();
  const router = useRouter();
  const apolloClient = useApolloClient();
  const { showToast } = useContext(ToastContext);
  const { user, setUser } = useUserContext();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [changePassword] = useMutation(CHANGE_MY_PASSWORD);

  const onSubmit = async () => {
    if (!oldPassword || !newPassword) {
      showToast({ type: 'error', title: t('Settings'), message: t('Please fill in all fields'), duration: 2500 });
      return;
    }
    if (newPassword.length < 8) {
      showToast({ type: 'error', title: t('Settings'), message: t('New password must be at least 8 characters'), duration: 2500 });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast({ type: 'error', title: t('Settings'), message: t('Passwords do not match'), duration: 2500 });
      return;
    }

    setSubmitting(true);
    try {
      await changePassword({ variables: { oldPassword, newPassword } });
      showToast({
        type: 'success',
        title: t('Settings'),
        message: t('Password changed - please sign in again'),
        duration: 2500,
      });
      setUser(null);
      clearStoredSessionState();
      await apolloClient.clearStore();
      router.replace('/authentication/login');
    } catch (err) {
      const message =
        (err as { message?: string })?.message || t('Could not change password - please try again');
      showToast({ type: 'error', title: t('Settings'), message, duration: 3000 });
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-white dark:bg-dark-950 min-h-full">
      <h1 className="text-xl font-semibold mb-1">{t('Settings')}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('Manage your account')}</p>

      <div className="max-w-xl space-y-6">
        <section className="rounded-lg border border-gray-200 dark:border-dark-600 p-4">
          <h2 className="text-sm font-semibold mb-3">{t('Account')}</h2>
          <dl className="grid grid-cols-3 gap-y-2 text-sm">
            <dt className="text-gray-500">{t('Email')}</dt>
            <dd className="col-span-2">{user?.email || '—'}</dd>
            <dt className="text-gray-500">{t('Name')}</dt>
            <dd className="col-span-2">{user?.name || '—'}</dd>
            <dt className="text-gray-500">{t('Role')}</dt>
            <dd className="col-span-2">{user?.userType || '—'}</dd>
          </dl>
        </section>

        <section className="rounded-lg border border-gray-200 dark:border-dark-600 p-4">
          <h2 className="text-sm font-semibold mb-1">{t('Change password')}</h2>
          <p className="text-xs text-gray-500 mb-4">
            {t('Changing your password signs you out of all other devices')}
          </p>

          <div className="space-y-3">
            <CustomPasswordTextField
              showLabel
              feedback={false}
              placeholder={t('Current password')}
              name="oldPassword"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
            <CustomPasswordTextField
              showLabel
              placeholder={t('New password')}
              name="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <CustomPasswordTextField
              showLabel
              feedback={false}
              placeholder={t('Confirm new password')}
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <CustomButton
            className="mt-4 bg-black text-white px-4 py-2 rounded"
            label={submitting ? t('Saving') : t('Change password')}
            type="button"
            disabled={submitting}
            onClick={onSubmit}
          />
        </section>
      </div>
    </div>
  );
}
