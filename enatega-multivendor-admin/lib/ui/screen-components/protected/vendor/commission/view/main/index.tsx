'use client';

import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';

import { GET_MY_COMMISSION_SUMMARY } from '@/lib/api/graphql';
import Table from '@/lib/ui/useable-components/table';
import { ICommissionBill, IMyCommissionSummaryResponse } from '@/lib/utils/interfaces';

const money = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const day = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const statusClass: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  WAIVED: 'bg-gray-200 text-gray-600',
};

export default function MyCommissionMain() {
  const t = useTranslations();
  const { data, loading } = useQuery<IMyCommissionSummaryResponse>(GET_MY_COMMISSION_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });
  const s = data?.myCommissionSummary;

  return (
    <div className="flex flex-col gap-5 p-3">
      <div className="rounded border p-4 text-sm dark:border-dark-600">
        <p className="text-gray-500">
          {t(
            'The platform charges commission on the food total of every delivered order and invoices you each',
          )}{' '}
          {s?.cycle === 'YEARLY' ? t('year') : t('month')}.
        </p>
      </div>

      {s && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="rounded border p-3 dark:border-dark-600">
              <p className="text-xs uppercase text-gray-500">{t('This period so far')}</p>
              <p className="mt-1 text-lg font-semibold">{money(s.currentPeriodCommission)}</p>
              <p className="text-xs text-gray-400">
                {s.currentPeriodOrderCount} {t('orders')} · {day(s.currentPeriodStart)} – {day(s.currentPeriodEnd)}
              </p>
            </div>
            <div className="rounded border p-3 dark:border-dark-600">
              <p className="text-xs uppercase text-gray-500">{t('Outstanding (unpaid bills)')}</p>
              <p className="mt-1 text-lg font-semibold text-amber-600">{money(s.outstandingTotal)}</p>
            </div>
            <div className="rounded border p-3 dark:border-dark-600">
              <p className="text-xs uppercase text-gray-500">{t('Billing cycle')}</p>
              <p className="mt-1 text-lg font-semibold">
                {s.cycle === 'YEARLY' ? t('Yearly') : t('Monthly')}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{t('Bills')}</h3>
            <Table
              data={loading ? [] : s.bills}
              loading={loading}
              moduleName="MyCommission"
              columns={[
                {
                  headerName: t('Period'),
                  propertyName: 'periodStart',
                  body: (b: ICommissionBill) => `${day(b.periodStart)} – ${day(b.periodEnd)}`,
                },
                { headerName: t('Orders'), propertyName: 'orderCount' },
                {
                  headerName: t('Commission'),
                  propertyName: 'commissionTotal',
                  body: (b: ICommissionBill) => <span className="font-semibold">{money(b.commissionTotal)}</span>,
                },
                {
                  headerName: t('Status'),
                  propertyName: 'status',
                  body: (b: ICommissionBill) => (
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass[b.status] ?? ''}`}>
                      {t(b.status)}
                    </span>
                  ),
                },
                {
                  headerName: t('Paid on'),
                  propertyName: 'paidAt',
                  body: (b: ICommissionBill) => day(b.paidAt),
                },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
