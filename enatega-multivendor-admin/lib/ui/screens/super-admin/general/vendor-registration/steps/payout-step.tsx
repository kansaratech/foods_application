'use client';

import { useFormikContext } from 'formik';
import { useTranslations } from 'next-intl';

import CustomTextField from '@/lib/ui/useable-components/input-field';
import { IVendorRegistrationForm } from '@/lib/utils/interfaces/forms';

export default function PayoutStep() {
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
    <div>
      <p className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">{t('Payout details')}</p>
      <p className="mb-4 text-xs text-slate-500">
        {t('Optional — add this now, or skip it and set it up later from the vendor profile before the first payout run.')}
      </p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <CustomTextField
          type="text"
          name="payoutHolderName"
          placeholder={t('Account holder name')}
          maxLength={100}
          value={values.payoutHolderName}
          onChange={onFieldChange}
          onBlur={handleBlur}
          showLabel
          error={fieldError('payoutHolderName')}
        />
        <CustomTextField
          type="text"
          name="payoutAccountNumber"
          placeholder={t('Account number')}
          maxLength={30}
          value={values.payoutAccountNumber}
          onChange={onFieldChange}
          onBlur={handleBlur}
          showLabel
          error={fieldError('payoutAccountNumber')}
        />
        <CustomTextField
          type="text"
          name="payoutIfsc"
          placeholder={`${t('IFSC code')}${values.payoutAccountNumber ? ' *' : ''}`}
          maxLength={11}
          value={values.payoutIfsc}
          onChange={(e) => {
            setFieldValue('payoutIfsc', e.target.value.toUpperCase());
            setFieldTouched('payoutIfsc', true, false);
          }}
          onBlur={handleBlur}
          showLabel
          error={fieldError('payoutIfsc')}
        />
        <CustomTextField
          type="text"
          name="payoutBankName"
          placeholder={t('Bank name')}
          maxLength={100}
          value={values.payoutBankName}
          onChange={onFieldChange}
          onBlur={handleBlur}
          showLabel
          error={fieldError('payoutBankName')}
        />
      </div>
    </div>
  );
}
