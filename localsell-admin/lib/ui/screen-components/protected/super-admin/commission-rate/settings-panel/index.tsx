'use client';

import { useContext, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';

import { GET_CONFIGURATION, SAVE_COMMISSION_CONFIGURATION } from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import CustomButton from '@/lib/ui/useable-components/button';

interface ConfigFormState {
  defaultCommissionRate: string;
  commissionBillingCycle: string;
  riderCashLimit: string;
  platformLegalName: string;
  platformGstin: string;
  platformAddress: string;
}

// The platform-wide commission rate, billing cycle, rider cash limit and
// invoice billing entity used to live at the top of the "Vendor settlements"
// tab, ahead of any actual settlement data — but that's rate *configuration*,
// not a settlement. It belongs here, on the "Commission rates" tab, above
// the per-vendor rate overrides.
export default function CommissionSettingsPanel() {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);

  const { data: configData, refetch: refetchConfig } = useQuery(GET_CONFIGURATION);
  const config = configData?.configuration;
  const [saveConfig] = useMutation(SAVE_COMMISSION_CONFIGURATION);

  const [form, setForm] = useState<ConfigFormState | null>(null);
  const [savingRates, setSavingRates] = useState(false);
  const [savingEntity, setSavingEntity] = useState(false);

  const values: ConfigFormState = form ?? {
    defaultCommissionRate: String(config?.defaultCommissionRate ?? 20),
    commissionBillingCycle: config?.commissionBillingCycle ?? 'MONTHLY',
    riderCashLimit: String(config?.riderCashLimit ?? 3000),
    platformLegalName: config?.platformLegalName ?? '',
    platformGstin: config?.platformGstin ?? '',
    platformAddress: config?.platformAddress ?? '',
  };

  const setField = (field: keyof ConfigFormState, value: string) => {
    setForm({ ...values, [field]: value });
  };

  const persistConfig = async (
    input: Record<string, string | number>,
    setSaving: (v: boolean) => void,
    successMessage: string,
  ) => {
    setSaving(true);
    try {
      await saveConfig({ variables: { configurationInput: input } });
      await refetchConfig();
      showToast({ type: 'success', title: t('Commission'), message: successMessage, duration: 2000 });
    } catch {
      showToast({ type: 'error', title: t('Error'), message: t('Could not save - please try again'), duration: 2500 });
    } finally {
      setSaving(false);
    }
  };

  const saveRates = () =>
    persistConfig(
      {
        defaultCommissionRate: parseFloat(values.defaultCommissionRate) || 0,
        commissionBillingCycle: values.commissionBillingCycle,
        riderCashLimit: parseFloat(values.riderCashLimit) || 0,
      },
      setSavingRates,
      t('Commission settings updated'),
    );

  const saveEntity = () =>
    persistConfig(
      {
        platformLegalName: values.platformLegalName,
        platformGstin: values.platformGstin,
        platformAddress: values.platformAddress,
      },
      setSavingEntity,
      t('Invoice billing entity updated'),
    );

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-900">
        <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">{t('Default commission settings')}</h3>
        <p className="mb-3 text-xs text-slate-500">{t('commission_settings_help')}</p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-slate-500">{t('Default commission rate')} (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={values.defaultCommissionRate}
              onChange={(e) => setField('defaultCommissionRate', e.target.value)}
              className="h-10 w-32 rounded-lg border border-slate-300 px-2 dark:border-dark-600 dark:bg-dark-950"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-slate-500">{t('Billing cycle')}</span>
            <select
              value={values.commissionBillingCycle}
              onChange={(e) => setField('commissionBillingCycle', e.target.value)}
              className="h-10 w-40 rounded-lg border border-slate-300 px-2 dark:border-dark-600 dark:bg-dark-950"
            >
              <option value="MONTHLY">{t('Monthly')}</option>
              <option value="YEARLY">{t('Yearly')}</option>
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-slate-500">{t('Rider cash limit')} (₹)</span>
            <input
              type="number"
              min={0}
              step={100}
              value={values.riderCashLimit}
              onChange={(e) => setField('riderCashLimit', e.target.value)}
              className="h-10 w-32 rounded-lg border border-slate-300 px-2 dark:border-dark-600 dark:bg-dark-950"
            />
          </label>
          <CustomButton
            type="button"
            className="h-10 border border-[#1c5bc7] bg-[#1c5bc7] px-6 text-sm text-white"
            label={t('Save')}
            loading={savingRates}
            onClick={saveRates}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-900">
        <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">{t('Invoice billing entity')}</h3>
        <p className="mb-3 text-xs text-slate-500">{t('The name, GSTIN and address printed on every commission invoice sent to vendors.')}</p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-slate-500">{t('Legal name')}</span>
            <input
              value={values.platformLegalName}
              onChange={(e) => setField('platformLegalName', e.target.value)}
              className="h-10 w-56 rounded-lg border border-slate-300 px-2 dark:border-dark-600 dark:bg-dark-950"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-slate-500">{t('GSTIN')}</span>
            <input
              value={values.platformGstin}
              onChange={(e) => setField('platformGstin', e.target.value)}
              className="h-10 w-44 rounded-lg border border-slate-300 px-2 dark:border-dark-600 dark:bg-dark-950"
            />
          </label>
          <label className="flex flex-1 flex-col text-sm">
            <span className="mb-1 text-slate-500">{t('Address')}</span>
            <input
              value={values.platformAddress}
              onChange={(e) => setField('platformAddress', e.target.value)}
              className="h-10 min-w-[16rem] rounded-lg border border-slate-300 px-2 dark:border-dark-600 dark:bg-dark-950"
            />
          </label>
          <CustomButton
            type="button"
            className="h-10 border border-[#1c5bc7] bg-[#1c5bc7] px-6 text-sm text-white"
            label={t('Save')}
            loading={savingEntity}
            onClick={saveEntity}
          />
        </div>
      </section>
    </div>
  );
}
