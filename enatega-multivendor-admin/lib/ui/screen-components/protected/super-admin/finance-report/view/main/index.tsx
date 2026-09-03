'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';

import { GET_PLATFORM_FINANCE_REPORT } from '@/lib/api/graphql';
import Table from '@/lib/ui/useable-components/table';
import {
  IFinanceRiderRow,
  IFinanceVendorRow,
  IPlatformFinanceReportResponse,
} from '@/lib/utils/interfaces';

const money = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

function Card({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) {
  return (
    <div className="rounded border p-3 dark:border-dark-600">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${
          tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-green-600' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function FinanceReportMain() {
  const t = useTranslations();
  const now = new Date();
  const [startDate, setStartDate] = useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [endDate, setEndDate] = useState(iso(now));

  const { data, loading } = useQuery<IPlatformFinanceReportResponse>(GET_PLATFORM_FINANCE_REPORT, {
    variables: { startDate, endDate },
    fetchPolicy: 'cache-and-network',
  });
  const r = data?.platformFinanceReport;

  return (
    <div className="flex flex-col gap-6 p-3">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-gray-500">{t('From')}</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 rounded border border-gray-300 px-2 dark:bg-dark-950"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-gray-500">{t('To')}</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 rounded border border-gray-300 px-2 dark:bg-dark-950"
          />
        </label>
        {loading && <span className="text-sm text-gray-400">{t('Loading')}…</span>}
      </div>

      {r && (
        <>
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t('Order volume & payouts')}
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              <Card label={t('Delivered orders')} value={String(r.deliveredOrders)} />
              <Card label={t('Order volume')} value={money(r.orderVolume)} />
              <Card label={t('Store payouts')} value={money(r.storePayouts)} />
              <Card label={t('of which GST (to stores)')} value={money(r.taxCollected)} />
              <Card label={t('Rider payouts')} value={money(r.riderPayouts)} />
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t('Platform commission')}
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card label={t('Accrued (this range)')} value={money(r.commissionAccrued)} />
              <Card label={t('Billed')} value={money(r.commissionBilled)} />
              <Card label={t('Paid')} value={money(r.commissionPaid)} tone="good" />
              <Card label={t('Outstanding')} value={money(r.commissionOutstanding)} tone="warn" />
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t('COD cash (riders)')}
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Card label={t('Collected (this range)')} value={money(r.codCashCollected)} />
              <Card label={t('Remitted (this range)')} value={money(r.codCashRemitted)} tone="good" />
              <Card label={t('Outstanding with riders')} value={money(r.codCashOutstanding)} tone="warn" />
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{t('By vendor')}</h3>
            <Table
              data={r.perVendor.map((v) => ({ ...v, _id: v.vendor._id }))}
              moduleName="FinanceVendor"
              columns={[
                {
                  headerName: t('Vendor'),
                  propertyName: 'vendor',
                  body: (row: IFinanceVendorRow) => row.vendor.name || row.vendor.email || '—',
                },
                { headerName: t('Orders'), propertyName: 'orders' },
                {
                  headerName: t('Food subtotal'),
                  propertyName: 'foodSubtotal',
                  body: (row: IFinanceVendorRow) => money(row.foodSubtotal),
                },
                {
                  headerName: t('Commission'),
                  propertyName: 'commission',
                  body: (row: IFinanceVendorRow) => <span className="font-semibold">{money(row.commission)}</span>,
                },
              ]}
            />
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{t('By rider')}</h3>
            <Table
              data={r.perRider.map((v) => ({ ...v, _id: v.rider._id }))}
              moduleName="FinanceRider"
              columns={[
                {
                  headerName: t('Rider'),
                  propertyName: 'rider',
                  body: (row: IFinanceRiderRow) => row.rider.name || row.rider.username || '—',
                },
                { headerName: t('Deliveries'), propertyName: 'deliveries' },
                {
                  headerName: t('Earned'),
                  propertyName: 'earned',
                  body: (row: IFinanceRiderRow) => money(row.earned),
                },
                {
                  headerName: t('Cash collected'),
                  propertyName: 'cashCollected',
                  body: (row: IFinanceRiderRow) => money(row.cashCollected),
                },
                {
                  headerName: t('Cash outstanding'),
                  propertyName: 'cashOutstanding',
                  body: (row: IFinanceRiderRow) => (
                    <span className={row.cashOutstanding > 0 ? 'font-semibold text-amber-600' : ''}>
                      {money(row.cashOutstanding)}
                    </span>
                  ),
                },
              ]}
            />
          </section>
        </>
      )}
    </div>
  );
}
