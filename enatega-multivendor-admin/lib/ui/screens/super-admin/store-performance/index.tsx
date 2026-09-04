'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';

import { GET_STORE_PERFORMANCE } from '@/lib/api/graphql';
import Table from '@/lib/ui/useable-components/table';

const money = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

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
  const rows: Row[] = result?.rows ?? [];

  return (
    <div className="screen-container p-3">
      <h1 className="mb-1 text-xl font-bold">{t('Store Performance')}</h1>
      {result && (
        <p className="mb-3 text-xs text-gray-400">
          {new Date(result.periodStart).toLocaleDateString()} – {new Date(result.periodEnd).toLocaleDateString()} ·{' '}
          {result.total} {t('stores')}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col">
          <span className="mb-1 text-gray-500">{t('From')}</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 rounded border border-gray-300 px-2 dark:bg-dark-950" />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-gray-500">{t('To')}</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 rounded border border-gray-300 px-2 dark:bg-dark-950" />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-gray-500">{t('Search')}</span>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="h-9 rounded border border-gray-300 px-2 dark:bg-dark-950" />
        </label>
      </div>

      <Table
        data={loading ? [] : rows}
        loading={loading}
        moduleName="StorePerformance"
        totalRecords={result?.total ?? 0}
        currentPage={page}
        rowsPerPage={limit}
        onPageChange={(p: number, r: number) => { setPage(p); setLimit(r); }}
        columns={[
          { headerName: t('Store'), propertyName: 'name' },
          {
            headerName: t('Approval'),
            propertyName: 'approvalStatus',
            body: (r: Row) => <span className="text-xs">{r.approvalStatus}</span>,
          },
          { headerName: t('Orders'), propertyName: 'orders' },
          {
            headerName: t('Delivered'),
            propertyName: 'delivered',
            body: (r: Row) => `${r.delivered}`,
          },
          {
            headerName: t('Cancel rate'),
            propertyName: 'cancelRate',
            body: (r: Row) => (
              <span className={r.cancelRate > 15 ? 'font-semibold text-red-600' : ''}>{r.cancelRate}%</span>
            ),
          },
          { headerName: t('GMV'), propertyName: 'gmv', body: (r: Row) => money(r.gmv) },
          { headerName: t('Avg order'), propertyName: 'avgOrderValue', body: (r: Row) => money(r.avgOrderValue) },
          {
            headerName: t('Commission'),
            propertyName: 'commissionEarned',
            body: (r: Row) => money(r.commissionEarned),
          },
          {
            headerName: t('Rating'),
            propertyName: 'avgRating',
            body: (r: Row) => (r.avgRating != null ? `${r.avgRating} (${r.reviewCount})` : '—'),
          },
          { headerName: t('Wallet'), propertyName: 'walletBalance', body: (r: Row) => money(r.walletBalance) },
        ]}
      />
    </div>
  );
}
