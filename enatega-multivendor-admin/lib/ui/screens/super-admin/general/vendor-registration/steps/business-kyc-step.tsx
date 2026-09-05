'use client';

import { useContext } from 'react';
import { useFormikContext } from 'formik';
import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';

import CustomTextField from '@/lib/ui/useable-components/input-field';
import CustomDropdownComponent from '@/lib/ui/useable-components/custom-dropdown';
import CustomInputSwitch from '@/lib/ui/useable-components/custom-input-switch';
import DocumentUploadCard from '../document-upload-card';

import { ToastContext } from '@/lib/context/global/toast.context';
import { UPSERT_VENDOR_DOCUMENT } from '@/lib/api/graphql';
import { getGraphQLErrorMessage } from '@/lib/utils/methods';
import { IVendorRegistrationForm } from '@/lib/utils/interfaces/forms';
import { IDropdownSelectItem } from '@/lib/utils/interfaces';

export default function BusinessKycStep({
  businessTypeOptions,
  businessTypesLoading,
}: {
  businessTypeOptions: IDropdownSelectItem[];
  businessTypesLoading: boolean;
}) {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);
  const { values, errors, touched, handleChange, handleBlur, setFieldValue, setFieldTouched } =
    useFormikContext<IVendorRegistrationForm>();
  const [upsertVendorDocument] = useMutation(UPSERT_VENDOR_DOCUMENT);

  const fieldError = (name: keyof IVendorRegistrationForm) =>
    touched[name] && errors[name] ? String(errors[name]) : undefined;

  const onFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    setFieldTouched(e.target.name, true, false);
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
            }}
            loading={businessTypesLoading}
            options={businessTypeOptions || []}
            showLabel
            error={fieldError('businessType')}
          />

          <div className="md:col-span-2">
            <CustomInputSwitch
              isActive={values.isGstRegistered}
              label={t('GST registered')}
              onChange={(e) => {
                setFieldValue('isGstRegistered', e.target.checked);
                setFieldTouched('isGstRegistered', true, false);
              }}
            />
          </div>

          {values.isGstRegistered && (
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
                {t('GSTIN is used for business verification. GST rates are configured with products.')}
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
          {values.isGstRegistered && (
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
