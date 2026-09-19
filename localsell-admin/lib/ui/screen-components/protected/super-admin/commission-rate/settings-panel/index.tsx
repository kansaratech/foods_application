'use client';
import FieldShell from '@/lib/ui/useable-components/form/field-shell';
import { InputText } from 'primereact/inputtext';
import Select from '@/lib/ui/useable-components/custom-dropdown/select';

import { useContext, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';

import {
  GET_CONFIGURATION,
  SAVE_COMMISSION_CONFIGURATION,
} from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import CustomButton from '@/lib/ui/useable-components/button';

interface ConfigFormState {
  defaultCommissionRate: string;
  commissionBillingCycle: string;
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

  const { data: configData, refetch: refetchConfig } =
    useQuery(GET_CONFIGURATION);
  const config = configData?.configuration;
  const [saveConfig] = useMutation(SAVE_COMMISSION_CONFIGURATION);

  const [form, setForm] = useState<ConfigFormState | null>(null);
  const [savingRates, setSavingRates] = useState(false);
  const [savingEntity, setSavingEntity] = useState(false);

  const values: ConfigFormState = form ?? {
    defaultCommissionRate: String(config?.defaultCommissionRate ?? 20),
    commissionBillingCycle: config?.commissionBillingCycle ?? 'MONTHLY',
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
    successMessage: string
  ) => {
    setSaving(true);
    try {
      await saveConfig({ variables: { configurationInput: input } });
      await refetchConfig();
      showToast({
        type: 'success',
        title: t('Commission'),
        message: successMessage,
        duration: 2000,
      });
    } catch {
      showToast({
        type: 'error',
        title: t('Error'),
        message: t('Could not save - please try again'),
        duration: 2500,
      });
    } finally {
      setSaving(false);
    }
  };

  const saveRates = () =>
    persistConfig(
      {
        defaultCommissionRate: parseFloat(values.defaultCommissionRate) || 0,
        commissionBillingCycle: values.commissionBillingCycle,
      },
      setSavingRates,
      t('Commission settings updated')
    );

  const saveEntity = () =>
    persistConfig(
      {
        platformLegalName: values.platformLegalName,
        platformGstin: values.platformGstin,
        platformAddress: values.platformAddress,
      },
      setSavingEntity,
      t('Invoice billing entity updated')
    );

  return (
    <div className="flex flex-col gap-6">
      <section className="finance-section">
        <header>
          <div>
            <h2>Default billing terms</h2>
            <p>
              Used when a store has no rate override. Changes apply to future
              delivered orders.
            </p>
          </div>
        </header>
        <form
          className="finance-form"
          onSubmit={(e) => {
            e.preventDefault();
            void saveRates();
          }}
        >
          <div className="finance-form-grid">
            <FieldShell
              htmlFor="default-commission"
              label="Default commission (%)"
              required
            >
              <InputText
                id="default-commission"
                className="ls-field"
                type="number"
                min={0}
                max={30}
                step="0.01"
                required
                value={values.defaultCommissionRate}
                onChange={(e) =>
                  setField('defaultCommissionRate', e.target.value)
                }
              />
            </FieldShell>
            <FieldShell htmlFor="billing-cycle" label="Billing cycle">
              <Select
                inputId="billing-cycle"
                value={values.commissionBillingCycle}
                onChange={(e) => setField('commissionBillingCycle', e.value)}
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </Select>
            </FieldShell>
          </div>
          <div className="finance-form-actions">
            <CustomButton
              type="submit"
              label="Save billing terms"
              loading={savingRates}
              disabled={!config}
            />
          </div>
        </form>
      </section>
      <section className="finance-section">
        <header>
          <div>
            <h2>Invoice issuer</h2>
            <p>Localsell&apos;s legal details displayed on commission statements.</p>
          </div>
        </header>
        <form
          className="finance-form"
          onSubmit={(e) => {
            e.preventDefault();
            void saveEntity();
          }}
        >
          <div className="finance-form-grid">
            <FieldShell htmlFor="issuer-name" label="Legal name" required>
              <InputText
                id="issuer-name"
                className="ls-field"
                required
                value={values.platformLegalName}
                onChange={(e) => setField('platformLegalName', e.target.value)}
              />
            </FieldShell>
            <FieldShell htmlFor="issuer-gstin" label="GSTIN (optional)">
              <InputText
                id="issuer-gstin"
                className="ls-field"
                maxLength={15}
                value={values.platformGstin}
                onChange={(e) => setField('platformGstin', e.target.value)}
              />
            </FieldShell>
          </div>
          <FieldShell htmlFor="issuer-address" label="Address">
            <textarea
              id="issuer-address"
              className="ls-field p-inputtextarea"
              rows={3}
              value={values.platformAddress}
              onChange={(e) => setField('platformAddress', e.target.value)}
            />
          </FieldShell>
          <div className="finance-form-actions">
            <CustomButton
              type="submit"
              label="Save invoice details"
              loading={savingEntity}
              disabled={!config}
            />
          </div>
        </form>
      </section>
    </div>
  );
}
