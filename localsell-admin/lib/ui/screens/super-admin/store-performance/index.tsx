'use client';
import '@/lib/ui/useable-components/management-page/management.css';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import DateRangePicker from '@/lib/ui/useable-components/custom-date-range/range-picker';
import CustomButton from '@/lib/ui/useable-components/button';
import { InputText } from 'primereact/inputtext';

import { GET_STORE_PERFORMANCE } from '@/lib/api/graphql';

import Table from '@/lib/ui/useable-components/table';

const money = (n: number) =>
  `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

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
  commissionRate: number;
  commissionEarned: number;
  avgRating: number | null;
  reviewCount: number;
  walletBalance: number;
}

interface StorePerformanceScreenProps {
  breadcrumb?: string;
  heading?: string;
}

export default function StorePerformanceScreen({
  breadcrumb = 'Management / Store Performance',
  heading = 'Store Performance',
}: StorePerformanceScreenProps = {}) {
  const t = useTranslations();
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { startDate, endDate } = dateRange;

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
      'Commission Rate',
      'Commission',
      'Rating',
      'Reviews',
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
        `${r.commissionRate}%`,
        r.commissionEarned,
        r.avgRating ?? '',
        r.reviewCount,
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
    a.download = `store-performance_${startDate || 'all'}_${endDate || 'now'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="management-page management-store-performance">
      <div className="management-heading">
        <div>
          <div className="management-breadcrumb">{t(breadcrumb)}</div>
          <h1>{t(heading)}</h1>
          <p className="mt-1 text-xs text-slate-400">
            {result
              ? `${new Date(result.periodStart).toLocaleDateString()} – ${new Date(
                  result.periodEnd
                ).toLocaleDateString()} · ${result.total} ${t('stores')}`
              : t('Loading') + '…'}
          </p>
        </div>
        <CustomButton
          type="button"
          onClick={downloadCsv}
          disabled={!rows.length}
          outlined
          label={t('Download CSV')}
          icon="pi pi-download"
        />
      </div>

      <div className="ls-filter-toolbar">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          placeholder="All time"
          showLabel={false}
          allowClear
          onChange={(startDate, endDate) => {
            setDateRange({ startDate, endDate });
            setPage(1);
          }}
        />
        <InputText
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t('Search') + '…'}
          className="ls-field ls-filter-search"
          aria-label={t('Search')}
        />
      </div>

      <div className="ls-table-section">
        <Table
          data={loading ? [] : rows}
          loading={loading}
          moduleName="StorePerformance"
          minWidth="76rem"
          scrollable={false}
          totalRecords={result?.total ?? 0}
          currentPage={page}
          rowsPerPage={limit}
          onPageChange={(p: number, r: number) => {
            setPage(p);
            setLimit(r);
          }}
          columns={[
            {
              headerName: t('Store'),
              propertyName: 'name',
              style: { minWidth: '17rem' },
            },
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
              headerName: t('Commission Rate'),
              propertyName: 'commissionRate',
              body: (r: Row) => `${r.commissionRate}%`,
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

          ]}
        />
      </div>
    </div>
  );
}
