'use client';

// Hooks
import { useContext, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';

// Prime React
import { Dialog } from 'primereact/dialog';

// GraphQL
import { EDIT_RESTAURANT } from '@/lib/api/graphql';

// Components
import CustomButton from '../button';
import CustomPasswordTextField from '../password-input-field';

// Context
import { ToastContext } from '@/lib/context/global/toast.context';

// Methods
import { getGraphQLErrorMessage } from '@/lib/utils/methods/error';

interface IUpdateRestaurantPasswordDialogProps {
  visible: boolean;
  onHide: () => void;
  restaurantId: string;
}

// Mirrors the strength rule enforced on store creation (see makeRestaurantSchema
// in lib/utils/schema/restaurant.ts) so an admin-set password is never weaker
// than one typed through the create-store form.
const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/;

export default function UpdateRestaurantPasswordDialog({
  visible,
  onHide,
  restaurantId,
}: IUpdateRestaurantPasswordDialogProps) {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [editRestaurant, { loading }] = useMutation(EDIT_RESTAURANT);

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
    if (!strongPasswordRegex.test(password)) {
      setError('Password must be at least 6 characters and include an uppercase letter, a lowercase letter, a number and a special character');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords must match');
      return;
    }
    setError(null);
    try {
      // Only _id + password are sent — every other field is omitted, and
      // editRestaurant's resolver treats an undefined field as "don't touch"
      // (see restaurant.resolvers.ts), so nothing else on the store changes.
      await editRestaurant({ variables: { restaurantInput: { _id: restaurantId, password } } });
      showToast({
        type: 'success',
        title: t('Update Password'),
        message: t('Store password updated successfully'),
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
