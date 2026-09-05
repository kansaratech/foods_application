'use client';

import { useState } from 'react';
import FinanceCharts from './finance-charts';
import DateRangePicker from '@/lib/ui/useable-components/custom-date-range/range-picker';
import './finance-dashboard.css';
import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';

import { GET_PLATFORM_FINANCE_REPORT } from '@/lib/api/graphql';
import Table from '@/lib/ui/useable-components/table';
import {
  IFinanceRiderRow,
  IFinanceVendorRow,
  IPlatformFinanceReportResponse,
} from '@/lib/utils/interfaces';

const money = (n: number) =>
  `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'warn';
}) {
  return (
    <div className={`finance-metric ${tone || 'neutral'}`}>
      <p className="finance-metric-label">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${
          tone === 'warn'
            ? 'text-amber-600'
            : tone === 'good'
              ? 'text-green-600'
              : ''
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
  const [startDate, setStartDate] = useState(
    iso(new Date(now.getFullYear(), now.getMonth(), 1))
  );
  const [endDate, setEndDate] = useState(iso(now));

  const validDates = !!startDate && !!endDate && startDate <= endDate;
  const setRange = (days: number) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - days + 1);
    setStartDate(iso(start));
    setEndDate(iso(end));
  };
  const { data, loading, error, refetch } =
    useQuery<IPlatformFinanceReportResponse>(GET_PLATFORM_FINANCE_REPORT, {
      variables: { startDate, endDate },
      skip: !validDates,
      fetchPolicy: 'cache-and-network',
    });
  const r = data?.platformFinanceReport;

  return (
    <div className="finance-dashboard">
      <div className="finance-date-toolbar">
        <div className="finance-range-title">
          <i className="pi pi-calendar" aria-hidden="true" />
          <div>
            <strong>Financial overview</strong>
            <small>Choose a reporting period</small>
          </div>
        </div>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />
        <div className="finance-presets">
          <button onClick={() => setRange(7)}>Last 7 days</button>
          <button onClick={() => setRange(30)}>Last 30 days</button>
          <button
            onClick={() => {
              setStartDate(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
              setEndDate(iso(now));
            }}
          >
            This month
          </button>
        </div>
        <button
          className="finance-refresh"
          onClick={() => refetch()}
          disabled={loading || !validDates}
          aria-label="Refresh finance report"
        >
          <i
            className={`pi pi-refresh ${loading ? 'pi-spin' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {!validDates && (
        <p role="alert" className="finance-message">
          Choose a valid date range with the start date before the end date.
        </p>
      )}
      {error && (
        <p role="alert" className="finance-message">
          Unable to load the finance report. Use refresh to try again.
        </p>
      )}
      {loading && !r && (
        <div role="status" className="finance-loading">
          Loading financial overview...
        </div>
      )}
      {r && validDates && (
        <>
          <section className="finance-section">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t('Order volume & payouts')}
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              <Card
                label={t('Delivered orders')}
                value={String(r.deliveredOrders)}
              />
              <Card label={t('Order volume')} value={money(r.orderVolume)} />
              <Card label={t('Store payouts')} value={money(r.storePayouts)} />
              <Card
                label={t('of which GST (to stores)')}
                value={money(r.taxCollected)}
              />
              <Card label={t('Rider payouts')} value={money(r.riderPayouts)} />
            </div>
          </section>

          <FinanceCharts report={r} />

          <section className="finance-section">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t('Platform commission')}
              <small>
                Accrued, billed and paid in this period; outstanding across all
                time
              </small>
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card
                label={t('Accrued (this range)')}
                value={money(r.commissionAccrued)}
              />
              <Card label={t('Billed')} value={money(r.commissionBilled)} />
              <Card
                label={t('Paid')}
                value={money(r.commissionPaid)}
                tone="good"
              />
              <Card
                label={t('Outstanding')}
                value={money(r.commissionOutstanding)}
                tone="warn"
              />
            </div>
          </section>

          <section className="finance-section">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t('COD cash (riders)')}
              <small>
                Collected and remitted in this period; outstanding across all
                time
              </small>
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Card
                label={t('Collected (this range)')}
                value={money(r.codCashCollected)}
              />
              <Card
                label={t('Remitted (this range)')}
                value={money(r.codCashRemitted)}
                tone="good"
              />
              <Card
                label={t('Outstanding with riders')}
                value={money(r.codCashOutstanding)}
                tone="warn"
              />
            </div>
          </section>

          <section className="finance-section">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t('By vendor')}
            </h3>
            <Table
              data={r.perVendor.map((v) => ({ ...v, _id: v.vendor._id }))}
              moduleName="FinanceVendor"
              columns={[
                {
                  headerName: t('Vendor'),
                  propertyName: 'vendor.name',
                  body: (row: IFinanceVendorRow) =>
                    row.vendor.name || row.vendor.email || '—',
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
                  body: (row: IFinanceVendorRow) => (
                    <span className="font-semibold">
                      {money(row.commission)}
                    </span>
                  ),
                },
              ]}
            />
          </section>

          <section className="finance-section">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t('By rider')}
            </h3>
            <Table
              data={r.perRider.map((v) => ({ ...v, _id: v.rider._id }))}
              moduleName="FinanceRider"
              columns={[
                {
                  headerName: t('Rider'),
                  propertyName: 'rider.name',
                  body: (row: IFinanceRiderRow) =>
                    row.rider.name || row.rider.username || '—',
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
                    <span
                      className={
                        row.cashOutstanding > 0
                          ? 'font-semibold text-amber-600'
                          : ''
                      }
                    >
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
