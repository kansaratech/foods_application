'use client';
import '@/lib/ui/useable-components/management-page/management.css';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faFileArrowDown,
} from '@fortawesome/free-solid-svg-icons';

import { GET_STORE_PERFORMANCE } from '@/lib/api/graphql';

import Table from '@/lib/ui/useable-components/table';

const money = (n: number) =>
  `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const iso = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);

interface Row {
  _id: string;
  name: string;
  approvalStatus: string;
  orders: number;
  delivered: number;
  cancelled: number;
  cancelRate: number;
  gmv: number;
  avgOrderValue: number;
  commissionEarned: number;
  avgRating: number | null;
  reviewCount: number;
  walletBalance: number;
}

export default function StorePerformanceScreen() {
  const t = useTranslations();
  const [dates, setDates] = useState<(Date | null)[] | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const startDate = iso(dates?.[0]);
  const endDate = iso(dates?.[1]);

  const { data, loading } = useQuery(GET_STORE_PERFORMANCE, {
    variables: {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search || undefined,
      page,
      limit,
    },
    fetchPolicy: 'cache-and-network',
  });
  const result = data?.storePerformance;
  const rows: Row[] = useMemo(() => result?.rows ?? [], [result]);

  const downloadCsv = () => {
    const esc = (x: unknown) => `"${String(x ?? '').replace(/"/g, '""')}"`;
    const head = [
      'Store',
      'Approval',
      'Orders',
      'Delivered',
      'Cancelled',
      'Cancel %',
      'GMV',
      'Avg order',
      'Commission',
      'Rating',
      'Reviews',
      'Wallet',
    ];
    const body = rows.map((r) =>
      [
        r.name,
        r.approvalStatus,
        r.orders,
        r.delivered,
        r.cancelled,
        r.cancelRate,
        r.gmv,
        r.avgOrderValue,
        r.commissionEarned,
        r.avgRating ?? '',
        r.reviewCount,
        r.walletBalance,
      ]
        .map(esc)
        .join(',')
    );
    const blob = new Blob([[head.map(esc).join(','), ...body].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store-performance_${startDate ?? 'all'}_${endDate ?? 'now'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="management-page management-store-performance">
      <div className="management-heading">
        <div>
          <div className="management-breadcrumb">
            Management / Store Performance
          </div>
          <h1>{t('Store Performance')}</h1>
          <p className="mt-1 text-xs text-slate-400">
            {result
              ? `${new Date(result.periodStart).toLocaleDateString()} – ${new Date(
                  result.periodEnd
                ).toLocaleDateString()} · ${result.total} ${t('stores')}`
              : t('Loading') + '…'}
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={!rows.length}
          className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#1c5bc7] hover:text-[#1c5bc7] disabled:opacity-50 dark:border-dark-600 dark:bg-dark-900 dark:text-white"
        >
          <FontAwesomeIcon icon={faFileArrowDown} />
          {t('Download CSV')}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-dark-600 dark:bg-dark-900">
        <span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 dark:border-dark-600">
          <FontAwesomeIcon
            icon={faCalendarDays}
            className="text-sm text-slate-400"
          />
          <Calendar
            value={dates as Date[] | null}
            onChange={(e) => {
              setDates(e.value as (Date | null)[]);
              setPage(1);
            }}
            selectionMode="range"
            readOnlyInput
            placeholder="All time"
            dateFormat="dd M yy"
            showButtonBar
            className="w-[190px] text-sm"
            pt={{ input: { className: 'border-0 p-0 text-sm shadow-none' } }}
          />
        </span>
        <InputText
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t('Search') + '…'}
          className="h-10 w-56 text-sm"
        />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white dark:border-dark-600 dark:bg-dark-900">
        <Table
          data={loading ? [] : rows}
          loading={loading}
          moduleName="StorePerformance"
          scrollable={false}
          totalRecords={result?.total ?? 0}
          currentPage={page}
          rowsPerPage={limit}
          onPageChange={(p: number, r: number) => {
            setPage(p);
            setLimit(r);
          }}
          columns={[
            { headerName: t('Store'), propertyName: 'name' },
            {
              headerName: t('Approval'),
              propertyName: 'approvalStatus',
              body: (r: Row) => {
                const ok = r.approvalStatus?.toUpperCase() === 'APPROVED';
                return (
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      ok
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {r.approvalStatus}
                  </span>
                );
              },
            },
            { headerName: t('Orders'), propertyName: 'orders' },
            { headerName: t('Delivered'), propertyName: 'delivered' },
            {
              headerName: t('Cancel rate'),
              propertyName: 'cancelRate',
              body: (r: Row) => (
                <span
                  className={
                    r.cancelRate > 15 ? 'font-semibold text-red-600' : ''
                  }
                >
                  {r.cancelRate}%
                </span>
              ),
            },
            {
              headerName: t('GMV'),
              propertyName: 'gmv',
              body: (r: Row) => money(r.gmv),
            },
            {
              headerName: t('Avg order'),
              propertyName: 'avgOrderValue',
              body: (r: Row) => money(r.avgOrderValue),
            },
            {
              headerName: t('Commission'),
              propertyName: 'commissionEarned',
              body: (r: Row) => money(r.commissionEarned),
            },
            {
              headerName: t('Rating'),
              propertyName: 'avgRating',
              body: (r: Row) =>
                r.avgRating != null ? `${r.avgRating} (${r.reviewCount})` : '—',
            },
            {
              headerName: t('Wallet'),
              propertyName: 'walletBalance',
              body: (r: Row) => money(r.walletBalance),
            },
          ]}
        />
      </div>
    </div>
  );
}
