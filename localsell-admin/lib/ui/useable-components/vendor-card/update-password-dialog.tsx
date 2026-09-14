'use client';

// Hooks
import { useContext, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';

// Prime React
import { Dialog } from 'primereact/dialog';

// GraphQL
import { CREATE_VENDOR } from '@/lib/api/graphql';

// Components
import CustomButton from '../button';
import CustomPasswordTextField from '../password-input-field';

// Context
import { ToastContext } from '@/lib/context/global/toast.context';

// Methods
import { getGraphQLErrorMessage } from '@/lib/utils/methods/error';

interface IUpdateVendorPasswordDialogProps {
  visible: boolean;
  onHide: () => void;
  vendorId: string;
  vendorEmail: string;
}

// Mirrors the strength rule enforced on vendor creation (see
// vendorAccountStepSchema in lib/utils/schema/vendor.ts) so an admin-set
// password is never weaker than one the vendor could have chosen themselves.
const passwordStrengthTest = (value: string) =>
  value.length >= 6 &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /[0-9]/.test(value) &&
  /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value);

export default function UpdateVendorPasswordDialog({
  visible,
  onHide,
  vendorId,
  vendorEmail,
}: IUpdateVendorPasswordDialogProps) {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [createVendor, { loading }] = useMutation(CREATE_VENDOR);

  const reset = () => {
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleHide = () => {
    reset();
    onHide();
  };

  const handleSubmit = async () => {
    // Left untranslated, matching how the same validation text is shown raw
    // (no t()) everywhere else it's used — see fieldError() in the vendor
    // registration wizard's account-step.
    if (!passwordStrengthTest(password)) {
      setError('At least 6 characters, one lowercase, one uppercase, one number, and one special character');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password must match');
      return;
    }
    setError(null);
    try {
      // _id + the vendor's own (unchanged) email tells createVendor this is an
      // update, not a new vendor; every other field is omitted so it's left
      // untouched — see the resolver's Prisma update, which treats an
      // undefined field as "don't touch" rather than "clear it".
      await createVendor({ variables: { vendorInput: { _id: vendorId, email: vendorEmail, password } } });
      showToast({
        type: 'success',
        title: t('Update Password'),
        message: t('Vendor password updated successfully'),
      });
      handleHide();
    } catch (err) {
      showToast({
        type: 'error',
        title: t('Update Password'),
        message: getGraphQLErrorMessage(err as Error) ?? t('Failed to update password'),
      });
    }
  };

  const footer = (
    <div className="space-x-2 dark:bg-dark-950 dark:text-white">
      <CustomButton
        label={t('Cancel')}
        onClick={handleHide}
        className="h-9 rounded border border-gray-300 bg-transparent px-5 dark:border-dark-600 dark:text-white"
      />
      <CustomButton
        loading={loading}
        label={t('Update Password')}
        className="h-9 rounded bg-primary-color px-4 text-white"
        onClick={handleSubmit}
      />
    </div>
  );

  return (
    <Dialog
      className="dark:border dark:border-dark-600 dark:bg-dark-950 dark:text-white"
      headerClassName="dark:bg-dark-950 dark:text-white"
      contentClassName="dark:bg-dark-950 dark:text-white"
      visible={visible}
      style={{ width: '28rem' }}
      breakpoints={{ '960px': '75vw', '641px': '90vw' }}
      header={t('Update Password')}
      modal
      onHide={handleHide}
      footer={footer}
    >
      <div className="flex flex-col gap-4">
        <CustomPasswordTextField
          autoComplete="new-password"
          placeholder={`${t('New password')} *`}
          name="newPassword"
          maxLength={30}
          showLabel
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(null);
          }}
        />
        <CustomPasswordTextField
          autoComplete="new-password"
          placeholder={`${t('Confirm new password')} *`}
          name="confirmNewPassword"
          maxLength={30}
          showLabel
          feedback={false}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (error) setError(null);
          }}
        />
        {error && <small className="p-error -mt-2">{error}</small>}
      </div>
    </Dialog>
  );
}
