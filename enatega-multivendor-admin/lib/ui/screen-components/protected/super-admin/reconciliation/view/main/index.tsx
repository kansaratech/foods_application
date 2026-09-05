'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faCircleXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';

import { GET_RECONCILIATION_REPORT } from '@/lib/api/graphql';
import { IReconciliationReportResponse } from '@/lib/utils/interfaces';

const money = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ReconciliationMain() {
  const t = useTranslations();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, loading } = useQuery<IReconciliationReportResponse>(GET_RECONCILIATION_REPORT, {
    variables: { startDate: startDate || undefined, endDate: endDate || undefined },
    fetchPolicy: 'cache-and-network',
  });
  const r = data?.reconciliationReport;
  const negativeWallets = (r?.negativeWalletStores ?? 0) + (r?.negativeWalletRiders ?? 0);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-dark-600 dark:bg-dark-900">
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-slate-500">{t('From')}</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 px-2 dark:border-dark-600 dark:bg-dark-950"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-slate-500">{t('To')}</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 px-2 dark:border-dark-600 dark:bg-dark-950"
          />
        </label>
        {loading && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            {t('Updating')}…
          </span>
        )}
        <p className="ml-auto max-w-xs text-xs text-slate-400">
          {t('The date range only affects the balance checks below — wallet balances are always shown as of right now.')}
        </p>
      </div>

      {loading && !r ? (
        <p className="text-sm text-gray-500">{t('Loading')}…</p>
      ) : r ? (
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('Current snapshot')}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-900">
                <p className="text-xs text-slate-500">{t('Store wallets owed')}</p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{money(r.storeWalletOutstanding)}</p>
                <p className="mt-1 text-xs text-slate-400">{t('What the platform currently owes stores')}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-900">
                <p className="text-xs text-slate-500">{t('Rider wallets owed')}</p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{money(r.riderWalletOutstanding)}</p>
                <p className="mt-1 text-xs text-slate-400">{t('What the platform currently owes riders')}</p>
              </div>
              <div className={`rounded-xl border p-4 ${negativeWallets > 0 ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30' : 'border-slate-200 bg-white dark:border-dark-600 dark:bg-dark-900'}`}>
                <p className="text-xs text-slate-500">{t('Wallets in the negative')}</p>
                <p className={`mt-1 text-xl font-bold ${negativeWallets > 0 ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                  {negativeWallets}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {r.negativeWalletStores} {t('stores')}, {r.negativeWalletRiders} {t('riders')}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('For the selected period')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-900">
                <p className="text-xs text-slate-500">{t('Rider cash deposits waiting for admin confirmation')}</p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {r.pendingRiderDeposits} {r.pendingRiderDeposits === 1 ? t('deposit') : t('deposits')}
                  <span className="ml-2 text-base font-semibold text-slate-500">{money(r.pendingRiderDepositTotal)}</span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">{t('Balance checks')}</p>
            <p className="mb-2 text-xs text-slate-500">
              {t('Each row should balance to ₹0 — a mismatch means money is unaccounted for.')}
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-dark-600 dark:bg-dark-900">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-dark-600 dark:bg-dark-950">
                    <th className="px-4 py-2">{t('Check')}</th>
                    <th className="px-4 py-2 text-right">{t('Expected')}</th>
                    <th className="px-4 py-2 text-right">{t('Actual')}</th>
                    <th className="px-4 py-2 text-right">{t('Difference')}</th>
                    <th className="px-4 py-2 text-center">{t('OK')}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.lines.map((l) => (
                    <tr key={l.label} className="border-b border-slate-100 last:border-0 dark:border-dark-800">
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{t(l.label)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{money(l.expected)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{money(l.actual)}</td>
                      <td className={`px-4 py-3 text-right ${Math.abs(l.delta) >= 1 ? 'font-semibold text-red-600' : 'text-slate-400'}`}>
                        {money(l.delta)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <FontAwesomeIcon
                          icon={l.ok ? faCircleCheck : faCircleXmark}
                          className={l.ok ? 'text-green-600' : 'text-red-600'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            {t('Generated')} {new Date(r.generatedAt).toLocaleString()}
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">{t('No data')}</p>
      )}
    </div>
  );
}
