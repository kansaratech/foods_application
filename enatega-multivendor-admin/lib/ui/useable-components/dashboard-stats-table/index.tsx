import React from 'react';
import { IDashboardStatsTableComponentsProps } from '@/lib/utils/interfaces';
import DashboardStatsTableSkeleton from '../custom-skeletons/dashboard.stats.table.skeleton';
import {
  formatNumber,
  formatNumberWithCurrency,
} from '@/lib/utils/methods/currency';
import { useTranslations } from 'next-intl';

export default function DashboardStatsTable({
  loading,
  title,
  data,
  amountConfig,
}: IDashboardStatsTableComponentsProps) {
  const t = useTranslations();

  if (loading) return <DashboardStatsTableSkeleton />;

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-900 dark:text-white">
        <div className="border-b border-gray-100 px-5 py-3.5 dark:border-dark-600">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t(title)}
          </h2>
        </div>
        <div className="max-h-52 overflow-y-auto px-5 py-2">
          {data.length === 0 && (
            <p className="py-4 text-sm text-gray-400">{t('No data')}</p>
          )}
          {data.map((item, index: number) => (
            <div
              key={index}
              className={`flex items-center justify-between py-2.5 text-sm ${
                index !== data.length - 1
                  ? 'border-b border-gray-100 dark:border-dark-600'
                  : ''
              }`}
            >
              <span className="text-gray-500 dark:text-gray-300">
                {t(item.label)}
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {amountConfig
                  ? amountConfig?.format === 'currency'
                    ? formatNumberWithCurrency(item.value, amountConfig.currency)
                    : formatNumber(item.value)
                  : item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
