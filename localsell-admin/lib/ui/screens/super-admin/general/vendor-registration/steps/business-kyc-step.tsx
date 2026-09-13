'use client';

import { useContext } from 'react';
import { useFormikContext } from 'formik';
import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';

import CustomTextField from '@/lib/ui/useable-components/input-field';
import CustomDropdownComponent from '@/lib/ui/useable-components/custom-dropdown';
import DocumentUploadCard from '../document-upload-card';

import { ToastContext } from '@/lib/context/global/toast.context';
import { UPSERT_VENDOR_DOCUMENT } from '@/lib/api/graphql';
import { getGraphQLErrorMessage } from '@/lib/utils/methods';
import { IVendorRegistrationForm } from '@/lib/utils/interfaces/forms';
import { IDropdownSelectItem } from '@/lib/utils/interfaces';

// A vendor is one of three GST statuses under Indian law — this drives how
// every store they create is taxed (see pricing.service.ts on the API):
// Regular charges GST and splits it as CGST+SGST; Composition legally cannot
// charge tax separately from the customer at all (Section 10 CGST Act), even
// though it still holds a GSTIN; Unregistered charges no GST.
export const GST_REGISTRATION_OPTIONS: IDropdownSelectItem[] = [
  { code: 'UNREGISTERED', label: 'Not GST registered' },
  { code: 'REGULAR', label: 'GST Regular' },
  { code: 'COMPOSITION', label: 'GST Composition scheme' },
];

export default function BusinessKycStep({
  businessTypeOptions,
  businessTypesLoading,
}: {
  businessTypeOptions: IDropdownSelectItem[];
  businessTypesLoading: boolean;
}) {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldTouched,
    setFieldError,
  } = useFormikContext<IVendorRegistrationForm>();
  const [upsertVendorDocument] = useMutation(UPSERT_VENDOR_DOCUMENT);

  const fieldError = (name: keyof IVendorRegistrationForm) =>
    touched[name] && errors[name] ? String(errors[name]) : undefined;

  const onFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    setFieldTouched(e.target.name, true, false);
    // The wizard runs validation manually (validateOnChange is off), so a
    // stale "Required" wouldn't clear on its own once the field is filled (#53).
    if (e.target.value?.trim()) setFieldError(e.target.name, undefined);
  };

  const saveDocument = async (kind: 'PAN' | 'GST', fileUrl: string, field: 'panFileUrl' | 'gstCertFileUrl') => {
    if (!values._id) {
      showToast({ type: 'error', title: t('Business & KYC'), message: t('Save this step first, then try again') });
      return;
    }
    try {
      await upsertVendorDocument({ variables: { vendorId: values._id, kind, fileUrl } });
      setFieldValue(field, fileUrl);
      setFieldTouched(field, true, false);
    } catch (error) {
      showToast({
        type: 'error',
        title: t('Business & KYC'),
        message: getGraphQLErrorMessage(error as Error) ?? t('Upload failed'),
        duration: 3000,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">{t('Business details')}</p>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <CustomTextField
            type="text"
            name="businessName"
            placeholder={`${t('Legal business name')} *`}
            maxLength={120}
            value={values.businessName}
            onChange={onFieldChange}
            onBlur={handleBlur}
            showLabel
            error={fieldError('businessName')}
          />
          <CustomDropdownComponent
            name="businessType"
            placeholder={`${t('Business type')} *`}
            selectedItem={values.businessType}
            setSelectedItem={(key, item) => {
              setFieldValue(key, item);
              setFieldTouched(key, true, false);
              // Clear the stale "Required" as soon as a type is picked (#53).
              if (item) setFieldError(key, undefined);
            }}
            loading={businessTypesLoading}
            options={businessTypeOptions || []}
            showLabel
            error={fieldError('businessType')}
          />

          <div className="md:col-span-2">
            <CustomDropdownComponent
              name="gstRegistrationType"
              placeholder={`${t('GST registration')} *`}
              selectedItem={values.gstRegistrationType}
              setSelectedItem={(key, item) => {
                setFieldValue(key, item);
                setFieldTouched(key, true, false);
                if (item) setFieldError(key, undefined);
                // Composition/Unregistered can't carry a leftover GSTIN from a
                // previous selection into a state where it's not required.
                if (item?.code === 'UNREGISTERED') {
                  setFieldValue('gstin', '');
                  setFieldTouched('gstin', false, false);
                }
              }}
              options={GST_REGISTRATION_OPTIONS}
              showLabel
              error={fieldError('gstRegistrationType')}
            />
          </div>

          {(values.gstRegistrationType?.code === 'REGULAR' || values.gstRegistrationType?.code === 'COMPOSITION') && (
            <div className="md:col-span-2">
              <CustomTextField
                type="text"
                name="gstin"
                placeholder={`${t('GSTIN')} *`}
                maxLength={15}
                value={values.gstin}
                onChange={(e) => {
                  setFieldValue('gstin', e.target.value.toUpperCase());
                  setFieldTouched('gstin', true, false);
                }}
                onBlur={handleBlur}
                showLabel
                error={fieldError('gstin')}
              />
              <p className="mt-1 text-xs text-slate-400">
                {values.gstRegistrationType?.code === 'COMPOSITION'
                  ? t(
                      'Composition dealers cannot charge GST separately to customers by law — menu prices will be treated as tax-inclusive.'
                    )
                  : t('GSTIN is used for business verification. GST rates are configured with products.')}
              </p>
            </div>
          )}
        </div>
      </div>

      <hr className="border-slate-200 dark:border-dark-600" />

      <div>
        <p className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">{t('Documents')}</p>
        <p className="mb-3 text-xs text-slate-500">{t('Documents are used for verification and compliance purposes only')}</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DocumentUploadCard
            label={t('PAN card')}
            helperText={t('Upload a clear copy of the PAN card')}
            required
            value={values.panFileUrl}
            onUploaded={(url) => saveDocument('PAN', url, 'panFileUrl')}
            onRemove={() => setFieldValue('panFileUrl', '')}
          />
          {(values.gstRegistrationType?.code === 'REGULAR' || values.gstRegistrationType?.code === 'COMPOSITION') && (
            <DocumentUploadCard
              label={t('GST certificate')}
              helperText={t('Upload the GST registration certificate')}
              value={values.gstCertFileUrl}
              onUploaded={(url) => saveDocument('GST', url, 'gstCertFileUrl')}
              onRemove={() => setFieldValue('gstCertFileUrl', '')}
            />
          )}
        </div>
        {fieldError('panFileUrl') && <small className="p-error mt-2 block">{fieldError('panFileUrl')}</small>}
      </div>
    </div>
  );
}
