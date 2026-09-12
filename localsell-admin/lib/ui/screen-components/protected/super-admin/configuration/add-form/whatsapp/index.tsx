'use client';

import { useState } from 'react';
import { Form, Formik } from 'formik';
import { useMutation, useQuery } from '@apollo/client';

import ConfigCard from '../../view/card';
import CustomTextField from '@/lib/ui/useable-components/input-field';
import CustomPasswordTextField from '@/lib/ui/useable-components/password-input-field';
import CustomButton from '@/lib/ui/useable-components/button';

import useToast from '@/lib/hooks/useToast';
import { useConfiguration } from '@/lib/hooks/useConfiguration';

import {
  GET_CONFIGURATION,
  GET_WHATSAPP_TEMPLATES,
  GET_WHATSAPP_USAGE_STATS,
  SAVE_WHATSAPP_CONFIGURATION,
  SYNC_WHATSAPP_TEMPLATES,
} from '@/lib/api/graphql';

interface IWhatsAppForm {
  whatsappCloudEnabled: boolean;
  whatsappPhoneNumberId: string;
  whatsappWabaId: string;
  whatsappApiVersion: string;
  whatsappOtpTemplate: string;
  whatsappOtpLang: string;
  whatsappAccessToken: string;
}

interface ITemplateRow {
  _id: string;
  key: string;
  metaName: string;
  language: string;
  category: string;
  status: string;
  isActive?: boolean;
  lastSyncedAt?: string | null;
}

const STATUS_TONE: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-800',
  PENDING: 'bg-amber-100 text-amber-800',
  MISSING: 'bg-red-100 text-red-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAUSED: 'bg-amber-100 text-amber-800',
  DISABLED: 'bg-gray-200 text-gray-700',
};

const WhatsAppAddForm = () => {
  const { showToast } = useToast();
  const {
    WHATSAPP_CLOUD_ENABLED,
    WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_WABA_ID,
    WHATSAPP_API_VERSION,
    WHATSAPP_OTP_TEMPLATE,
    WHATSAPP_OTP_LANG,
    WHATSAPP_ACCESS_TOKEN_SET,
  } = useConfiguration();

  const initialValues: IWhatsAppForm = {
    whatsappCloudEnabled: !!WHATSAPP_CLOUD_ENABLED,
    whatsappPhoneNumberId: WHATSAPP_PHONE_NUMBER_ID ?? '',
    whatsappWabaId: WHATSAPP_WABA_ID ?? '',
    whatsappApiVersion: WHATSAPP_API_VERSION ?? 'v22.0',
    whatsappOtpTemplate: WHATSAPP_OTP_TEMPLATE ?? 'localsell_otp',
    whatsappOtpLang: WHATSAPP_OTP_LANG ?? 'en_US',
    whatsappAccessToken: '',
  };

  const [saveConfig, { loading: saving }] = useMutation(
    SAVE_WHATSAPP_CONFIGURATION,
    {
      refetchQueries: [{ query: GET_CONFIGURATION }],
    }
  );

  const { data: tplData, refetch: refetchTemplates } = useQuery(
    GET_WHATSAPP_TEMPLATES,
    {
      fetchPolicy: 'cache-and-network',
    }
  );
  const { data: statsData } = useQuery(GET_WHATSAPP_USAGE_STATS, {
    variables: { days: 30 },
    fetchPolicy: 'cache-and-network',
  });

  const [syncTemplates, { loading: syncing }] = useMutation(
    SYNC_WHATSAPP_TEMPLATES
  );
  const [busy, setBusy] = useState(false);

  const templates: ITemplateRow[] = tplData?.whatsappTemplates ?? [];
  const stats = statsData?.whatsappUsageStats;

  const handleSubmit = (values: IWhatsAppForm) => {
    const token = values.whatsappAccessToken?.trim();
    saveConfig({
      variables: {
        configurationInput: {
          whatsappCloudEnabled: values.whatsappCloudEnabled,
          whatsappPhoneNumberId: values.whatsappPhoneNumberId.trim(),
          whatsappWabaId: values.whatsappWabaId.trim(),
          whatsappApiVersion: values.whatsappApiVersion.trim() || 'v22.0',
          whatsappOtpTemplate:
            values.whatsappOtpTemplate.trim() || 'localsell_otp',
          whatsappOtpLang: values.whatsappOtpLang.trim() || 'en_US',
          ...(token ? { whatsappAccessToken: token } : {}),
        },
      },
      onCompleted: () =>
        showToast({
          type: 'success',
          title: 'Saved',
          message: 'WhatsApp configuration updated',
          duration: 3000,
        }),
      onError: (error) =>
        showToast({
          type: 'error',
          title: 'Error',
          message: error.graphQLErrors?.[0]?.message || 'Could not save',
          duration: 3000,
        }),
    });
  };

  const runSync = async () => {
    setBusy(true);
    try {
      const res = await syncTemplates();
      const r = res.data?.syncWhatsappTemplates;
      showToast({
        type: r?.ok ? 'success' : 'error',
        title: r?.ok ? 'Templates synced' : 'Sync failed',
        message: r?.message ?? 'No response',
        duration: 5000,
      });
      await refetchTemplates();
    } catch (e) {
      showToast({
        type: 'error',
        title: 'Sync failed',
        message: (e as Error).message,
        duration: 4000,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="configuration-wide configuration-stack">
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, handleSubmit, handleChange, setFieldValue }) => (
          <Form onSubmit={handleSubmit}>
            <ConfigCard
              cardTitle="WhatsApp (Meta Cloud API)"
              buttonLoading={saving}
              toggleLabel="Enabled"
              toggleValue={values.whatsappCloudEnabled}
              toggleOnChange={() =>
                setFieldValue(
                  'whatsappCloudEnabled',
                  !values.whatsappCloudEnabled
                )
              }
            >
              <div className="configuration-fields">
                <CustomTextField
                  type="text"
                  name="whatsappPhoneNumberId"
                  placeholder="Phone number ID"
                  showLabel
                  value={values.whatsappPhoneNumberId}
                  onChange={handleChange}
                />
                <CustomTextField
                  type="text"
                  name="whatsappWabaId"
                  placeholder="WhatsApp Business Account ID"
                  showLabel
                  value={values.whatsappWabaId}
                  onChange={handleChange}
                />
                <CustomTextField
                  type="text"
                  name="whatsappApiVersion"
                  placeholder="Graph API version"
                  showLabel
                  value={values.whatsappApiVersion}
                  onChange={handleChange}
                />
                <CustomPasswordTextField
                  name="whatsappAccessToken"
                  placeholder={
                    WHATSAPP_ACCESS_TOKEN_SET
                      ? 'Access token (set — leave blank to keep)'
                      : 'Access token'
                  }
                  feedback={false}
                  showLabel
                  value={values.whatsappAccessToken}
                  onChange={handleChange}
                />
                <CustomTextField
                  type="text"
                  name="whatsappOtpTemplate"
                  placeholder="OTP template name"
                  showLabel
                  value={values.whatsappOtpTemplate}
                  onChange={handleChange}
                />
                <CustomTextField
                  type="text"
                  name="whatsappOtpLang"
                  placeholder="OTP template language"
                  showLabel
                  value={values.whatsappOtpLang}
                  onChange={handleChange}
                />
              </div>
              <p className="configuration-helper">
                The access token is a permanent System User token from Meta
                Business Settings. Leave it blank to keep the current value.
              </p>
            </ConfigCard>
          </Form>
        )}
      </Formik>

      <div className="configuration-card">
        <div className="configuration-card-heading">
          <h2>WhatsApp templates</h2>
          <CustomButton
            label={busy || syncing ? 'Syncing…' : 'Sync from Meta'}
            onClick={runSync}
            loading={busy || syncing}
            className="configuration-save"
            type="button"
          />
        </div>
        <div className="configuration-card-body">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2 pr-4">Event</th>
                  <th className="py-2 pr-4">Meta template</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Lang</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr
                    key={t._id}
                    className="border-t border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-2 pr-4 font-medium">{t.key}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {t.metaName}
                    </td>
                    <td className="py-2 pr-4">{t.category}</td>
                    <td className="py-2 pr-4">{t.language}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          STATUS_TONE[t.status] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-gray-400">
                      No templates registered yet — click “Sync from Meta”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {stats && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Last {stats.days} days: <strong>{stats.total}</strong> messages to{' '}
              <strong>{stats.uniqueRecipients}</strong> recipients
              {stats.rows?.length ? ' — ' : ''}
              {(stats.rows ?? [])
                .slice(0, 6)
                .map(
                  (r: {
                    userType?: string;
                    purpose: string;
                    status: string;
                    count: number;
                  }) =>
                    `${r.userType ?? '—'}/${r.purpose}/${r.status}: ${r.count}`
                )
                .join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppAddForm;
