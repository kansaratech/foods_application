'use client';

import React, { useMemo, useState } from 'react';
import { Skeleton } from 'primereact/skeleton';
import { useTranslations } from 'next-intl';

import {
  formatNumber,
  formatNumberWithCurrency,
} from '@/lib/utils/methods/currency';
import { DASHBOARD_PAYMENT_METHOD } from '@/lib/utils/constants';
import {
  IPaymentMethodStatsComponentsProps,
  IPaymentMethodStatsBucket,
  TPaymentMethodKey,
} from '@/lib/utils/interfaces';

const PAYMENT_METHOD_KEYS: TPaymentMethodKey[] = ['all', 'cod', 'card'];

interface IChannelTotals {
  total_orders: number;
  total_sales: number;
  total_sales_without_delivery: number;
  total_delivery_fee: number;
}

const EMPTY_TOTALS: IChannelTotals = {
  total_orders: 0,
  total_sales: 0,
  total_sales_without_delivery: 0,
  total_delivery_fee: 0,
};

const addTotals = (a: IChannelTotals, b: IChannelTotals): IChannelTotals => ({
  total_orders: a.total_orders + b.total_orders,
  total_sales: a.total_sales + b.total_sales,
  total_sales_without_delivery:
    a.total_sales_without_delivery + b.total_sales_without_delivery,
  total_delivery_fee: a.total_delivery_fee + b.total_delivery_fee,
});

/** Reduce a bucket's raw `_type` items into pickup / delivery / combined totals. */
function splitBucket(bucket?: IPaymentMethodStatsBucket) {
  let pickup = { ...EMPTY_TOTALS };
  let delivery = { ...EMPTY_TOTALS };
  let explicitTotal: IChannelTotals | null = null;

  (bucket?.items ?? []).forEach(({ _type, data }) => {
    const value: IChannelTotals = { ...EMPTY_TOTALS, ...data };
    if (_type === 'isPickedUp') pickup = value;
    else if (_type === 'isNotPickedUp') delivery = value;
    else explicitTotal = value;
  });

  return {
    pickup,
    delivery,
    total: explicitTotal ?? addTotals(pickup, delivery),
  };
}

export default function PaymentMethodStats({
  loading,
  buckets,
  currency,
}: IPaymentMethodStatsComponentsProps) {
  const t = useTranslations();
  const [activeKey, setActiveKey] = useState<TPaymentMethodKey>('all');

  const bucketByKey = useMemo(() => {
    const map = new Map<TPaymentMethodKey, IPaymentMethodStatsBucket>();
    buckets.forEach((b) => map.set(b.key, b));
    return map;
  }, [buckets]);

  const { pickup, delivery, total } = useMemo(
    () => splitBucket(bucketByKey.get(activeKey)),
    [bucketByKey, activeKey]
  );

  const money = (n: number) => formatNumberWithCurrency(n, currency);

  const METRICS: {
    label: string;
    short: string;
    key: keyof IChannelTotals;
    icon: string;
    kind: 'count' | 'money';
  }[] = [
    {
      label: 'Total Orders',
      short: 'Orders',
      key: 'total_orders',
      icon: 'fa-bag-shopping',
      kind: 'count',
    },
    {
      label: 'Total Sales',
      short: 'Sales',
      key: 'total_sales',
      icon: 'fa-sack-dollar',
      kind: 'money',
    },
    {
      label: 'Total Sales Without Delivery',
      short: 'Net Sales',
      key: 'total_sales_without_delivery',
      icon: 'fa-coins',
      kind: 'money',
    },
    {
      label: 'Total Delivery Fee',
      short: 'Delivery Fee',
      key: 'total_delivery_fee',
      icon: 'fa-truck',
      kind: 'money',
    },
  ];

  const fmt = (kind: 'count' | 'money', n: number) =>
    kind === 'money' ? money(n) : formatNumber(n);

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-950">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-dark-600 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold text-gray-800 dark:text-white">
          {t('Sales by Payment Method')}
        </h2>

        {/* Pill tabs */}
        <div className="flex h-9 w-fit space-x-1 rounded-md bg-gray-100 p-1 dark:bg-dark-900">
          {PAYMENT_METHOD_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveKey(key)}
              className={`flex cursor-pointer items-center justify-center rounded px-4 text-sm transition-colors ${
                activeKey === key
                  ? 'bg-white font-semibold text-black shadow dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t(DASHBOARD_PAYMENT_METHOD[key])}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height="72px" />
            ))}
          </div>
          <Skeleton height="180px" />
        </div>
      ) : (
        <>
          {/* KPI strip — combined total for the active method */}
          <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-dark-600 sm:grid-cols-4">
            {METRICS.map((m) => (
              <div
                key={m.key}
                className="flex flex-col gap-1 bg-white p-4 dark:bg-dark-950"
              >
                <span className="flex items-center gap-2 whitespace-nowrap text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <i className={`fas ${m.icon} text-primary-color`} />
                  {t(m.short)}
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {fmt(m.kind, total[m.key])}
                </span>
              </div>
            ))}
          </div>

          {/* Pickup vs Delivery comparison */}
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="pb-2 font-medium">{t('Metric')}</th>
                  <th className="pb-2 text-right font-medium">
                    <i className="fas fa-store mr-1" />
                    {t('Pickup')}
                  </th>
                  <th className="pb-2 text-right font-medium">
                    <i className="fas fa-motorcycle mr-1" />
                    {t('Delivery')}
                  </th>
                  <th className="pb-2 text-right font-medium">{t('Total')}</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => (
                  <tr
                    key={m.key}
                    className="border-t border-gray-100 dark:border-dark-800"
                  >
                    <td className="py-2.5 text-gray-700 dark:text-gray-200">
                      {t(m.label)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300">
                      {fmt(m.kind, pickup[m.key])}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300">
                      {fmt(m.kind, delivery[m.key])}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                      {fmt(m.kind, total[m.key])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
