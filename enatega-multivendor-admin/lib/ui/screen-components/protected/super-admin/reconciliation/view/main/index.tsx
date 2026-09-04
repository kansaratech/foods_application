'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';

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

  return (
    <div className="p-3">
      <div className="mb-3 flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col">
          <span className="mb-1 text-gray-500">{t('From')}</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 rounded border border-gray-300 px-2 dark:bg-dark-950" />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-gray-500">{t('To')}</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 rounded border border-gray-300 px-2 dark:bg-dark-950" />
        </label>
      </div>

      {loading && !r ? (
        <p className="text-sm text-gray-500">{t('Loading')}…</p>
      ) : r ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { l: t('Store wallets owed'), v: money(r.storeWalletOutstanding) },
              { l: t('Rider wallets owed'), v: money(r.riderWalletOutstanding) },
              { l: t('Rider deposits to confirm'), v: `${r.pendingRiderDeposits} · ${money(r.pendingRiderDepositTotal)}` },
              {
                l: t('Negative wallets'),
                v: `${r.negativeWalletStores + r.negativeWalletRiders}`,
                warn: r.negativeWalletStores + r.negativeWalletRiders > 0,
              },
            ].map((c) => (
              <div key={c.l} className="rounded border p-3 dark:border-dark-600">
                <p className="text-xs text-gray-500">{c.l}</p>
                <p className={`text-lg font-semibold ${c.warn ? 'text-red-600' : ''}`}>{c.v}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold">{t('Balance checks')}</p>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-1">{t('Check')}</th>
                  <th className="py-1 text-right">{t('Expected')}</th>
                  <th className="py-1 text-right">{t('Actual')}</th>
                  <th className="py-1 text-right">{t('Difference')}</th>
                  <th className="py-1 text-center">{t('OK')}</th>
                </tr>
              </thead>
              <tbody>
                {r.lines.map((l) => (
                  <tr key={l.label} className="border-b border-dashed">
                    <td className="py-1">{l.label}</td>
                    <td className="py-1 text-right">{money(l.expected)}</td>
                    <td className="py-1 text-right">{money(l.actual)}</td>
                    <td className={`py-1 text-right ${Math.abs(l.delta) >= 1 ? 'font-semibold text-red-600' : ''}`}>
                      {money(l.delta)}
                    </td>
                    <td className="py-1 text-center">{l.ok ? '✓' : '✗'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
