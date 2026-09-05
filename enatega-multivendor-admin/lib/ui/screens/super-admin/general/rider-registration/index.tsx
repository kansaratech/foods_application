'use client';

// Core
import { useContext, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Formik } from 'formik';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faCircleInfo,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

// Prime React
import styles from './rider-registration.module.css';

// Context
import { ToastContext } from '@/lib/context/global/toast.context';

// GraphQL
import {
  CREATE_RIDER,
  GET_RIDER,
  GET_ZONES,
  SAVE_RIDER_DRAFT,
} from '@/lib/api/graphql';

// Components
import CustomButton from '@/lib/ui/useable-components/button';
import CustomDropdownComponent from '@/lib/ui/useable-components/custom-dropdown';
import CustomTextField from '@/lib/ui/useable-components/input-field';
import CustomIconTextField from '@/lib/ui/useable-components/input-icon-field';
import CustomPasswordTextField from '@/lib/ui/useable-components/password-input-field';
import CustomPhoneTextField from '@/lib/ui/useable-components/phone-input-field';
import ProfilePhotoUpload from '@/lib/ui/useable-components/profile-photo-upload';
import CustomLoader from '@/lib/ui/useable-components/custom-progress-indicator';
import CustomDialog from '@/lib/ui/useable-components/delete-dialog';

// Utilities, constants, interfaces
import { VEHICLE_TYPE } from '@/lib/utils/constants';
import { RiderSchema } from '@/lib/utils/schema/rider';
import { getGraphQLErrorMessage } from '@/lib/utils/methods';
import { IRiderForm } from '@/lib/utils/interfaces/forms';
import { IRiderZonesResponse } from '@/lib/utils/interfaces';
import { ISingleRiderResponse } from '@/lib/utils/interfaces/rider.interface';

const emptyInitialValues: IRiderForm = {
  name: '',
  email: '',
  image: '',
  username: '',
  password: '',
  confirmPassword: '',
  sendSetupLink: true,
  isActive: true,
  zone: null,
  phone: '',
  vehicleType: null,
  vehicleNumber: '',
  employmentType: 'INDEPENDENT',
};

export default function RiderRegistrationScreen() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editRiderId = searchParams.get('id');
  const isEditMode = !!editRiderId;

  const { showToast } = useContext(ToastContext);

  const { data: zonesData } = useQuery<IRiderZonesResponse>(GET_ZONES, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: riderData, loading: riderLoading } = useQuery<{
    rider: ISingleRiderResponse;
  }>(GET_RIDER, {
    variables: { id: editRiderId ?? '' },
    skip: !editRiderId,
    fetchPolicy: 'network-only',
  });

  const resolvedInitialValues = useMemo<IRiderForm | null>(() => {
    if (!isEditMode) return emptyInitialValues;
    if (riderLoading) return null;
    const rider = riderData?.rider;
    if (!rider) return null;

    return {
      _id: rider._id,
      name: rider.name ?? '',
      email: rider.email ?? '',
      image: rider.image ?? '',
      username: rider.username ?? '',
      password: '',
      confirmPassword: '',
      // Editing defaults to leaving the password untouched — createRider
      // never touches an already-ACTIVE rider's password unless one is typed.
      sendSetupLink: false,
      isActive: rider.isActive ?? true,
      zone: rider.zone
        ? { label: rider.zone.title, code: rider.zone._id }
        : null,
      // Stored as bare digits — the phone input expects a +-prefixed value.
      phone: rider.phone ? `+91${rider.phone}` : '',
      vehicleType:
        VEHICLE_TYPE.find((vt) => vt.code === rider.vehicleType) || null,
      vehicleNumber: rider.vehicleDetails?.number ?? '',
      employmentType: rider.employmentType ?? 'INDEPENDENT',
    };
  }, [isEditMode, riderLoading, riderData]);

  const [createRider] = useMutation(CREATE_RIDER);
  const [saveRiderDraft] = useMutation(SAVE_RIDER_DRAFT);

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const buildRiderInput = (values: IRiderForm) => ({
    _id: values._id || undefined,
    name: values.name,
    username: values.username,
    email: values.email || undefined,
    image: values.image || undefined,
    phone: values.phone?.replace(/[^\d]/g, ''),
    zone: values.zone?.code,
    vehicleType: values.vehicleType?.code,
    vehicleNumber: values.vehicleNumber || undefined,
    employmentType: values.employmentType,
    isActive: values.isActive,
    available: true,
    sendSetupLink: values.sendSetupLink,
    ...(!values.sendSetupLink && values.password
      ? { password: values.password }
      : {}),
  });

  const handleSaveDraft = async (values: IRiderForm) => {
    if (!values.name?.trim()) {
      showToast({
        type: 'error',
        title: t('Save as draft'),
        message: t('Full name is required'),
        duration: 3000,
      });
      return;
    }
    try {
      setIsSavingDraft(true);
      await saveRiderDraft({
        variables: { riderInput: buildRiderInput(values) },
      });
      showToast({
        type: 'success',
        title: t('Success'),
        message: t('Rider saved as draft'),
        duration: 3000,
      });
      router.push('/general/riders');
    } catch (error) {
      showToast({
        type: 'error',
        title: t('Error'),
        message:
          getGraphQLErrorMessage(error as Error) ?? t('ActionFailedTryAgain'),
        duration: 3000,
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  if (resolvedInitialValues === null) {
    return (
      <div className="grid h-full min-h-0 place-items-center bg-slate-50 dark:bg-dark-950">
        <CustomLoader size="32px" />
      </div>
    );
  }

  return (
    <div className="rider-registration-form h-full min-h-0 overflow-y-auto bg-slate-50 px-4 py-6 dark:bg-dark-950 sm:px-6 lg:px-10">
      <Formik
        initialValues={resolvedInitialValues}
        validationSchema={RiderSchema}
        enableReinitialize
        onSubmit={async (values, { setSubmitting, setFieldError }) => {
          setSubmitError(null);
          try {
            await createRider({
              variables: { riderInput: buildRiderInput(values) },
            });
            showToast({
              type: 'success',
              title: t('Rider'),
              message: isEditMode ? t('Rider updated') : t('Rider added'),
              duration: 3000,
            });
            if (!isEditMode && values.sendSetupLink) {
              showToast({
                type: 'info',
                title: t('Rider'),
                message: t('Account setup invitation sent'),
                duration: 3000,
              });
            }
            router.push('/general/riders');
          } catch (error) {
            const message =
              getGraphQLErrorMessage(error as Error) ??
              t('ActionFailedTryAgain');
            setSubmitError(message);
            if (/already exists/i.test(message)) {
              setFieldError('username', message);
            }
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          setFieldValue,
          setFieldTouched,
          isSubmitting,
          dirty,
          submitForm,
        }) => {
          const fieldError = (name: keyof IRiderForm) => {
            const err = (errors as Record<string, unknown>)[name];
            return (touched as Record<string, unknown>)[name] && err
              ? String(err)
              : undefined;
          };

          const onFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            handleChange(e);
            setFieldTouched(e.target.name, true, false);
          };

          const exit = () =>
            dirty
              ? setShowDiscardConfirm(true)
              : router.push('/general/riders');

          return (
            <>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <nav
                    className="mb-1 text-sm text-slate-500"
                    aria-label="Breadcrumb"
                  >
                    <Link
                      href="/general/riders"
                      className="font-medium hover:text-[#1c5bc7] hover:underline"
                    >
                      {t('Riders')}
                    </Link>
                    <span className="mx-1.5">/</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {isEditMode ? t('Edit rider') : t('Add rider')}
                    </span>
                  </nav>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    {isEditMode
                      ? t('Edit rider details')
                      : t('Register new rider')}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {isEditMode
                      ? t('Update this delivery partner account')
                      : t('Create a delivery partner account')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={t('Close')}
                    onClick={exit}
                    className="grid h-9 w-9 place-items-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-900"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              </div>

              <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-950">
                <Form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitForm();
                  }}
                >
                  <div className="space-y-6 p-4 sm:p-6 md:p-8">
                    {submitError && (
                      <div
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                      >
                        {submitError}
                      </div>
                    )}

                    {/* Personal details */}
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {t('Personal details')}
                      </p>
                      <p className="mb-4 text-xs text-slate-500">
                        {t('Basic information about the rider.')}
                      </p>
                      <div className="flex flex-col gap-6 md:flex-row">
                        <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                          <CustomTextField
                            type="text"
                            name="name"
                            placeholder={`${t('Full name')} *`}
                            maxLength={35}
                            value={values.name}
                            onChange={onFieldChange}
                            onBlur={handleBlur}
                            showLabel
                            error={fieldError('name')}
                          />
                          <CustomIconTextField
                            type="email"
                            name="email"
                            placeholder={`${t('Email address')} *`}
                            maxLength={100}
                            showLabel
                            iconProperties={{
                              icon: faEnvelope,
                              position: 'right',
                            }}
                            value={values.email}
                            onChange={(e) => {
                              setFieldValue(
                                'email',
                                e.target.value.toLowerCase()
                              );
                              setFieldTouched('email', true, false);
                            }}
                            onBlur={handleBlur}
                            error={fieldError('email')}
                          />
                          <CustomTextField
                            type="text"
                            name="username"
                            placeholder={`${t('Username')} *`}
                            maxLength={35}
                            value={values.username}
                            onChange={onFieldChange}
                            onBlur={handleBlur}
                            showLabel
                            error={fieldError('username')}
                          />
                          <CustomPhoneTextField
                            mask="999-999-9999"
                            type="text"
                            name="phone"
                            showLabel
                            placeholder={`${t('Mobile number')} *`}
                            value={values.phone}
                            defaultCountry="in"
                            onChange={(val: string) => {
                              setFieldValue('phone', val);
                              setFieldTouched('phone', true, false);
                            }}
                            error={fieldError('phone')}
                          />
                        </div>

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

                    {/* Assignment */}
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {t('Assignment')}
                      </p>
                      <p className="mb-4 text-xs text-slate-500">
                        {t('Assign the rider to a zone and vehicle type.')}
                      </p>
                      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                        <CustomDropdownComponent
                          placeholder={`${t('Zone')} *`}
                          options={
                            zonesData?.zones.map((val) => ({
                              label: val.title,
                              code: val._id,
                            })) || []
                          }
                          showLabel
                          name="zone"
                          selectedItem={values.zone}
                          setSelectedItem={setFieldValue}
                          error={fieldError('zone')}
                        />
                        <CustomDropdownComponent
                          placeholder={`${t('Vehicle type')} *`}
                          options={VEHICLE_TYPE}
                          showLabel
                          name="vehicleType"
                          selectedItem={values.vehicleType}
                          setSelectedItem={setFieldValue}
                          error={fieldError('vehicleType')}
                        />
                        <CustomTextField
                          type="text"
                          name="vehicleNumber"
                          placeholder={`${t('Vehicle registration number')} (${t('optional')})`}
                          maxLength={20}
                          value={values.vehicleNumber}
                          onChange={onFieldChange}
                          showLabel
                        />
                        <fieldset className="min-w-0">
                          <legend className="mb-2 text-sm font-medium dark:text-white">
                            {t('Employment type')} *
                          </legend>
                          <div className="flex min-h-10 flex-wrap items-center gap-x-6 gap-y-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="employmentType"
                                value="INDEPENDENT"
                                className={styles.radio}
                                id="employmentIndependent"
                                checked={
                                  values.employmentType === 'INDEPENDENT'
                                }
                                onChange={() =>
                                  setFieldValue('employmentType', 'INDEPENDENT')
                                }
                              />
                              <label
                                htmlFor="employmentIndependent"
                                className="cursor-pointer text-sm text-slate-700 dark:text-white"
                              >
                                {t('Independent')}
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="employmentType"
                                value="STORE_ASSIGNED"
                                className={styles.radio}
                                id="employmentStoreAssigned"
                                checked={
                                  values.employmentType === 'STORE_ASSIGNED'
                                }
                                onChange={() =>
                                  setFieldValue(
                                    'employmentType',
                                    'STORE_ASSIGNED'
                                  )
                                }
                              />
                              <label
                                htmlFor="employmentStoreAssigned"
                                className="cursor-pointer text-sm text-slate-700 dark:text-white"
                              >
                                {t('Store assigned')}
                              </label>
                            </div>
                          </div>
                        </fieldset>
                      </div>
                    </div>

                    <hr className="border-slate-200 dark:border-dark-600" />

                    {/* Account access + Initial status */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                          {t('Account access')}
                        </p>
                        <div className={styles.optionRow}>
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            id="sendSetupLink"
                            checked={values.sendSetupLink}
                            onChange={(e) => {
                              setFieldValue('sendSetupLink', e.target.checked);
                              setFieldTouched('sendSetupLink', true, false);
                            }}
                          />
                          <div>
                            <label
                              htmlFor="sendSetupLink"
                              className="cursor-pointer text-sm font-medium text-slate-900 dark:text-white"
                            >
                              {t('Send account setup link to rider')}
                            </label>
                            <p className="text-xs text-slate-500">
                              {t(
                                'The rider will receive an SMS or email to create a password.'
                              )}
                            </p>
                          </div>
                        </div>

                        {!values.sendSetupLink && (
                          <div className="mt-4 grid grid-cols-1 gap-y-4">
                            <CustomPasswordTextField
                              autoComplete="new-password"
                              placeholder={`${t('Password')} *`}
                              name="password"
                              maxLength={30}
                              value={values.password}
                              showLabel
                              onChange={onFieldChange}
                              style={{
                                borderColor: fieldError('password')
                                  ? 'red'
                                  : '',
                              }}
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
                              style={{
                                borderColor: fieldError('confirmPassword')
                                  ? 'red'
                                  : '',
                              }}
                            />
                            {fieldError('password') && (
                              <small className="p-error -mt-2">
                                {fieldError('password')}
                              </small>
                            )}
                            {fieldError('confirmPassword') && (
                              <small className="p-error -mt-2">
                                {fieldError('confirmPassword')}
                              </small>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                          {t('Initial status')}
                        </p>
                        <div className={styles.optionRow}>
                          <button
                            type="button"
                            role="switch"
                            id="riderActive"
                            aria-labelledby="riderActiveLabel"
                            aria-describedby="riderActiveHelp"
                            aria-checked={values.isActive}
                            onClick={() =>
                              setFieldValue('isActive', !values.isActive)
                            }
                            className={styles.switch}
                          >
                            <span aria-hidden="true" />
                          </button>
                          <div>
                            <label
                              id="riderActiveLabel"
                              htmlFor="riderActive"
                              className="cursor-pointer text-sm font-medium text-slate-900 dark:text-white"
                            >
                              {t('Activate rider after registration')}
                            </label>
                            <p
                              id="riderActiveHelp"
                              className="text-xs text-slate-500"
                            >
                              {t(
                                'The rider can go online after completing verification.'
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                      <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5" />
                      <span>
                        {t(
                          'Identity documents, driving licence and payout details can be completed from the rider profile.'
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white px-4 py-4 dark:border-dark-600 dark:bg-dark-950 sm:px-6">
                    <CustomButton
                      type="button"
                      className="h-10 border border-gray-300 bg-white px-5 text-sm text-slate-700 dark:border-dark-600 dark:bg-dark-950 dark:text-white"
                      label={t('Cancel')}
                      onClick={exit}
                    />
                    <CustomButton
                      type="button"
                      className="h-10 border border-gray-300 bg-white px-5 text-sm text-slate-700 dark:border-dark-600 dark:bg-dark-950 dark:text-white"
                      label={t('Save as draft')}
                      loading={isSavingDraft}
                      onClick={() => handleSaveDraft(values)}
                    />
                    <CustomButton
                      type="submit"
                      className="h-10 border border-[#1c5bc7] bg-[#1c5bc7] px-6 text-sm text-white"
                      label={isEditMode ? t('Update rider') : t('Create rider')}
                      loading={isSubmitting}
                    />
                  </div>
                </Form>
              </div>

              <CustomDialog
                visible={showDiscardConfirm}
                onHide={() => setShowDiscardConfirm(false)}
                onConfirm={() => router.push('/general/riders')}
                title={t('Discard changes?')}
                message={t(
                  'Anything not saved as a draft will be lost. Are you sure you want to leave?'
                )}
                loading={false}
                buttonConfig={{
                  primaryButtonProp: {
                    label: t('Discard'),
                    bgColor: 'bg-red-500',
                    textColor: 'text-white',
                  },
                  secondaryButtonProp: { label: t('Keep editing') },
                }}
              />
            </>
          );
        }}
      </Formik>
    </div>
  );
}
