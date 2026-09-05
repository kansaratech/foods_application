'use client';

import { useFormikContext } from 'formik';
import { Checkbox } from 'primereact/checkbox';
import { useTranslations } from 'next-intl';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';

import CustomTextField from '@/lib/ui/useable-components/input-field';
import CustomIconTextField from '@/lib/ui/useable-components/input-icon-field';
import CustomPhoneTextField from '@/lib/ui/useable-components/phone-input-field';
import CustomPasswordTextField from '@/lib/ui/useable-components/password-input-field';
import ProfilePhotoUpload from '@/lib/ui/useable-components/profile-photo-upload';
import { IVendorRegistrationForm } from '@/lib/utils/interfaces/forms';

export default function AccountStep() {
  const t = useTranslations();
  const { values, errors, touched, handleChange, handleBlur, setFieldValue, setFieldTouched } =
    useFormikContext<IVendorRegistrationForm>();

  const fieldError = (name: keyof IVendorRegistrationForm) =>
    touched[name] && errors[name] ? String(errors[name]) : undefined;

  const onFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    setFieldTouched(e.target.name, true, false);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">{t('Owner details')}</p>
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <CustomTextField
              type="text"
              name="firstName"
              placeholder={`${t('First name')} *`}
              maxLength={50}
              value={values.firstName}
              onChange={onFieldChange}
              onBlur={handleBlur}
              showLabel
              error={fieldError('firstName')}
            />
            <CustomTextField
              type="text"
              name="lastName"
              placeholder={`${t('Last name')} *`}
              maxLength={50}
              value={values.lastName}
              onChange={onFieldChange}
              onBlur={handleBlur}
              showLabel
              error={fieldError('lastName')}
            />
            <CustomIconTextField
              type="email"
              name="email"
              placeholder={`${t('Email address')} *`}
              maxLength={100}
              showLabel
              iconProperties={{ icon: faEnvelope, position: 'right' }}
              value={values.email}
              onChange={(e) => {
                setFieldValue('email', e.target.value.toLowerCase());
                setFieldTouched('email', true, false);
              }}
              onBlur={handleBlur}
              error={fieldError('email')}
            />
            <CustomPhoneTextField
              mask="999-999-9999"
              name="phoneNumber"
              showLabel
              placeholder={`${t('Mobile number')} *`}
              value={values.phoneNumber}
              defaultCountry="in"
              type="text"
              onChange={(val) => {
                setFieldValue('phoneNumber', val);
                setFieldTouched('phoneNumber', true, false);
              }}
              error={fieldError('phoneNumber')}
            />
          </div>

          {/* Sits to the right of the name/email/phone fields on desktop,
              stacks below them on mobile. */}
          <div className="md:w-40 md:flex-shrink-0">
            <ProfilePhotoUpload
              value={values.image}
              onUploaded={(url) => {
                setFieldValue('image', url);
                setFieldTouched('image', true, false);
              }}
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-dark-600" />

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{t('Account access')}</p>
        <div className="flex items-start gap-2">
          <Checkbox
            inputId="sendSetupLink"
            checked={values.sendSetupLink}
            onChange={(e) => {
              setFieldValue('sendSetupLink', !!e.checked);
              setFieldTouched('sendSetupLink', true, false);
            }}
          />
          <div>
            <label htmlFor="sendSetupLink" className="cursor-pointer text-sm font-medium text-slate-900 dark:text-white">
              {t('Send account setup link instead')}
            </label>
            <p className="text-xs text-slate-500">{t('Vendor will receive a secure link to set their password')}</p>
          </div>
        </div>

        {!values.sendSetupLink && (
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <CustomPasswordTextField
              autoComplete="new-password"
              placeholder={`${t('Password')} *`}
              name="password"
              maxLength={30}
              value={values.password}
              showLabel
              onChange={onFieldChange}
              style={{ borderColor: fieldError('password') ? 'red' : '' }}
            />
            <CustomPasswordTextField
              autoComplete="new-password"
              placeholder={`${t('Confirm password')} *`}
              name="confirmPassword"
              maxLength={30}
              showLabel
              value={values.confirmPassword}
              onChange={onFieldChange}
              feedback={false}
              style={{ borderColor: fieldError('confirmPassword') ? 'red' : '' }}
            />
            {fieldError('password') && <small className="p-error -mt-3">{fieldError('password')}</small>}
            {fieldError('confirmPassword') && <small className="p-error -mt-3">{fieldError('confirmPassword')}</small>}
          </div>
        )}
      </div>
    </div>
  );
}
