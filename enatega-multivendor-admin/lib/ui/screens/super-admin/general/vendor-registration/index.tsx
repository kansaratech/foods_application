'use client';

// Core
import { useContext, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Formik, FormikHelpers, FormikProps } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

// Context
import { ToastContext } from '@/lib/context/global/toast.context';
import { VendorContext } from '@/lib/context/super-admin/vendor.context';

// GraphQL
import {
  CREATE_VENDOR,
  GET_VENDOR_BY_ID,
  GET_VENDOR_DOCUMENTS,
  SAVE_VENDOR_DRAFT,
  UPSERT_VENDOR_DOCUMENT,
} from '@/lib/api/graphql';

// Hooks
import { useShopTypes } from '@/lib/hooks/useShopType';

// Components
import CustomButton from '@/lib/ui/useable-components/button';
import CustomDialog from '@/lib/ui/useable-components/delete-dialog';
import CustomLoader from '@/lib/ui/useable-components/custom-progress-indicator';
import StepperHeader, { IWizardStep } from '@/lib/ui/useable-components/stepper-header';
import AccountStep from './steps/account-step';
import BusinessKycStep from './steps/business-kyc-step';
import PayoutStep from './steps/payout-step';
import ReviewStep from './steps/review-step';

// Schema, constants, interfaces, methods
import {
  VendorRegistrationSchema,
  vendorAccountStepSchema,
  vendorBusinessKycStepSchema,
  vendorPayoutStepSchema,
} from '@/lib/utils/schema/vendor';
import { extractIndianMobileDigits, getGraphQLErrorMessage } from '@/lib/utils/methods';
import { IVendorRegistrationForm } from '@/lib/utils/interfaces/forms';

const emptyInitialValues: IVendorRegistrationForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  image: '',
  sendSetupLink: true,
  password: '',
  confirmPassword: '',
  businessName: '',
  businessType: null,
  isGstRegistered: false,
  gstin: '',
  panFileUrl: '',
  gstCertFileUrl: '',
  payoutHolderName: '',
  payoutAccountNumber: '',
  payoutIfsc: '',
  payoutBankName: '',
};

const STEP_SCHEMAS = [vendorAccountStepSchema, vendorBusinessKycStepSchema, vendorPayoutStepSchema, null];

const STEP_FIELDS: (keyof IVendorRegistrationForm)[][] = [
  ['firstName', 'lastName', 'email', 'phoneNumber', 'image', 'sendSetupLink', 'password', 'confirmPassword'],
  ['businessName', 'businessType', 'isGstRegistered', 'gstin', 'panFileUrl', 'gstCertFileUrl'],
  ['payoutHolderName', 'payoutAccountNumber', 'payoutIfsc', 'payoutBankName'],
];

function applyYupErrors(err: unknown, formik: FormikProps<IVendorRegistrationForm>) {
  const yupErr = err as Yup.ValidationError;
  if (!yupErr?.inner) return;
  const newErrors: Record<string, string> = {};
  const newTouched: Record<string, boolean> = {};
  yupErr.inner.forEach((e) => {
    if (e.path) {
      newErrors[e.path] = e.message;
      newTouched[e.path] = true;
    }
  });
  formik.setErrors({ ...formik.errors, ...newErrors });
  formik.setTouched({ ...formik.touched, ...newTouched }, false);
  return newErrors;
}

export default function VendorRegistrationScreen() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editVendorId = searchParams.get('id');
  const isEditMode = !!editVendorId;

  const { showToast } = useContext(ToastContext);
  const { onSetVendorId, vendorResponse } = useContext(VendorContext);

  const { dropdownList: businessTypeOptions, loading: businessTypesLoading } = useShopTypes({
    invoke_now: true,
    transform_to_dropdown_list: true,
  });

  const { data: vendorData, loading: vendorLoading } = useQuery(GET_VENDOR_BY_ID, {
    variables: { id: editVendorId ?? '' },
    skip: !editVendorId,
    fetchPolicy: 'network-only',
  });
  const { data: docsData, loading: docsLoading } = useQuery(GET_VENDOR_DOCUMENTS, {
    variables: { vendorId: editVendorId ?? '' },
    skip: !editVendorId,
    fetchPolicy: 'network-only',
  });

  const resolvedInitialValues = useMemo<IVendorRegistrationForm | null>(() => {
    if (!isEditMode) return emptyInitialValues;
    if (vendorLoading || docsLoading || businessTypesLoading) return null;
    const vendor = vendorData?.getVendor;
    if (!vendor) return null;

    const matchedBusinessType = (businessTypeOptions || []).find((o) => o.code === vendor.businessTypeId) ?? null;
    const docs = docsData?.vendorDocuments ?? [];
    const pan = docs.find((d: { kind: string }) => d.kind === 'PAN');
    const gst = docs.find((d: { kind: string }) => d.kind === 'GST');
    const bank = docs.find((d: { kind: string }) => d.kind === 'BANK');

    return {
      _id: vendor._id,
      firstName: vendor.firstName ?? '',
      lastName: vendor.lastName ?? '',
      email: vendor.email ?? '',
      // Stored as bare 10 digits (extractIndianMobileDigits strips the
      // country code before it's ever sent to the API) — the phone input
      // expects a +-prefixed value to display it correctly.
      phoneNumber: vendor.phoneNumber ? `+91${vendor.phoneNumber}` : '',
      image: vendor.image ?? '',
      // Leaving this checked (with password fields empty) is safe for an
      // edit — the finalize mutation never touches an ACTIVE vendor's
      // password unless the admin explicitly types a new one.
      sendSetupLink: true,
      password: '',
      confirmPassword: '',
      businessName: vendor.businessName ?? '',
      businessType: matchedBusinessType,
      isGstRegistered: !!vendor.isGstRegistered,
      gstin: vendor.gstin ?? '',
      panFileUrl: pan?.fileUrl ?? '',
      gstCertFileUrl: gst?.fileUrl ?? '',
      payoutHolderName: bank?.holderName ?? '',
      payoutAccountNumber: bank?.number ?? '',
      payoutIfsc: bank?.ifsc ?? '',
      payoutBankName: bank?.bankName ?? '',
    };
  }, [isEditMode, vendorLoading, docsLoading, businessTypesLoading, vendorData, docsData, businessTypeOptions]);

  const [saveVendorDraft] = useMutation(SAVE_VENDOR_DRAFT);
  const [createVendor] = useMutation(CREATE_VENDOR);
  const [upsertVendorDocument] = useMutation(UPSERT_VENDOR_DOCUMENT);

  const [step, setStep] = useState(0);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const steps: IWizardStep[] = [
    { key: 'account', label: t('Account') },
    { key: 'business', label: t('Business & KYC') },
    { key: 'payout', label: t('Payout') },
    { key: 'review', label: t('Review') },
  ];
  const isLastStep = step === steps.length - 1;

  const buildDraftInput = (values: IVendorRegistrationForm) => ({
    _id: values._id || undefined,
    name: `${values.firstName.trim()} ${values.lastName.trim()}`.trim() || undefined,
    email: values.email.trim().toLowerCase(),
    firstName: values.firstName.trim() || undefined,
    lastName: values.lastName.trim() || undefined,
    phoneNumber: values.phoneNumber ? extractIndianMobileDigits(values.phoneNumber) : undefined,
    image: values.image || undefined,
    businessName: values.businessName.trim() || undefined,
    businessType: values.businessType?.code,
    isGstRegistered: values.isGstRegistered,
    gstin: values.isGstRegistered ? values.gstin.trim().toUpperCase() : undefined,
  });

  const buildFinalInput = (values: IVendorRegistrationForm) => ({
    _id: values._id || undefined,
    name: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
    email: values.email.trim().toLowerCase(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    phoneNumber: extractIndianMobileDigits(values.phoneNumber),
    image: values.image || undefined,
    businessName: values.businessName.trim(),
    businessType: values.businessType?.code,
    isGstRegistered: values.isGstRegistered,
    gstin: values.isGstRegistered ? values.gstin.trim().toUpperCase() : undefined,
    ...(values.sendSetupLink ? {} : { password: values.password }),
  });

  const persistDraft = async (
    values: IVendorRegistrationForm,
    setFieldValue: FormikHelpers<IVendorRegistrationForm>['setFieldValue']
  ): Promise<string | null> => {
    if (!values.email.trim()) {
      showToast({
        type: 'error',
        title: t('Vendor Registration'),
        message: t('Enter an email address first'),
        duration: 2500,
      });
      return null;
    }
    try {
      const { data } = await saveVendorDraft({ variables: { vendorInput: buildDraftInput(values) } });
      const savedId: string | null = data?.saveVendorDraft?._id ?? null;
      if (savedId && savedId !== values._id) setFieldValue('_id', savedId, false);
      return savedId;
    } catch (error) {
      showToast({
        type: 'error',
        title: t('Vendor Registration'),
        message: getGraphQLErrorMessage(error as Error) ?? t('Failed to save'),
        duration: 3000,
      });
      return null;
    }
  };

  const persistPayoutDoc = async (values: IVendorRegistrationForm, vendorId: string) => {
    const hasPayout =
      values.payoutHolderName || values.payoutAccountNumber || values.payoutIfsc || values.payoutBankName;
    if (!hasPayout) return;
    try {
      await upsertVendorDocument({
        variables: {
          vendorId,
          kind: 'BANK',
          holderName: values.payoutHolderName || undefined,
          number: values.payoutAccountNumber || undefined,
          ifsc: values.payoutIfsc || undefined,
          bankName: values.payoutBankName || undefined,
        },
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: t('Payout'),
        message: getGraphQLErrorMessage(error as Error) ?? t('Failed to save payout details'),
        duration: 3000,
      });
    }
  };

  const handleContinue = async (formik: FormikProps<IVendorRegistrationForm>) => {
    const schema = STEP_SCHEMAS[step];
    if (schema) {
      try {
        await schema.validate(formik.values, { abortEarly: false });
      } catch (err) {
        applyYupErrors(err, formik);
        return;
      }
    }
    setSavingDraft(true);
    const savedId = await persistDraft(formik.values, formik.setFieldValue);
    if (savedId && step === 2) await persistPayoutDoc(formik.values, savedId);
    setSavingDraft(false);
    if (!savedId) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const handleSaveDraft = async (formik: FormikProps<IVendorRegistrationForm>) => {
    setSavingDraft(true);
    const savedId = await persistDraft(formik.values, formik.setFieldValue);
    if (savedId && step === 2) await persistPayoutDoc(formik.values, savedId);
    setSavingDraft(false);
    if (savedId) {
      showToast({ type: 'success', title: t('Vendor Registration'), message: t('Draft saved'), duration: 2000 });
    }
  };

  const handleFinalSubmit = async (formik: FormikProps<IVendorRegistrationForm>) => {
    try {
      await VendorRegistrationSchema.validate(formik.values, { abortEarly: false });
    } catch (err) {
      const newErrors = applyYupErrors(err, formik) ?? {};
      const badStep = STEP_FIELDS.findIndex((fields) => fields.some((f) => f in newErrors));
      if (badStep !== -1) setStep(badStep);
      showToast({
        type: 'error',
        title: t('Vendor Registration'),
        message: t('Please complete the highlighted step'),
        duration: 3000,
      });
      return;
    }
    formik.submitForm();
  };

  if (resolvedInitialValues === null) {
    return (
      <div className="grid h-full min-h-0 place-items-center bg-slate-50 dark:bg-dark-950">
        <CustomLoader size="32px" />
      </div>
    );
  }

  return (
    <div className="vendor-registration-form h-full min-h-0 overflow-y-auto bg-slate-50 px-4 py-6 dark:bg-dark-950 sm:px-6 lg:px-10">
      {/* A handful of shared input components ship with `focus:outline-none`,
          which drops the visible focus ring the spec requires. Restoring it
          globally on those components is out of scope here, so it's scoped to
          this page instead. */}
      <style jsx global>{`
        .vendor-registration-form input:focus-visible,
        .vendor-registration-form button:focus-visible,
        .vendor-registration-form .p-dropdown:focus-visible,
        .vendor-registration-form .p-dropdown.p-focus,
        .vendor-registration-form .p-checkbox-box.p-focus {
          outline: 2px solid var(--primary-color) !important;
          outline-offset: 2px !important;
        }
      `}</style>

      <Formik
        initialValues={resolvedInitialValues}
        validationSchema={VendorRegistrationSchema}
        validateOnChange={false}
        onSubmit={async (values, { setSubmitting, setFieldError }) => {
          setSubmitError(null);
          try {
            const { data } = await createVendor({ variables: { vendorInput: buildFinalInput(values) } });
            const created = data?.createVendor;

            showToast({
              type: 'success',
              title: t('Vendor'),
              message: isEditMode ? t('Vendor updated successfully') : t('Vendor created successfully'),
              duration: 3000,
            });
            // In edit mode the vendor is already ACTIVE, so leaving "send
            // setup link" checked never actually triggers an invite — the
            // finalize mutation only mints one for a brand-new/draft vendor.
            if (!isEditMode && values.sendSetupLink) {
              showToast({
                type: 'info',
                title: t('Vendor'),
                message: t('Account setup invitation sent'),
                duration: 3000,
              });
            }

            if (created?._id) onSetVendorId(created._id);
            vendorResponse.refetch();
            router.push('/general/vendors');
          } catch (error) {
            const message = getGraphQLErrorMessage(error as Error) ?? t('Vendor Create Failed');
            setSubmitError(message);
            if (/already exists|already registered/i.test(message)) {
              setFieldError('email', t('A vendor with this email already exists'));
              setStep(0);
            }
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {(formik) => (
          <>
            <div className="w-full">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <nav className="mb-1 text-sm text-slate-500" aria-label="Breadcrumb">
                    <Link href="/general/vendors" className="font-medium hover:text-[#1c5bc7] hover:underline">
                      {t('Vendors')}
                    </Link>
                    <span className="mx-1.5">/</span>
                    <span className="text-slate-700 dark:text-slate-300">{isEditMode ? t('Edit vendor') : t('Add vendor')}</span>
                  </nav>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    {isEditMode ? t('Edit vendor') : t('Register new vendor')}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {isEditMode
                      ? t('Update the vendor account and business details')
                      : t('Create the vendor account and collect business details')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CustomButton
                    type="button"
                    className="h-9 border border-gray-300 bg-white px-4 text-sm text-slate-700 dark:border-dark-600 dark:bg-dark-950 dark:text-white"
                    label={t('Save draft')}
                    loading={savingDraft}
                    onClick={() => handleSaveDraft(formik)}
                  />
                  <button
                    type="button"
                    aria-label={t('Close')}
                    onClick={() => (formik.dirty ? setShowDiscardConfirm(true) : router.push('/general/vendors'))}
                    className="grid h-9 w-9 place-items-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-900"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-950">
              <div className="border-b border-slate-100 px-4 pt-4 dark:border-dark-600 sm:px-6">
                <StepperHeader steps={steps} current={step} />
              </div>

              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isLastStep) handleFinalSubmit(formik);
                }}
              >
                <div className="p-4 sm:p-6 md:p-8">
                  {submitError && (
                    <div
                      role="alert"
                      className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                    >
                      {submitError}
                    </div>
                  )}

                  {step === 0 && <AccountStep />}
                  {step === 1 && (
                    <BusinessKycStep businessTypeOptions={businessTypeOptions || []} businessTypesLoading={businessTypesLoading} />
                  )}
                  {step === 2 && <PayoutStep />}
                  {step === 3 && <ReviewStep onEditStep={setStep} />}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-4 dark:border-dark-600 dark:bg-dark-950 sm:px-6">
                  <CustomButton
                    type="button"
                    className="h-10 border border-gray-300 bg-white px-5 text-sm text-slate-700 dark:border-dark-600 dark:bg-dark-950 dark:text-white"
                    label={t('Cancel')}
                    onClick={() => (formik.dirty ? setShowDiscardConfirm(true) : router.push('/general/vendors'))}
                  />
                  <div className="flex items-center gap-3">
                    {step > 0 && (
                      <CustomButton
                        type="button"
                        className="h-10 border border-gray-300 bg-white px-5 text-sm text-slate-700 dark:border-dark-600 dark:bg-dark-950 dark:text-white"
                        label={t('Back')}
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                      />
                    )}
                    {isLastStep ? (
                      <CustomButton
                        type="button"
                        className="h-10 bg-primary-color px-6 text-sm text-white"
                        label={isEditMode ? t('Update vendor') : t('Create vendor')}
                        loading={formik.isSubmitting}
                        onClick={() => handleFinalSubmit(formik)}
                      />
                    ) : (
                      <CustomButton
                        type="button"
                        className="h-10 bg-primary-color px-6 text-sm text-white"
                        label={t('Continue')}
                        loading={savingDraft}
                        onClick={() => handleContinue(formik)}
                      />
                    )}
                  </div>
                </div>
              </Form>
            </div>

            <CustomDialog
              visible={showDiscardConfirm}
              onHide={() => setShowDiscardConfirm(false)}
              onConfirm={() => router.push('/general/vendors')}
              title={t('Discard changes?')}
              message={t('Anything not saved as a draft will be lost. Are you sure you want to leave?')}
              loading={false}
              buttonConfig={{
                primaryButtonProp: { label: t('Discard'), bgColor: 'bg-red-500', textColor: 'text-white' },
                secondaryButtonProp: { label: t('Keep editing') },
              }}
            />
          </>
        )}
      </Formik>
    </div>
  );
}
