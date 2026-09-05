'use client';

import { useFormikContext } from 'formik';
import { useTranslations } from 'next-intl';
import { IVendorRegistrationForm } from '@/lib/utils/interfaces/forms';

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900 dark:text-white">{value || '—'}</span>
    </div>
  );
}

function SummaryCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-dark-600">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        <button type="button" onClick={onEdit} className="text-xs font-medium text-[#1c5bc7] hover:underline">
          {t('Edit')}
        </button>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-dark-600">{children}</div>
    </div>
  );
}

export default function ReviewStep({ onEditStep }: { onEditStep: (step: number) => void }) {
  const t = useTranslations();
  const { values } = useFormikContext<IVendorRegistrationForm>();

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{t('Review everything below before creating the vendor account.')}</p>

      <SummaryCard title={t('Account')} onEdit={() => onEditStep(0)}>
        <SummaryRow label={t('Name')} value={`${values.firstName} ${values.lastName}`.trim()} />
        <SummaryRow label={t('Email address')} value={values.email} />
        <SummaryRow label={t('Mobile number')} value={values.phoneNumber} />
        <SummaryRow
          label={t('Account access')}
          value={values.sendSetupLink ? t('Setup link will be sent') : t('Password set by admin')}
        />
      </SummaryCard>

      <SummaryCard title={t('Business & KYC')} onEdit={() => onEditStep(1)}>
        <SummaryRow label={t('Business name')} value={values.businessName} />
        <SummaryRow label={t('Business type')} value={values.businessType?.label} />
        <SummaryRow label={t('GST registered')} value={values.isGstRegistered ? t('Yes') : t('No')} />
        {values.isGstRegistered && <SummaryRow label={t('GSTIN')} value={values.gstin} />}
        <SummaryRow label={t('PAN card')} value={values.panFileUrl ? t('Uploaded') : t('Not uploaded')} />
        {values.isGstRegistered && (
          <SummaryRow label={t('GST certificate')} value={values.gstCertFileUrl ? t('Uploaded') : t('Not uploaded')} />
        )}
      </SummaryCard>

      <SummaryCard title={t('Payout')} onEdit={() => onEditStep(2)}>
        {values.payoutAccountNumber ? (
          <>
            <SummaryRow label={t('Account holder name')} value={values.payoutHolderName} />
            <SummaryRow label={t('Account number')} value={values.payoutAccountNumber} />
            <SummaryRow label={t('IFSC code')} value={values.payoutIfsc} />
            <SummaryRow label={t('Bank name')} value={values.payoutBankName} />
          </>
        ) : (
          <p className="py-1.5 text-sm text-slate-400">{t('Not added — can be set up later from the vendor profile')}</p>
        )}
      </SummaryCard>
    </div>
  );
}
