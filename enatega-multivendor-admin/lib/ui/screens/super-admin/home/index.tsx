'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useContext, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { Calendar } from 'primereact/calendar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowTrendUp,
  faBagShopping,
  faCalendarDays,
  faChevronRight,
  faFileArrowDown,
  faIndianRupeeSign,
  faMotorcycle,
  faMoneyBillWave,
  faReceipt,
  faStore,
  faTriangleExclamation,
  faUsers,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';

import { LayoutContext } from '@/lib/context/global/layout.context';
import { useUserContext } from '@/lib/hooks/useUser';

// Chart.js wrapper — client-only, separate chunk.
const Chart = dynamic(() => import('@/lib/ui/useable-components/line-chart'), {
  ssr: false,
  loading: () => <div className="h-[260px] animate-pulse rounded-lg bg-slate-100 dark:bg-dark-600" />,
});
import {
  GET_ADMIN_OPS_SNAPSHOT,
  GET_DASHBOARD_ORDERS_BY_TYPE,
  GET_DASHBOARD_SALES_BY_TYPE,
  GET_DASHBOARD_USERS,
  GET_DASHBOARD_USERS_BY_YEAR,
  GET_PENDING_STORE_DOCUMENTS,
  GET_STORE_PERFORMANCE,
} from '@/lib/api/graphql';

const money = (v = 0) =>
  `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const pctText = (curr: number, prev: number) => {
  if (!prev) return null;
  const p = ((curr - prev) / prev) * 100;
  return { up: p >= 0, label: `${p >= 0 ? '↑' : '↓'} ${Math.abs(p).toFixed(1)}%` };
};

const CARD =
  'rounded-xl border border-slate-200 bg-white dark:border-dark-600 dark:bg-dark-900';

const PRESETS = [
  { label: 'Today', value: 'today', days: 0 },
  { label: 'Last 7 days', value: '7', days: 6 },
  { label: 'Last 30 days', value: '30', days: 29 },
  { label: 'This month', value: 'month', days: -1 },
  { label: 'Custom', value: 'custom', days: -1 },
];

function rangeForPreset(preset: string): [Date, Date] {
  const end = new Date();
  const start = new Date();
  if (preset === 'today') start.setHours(0, 0, 0, 0);
  else if (preset === 'month') start.setDate(1);
  else start.setDate(end.getDate() - (preset === '30' ? 29 : 6));
  start.setHours(0, 0, 0, 0);
  return [start, end];
}

function MetricCard({
  label,
  value,
  icon,
  tone,
  delta,
  hint,
  progress,
  onClick,
}: any) {
  const tones: Record<string, string> = {
    blue: 'bg-[#e8f0fc] text-[#1c5bc7]',
    sky: 'bg-[#eaf4fc] text-[#3e93db]',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${CARD} min-w-0 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#1c5bc7] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#1c5bc7]/30`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tones[tone]}`}
        >
          <FontAwesomeIcon icon={icon} className="text-sm" />
        </span>
      </div>
      <p className="mt-2 text-[22px] font-bold leading-none text-slate-900 dark:text-white">
        {value}
      </p>
      {progress !== undefined ? (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-dark-600">
          <div
            className="h-full rounded-full bg-[#1c5bc7]"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : (
        <div className="mt-3 min-h-[18px] text-xs">
          {delta && (
            <span
              className={`font-semibold ${delta.up ? 'text-green-600' : 'text-red-500'}`}
            >
              {delta.label}
            </span>
          )}
          {hint && <span className="ml-2 text-slate-400">{hint}</span>}
        </div>
      )}
    </button>
  );
}

function BreakdownChart({
  rows,
  currency,
}: {
  rows: { label: string; value: number }[];
  currency?: boolean;
}) {
  if (!rows.some((r) => r.value > 0))
    return (
      <p className="flex h-[260px] items-center justify-center text-sm text-slate-400">
        No activity in this range yet
      </p>
    );
  const data = {
    labels: rows.map((r) =>
      r.label.charAt(0) + r.label.slice(1).toLowerCase(),
    ),
    datasets: [
      {
        label: currency ? 'Revenue' : 'Orders',
        data: rows.map((r) => r.value),
        backgroundColor: '#1c5bc7',
        hoverBackgroundColor: '#17499e',
        borderRadius: 6,
        maxBarThickness: 44,
      },
    ],
  };
  const options = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (c: any) =>
            currency ? money(c.parsed.y) : `${c.parsed.y} orders`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b' } },
      y: {
        beginAtZero: true,
        grid: { color: '#e2e8f0' },
        ticks: {
          color: '#64748b',
          callback: (v: any) => (currency ? `₹${Number(v) / 1000}k` : v),
        },
      },
    },
  };
  return (
    <div className="mt-3">
      <Chart type="bar" data={data} options={options} height={260} />
    </div>
  );
}

export default function Home() {
  const { isSuperAdminSidebarVisible } = useContext(LayoutContext);
  const { user } = useUserContext();
  const router = useRouter();

  const [preset, setPreset] = useState('7');
  const [range, setRange] = useState<[Date, Date]>(() => rangeForPreset('7'));
  const [rangeSelection, setRangeSelection] = useState<(Date | null)[]>(() =>
    rangeForPreset('7'),
  );
  const [start, end] = range;
  const [chartMode, setChartMode] = useState<'revenue' | 'orders'>('revenue');

  const dateVars = { startDate: iso(start), endDate: iso(end) };

  const { data: snapData } = useQuery(GET_ADMIN_OPS_SNAPSHOT, {
    variables: dateVars,
    fetchPolicy: 'cache-and-network',
  });
  const { data: usersData } = useQuery(GET_DASHBOARD_USERS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: yearData } = useQuery(GET_DASHBOARD_USERS_BY_YEAR, {
    variables: { year: new Date().getFullYear() },
    fetchPolicy: 'cache-and-network',
  });
  const { data: ordersData } = useQuery(GET_DASHBOARD_ORDERS_BY_TYPE, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: salesData } = useQuery(GET_DASHBOARD_SALES_BY_TYPE, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: perfData } = useQuery(GET_STORE_PERFORMANCE, {
    variables: { ...dateVars, page: 1, limit: 100 },
    fetchPolicy: 'cache-and-network',
  });
  const { data: docsData } = useQuery(GET_PENDING_STORE_DOCUMENTS, {
    variables: { page: 1, limit: 1 },
    fetchPolicy: 'cache-and-network',
  });

  const s = snapData?.adminOpsSnapshot ?? {};
  const users = usersData?.getDashboardUsers ?? {};
  const change = yearData?.getDashboardUsersByYear?.percentageChange ?? {};
  const ordersByType = ordersData?.getDashboardOrdersByType ?? [];
  const salesByType = salesData?.getDashboardSalesByType ?? [];
  const perfRows = [...(perfData?.storePerformance?.rows ?? [])].sort(
    (a: any, b: any) => b.gmv - a.gmv,
  );
  const pendingDocs = docsData?.pendingStoreDocuments?.total ?? 0;

  const name = user?.name || user?.email?.split('@')[0] || 'Admin';
  const salesDelta = pctText(s.gmvToday ?? 0, s.gmvPrev ?? 0);
  const ordersDelta = pctText(s.ordersToday ?? 0, s.ordersPrev ?? 0);

  const metrics = [
    {
      label: 'Gross sales',
      value: money(s.gmvToday),
      icon: faIndianRupeeSign,
      tone: 'blue',
      route: '/management/finance-report',
      delta: salesDelta,
      hint: 'vs previous period',
    },
    {
      label: 'Orders',
      value: s.ordersToday ?? 0,
      icon: faBagShopping,
      tone: 'blue',
      route: '/management/orders',
      delta: ordersDelta,
      hint: 'vs previous period',
    },
    {
      label: 'Active orders',
      value: s.activeOrders ?? 0,
      icon: faArrowTrendUp,
      tone: 'green',
      route: '/management/orders',
      hint: 'live right now',
    },
    {
      label: 'Stores live',
      value: `${s.activeStores ?? 0} / ${s.totalStores ?? 0}`,
      icon: faStore,
      tone: 'blue',
      route: '/general/stores',
      progress: s.totalStores ? (s.activeStores / s.totalStores) * 100 : 0,
    },
    {
      label: 'Riders online',
      value: `${s.ridersOnline ?? 0} / ${s.totalRiders ?? 0}`,
      icon: faMotorcycle,
      tone: 'sky',
      route: '/general/riders',
      progress: s.totalRiders ? (s.ridersOnline / s.totalRiders) * 100 : 0,
    },
    {
      label: 'Pending payouts',
      value: money(s.pendingPayoutAmount),
      icon: faWallet,
      tone: 'amber',
      route: '/management/finance',
      delta: s.pendingPayouts
        ? { up: false, label: `${s.pendingPayouts} to review` }
        : null,
    },
  ];

  const stakeholders = [
    {
      label: 'Customers',
      value: users.usersCount ?? 0,
      pct: change.usersPercent,
      route: '/general/users',
      icon: faUsers,
    },
    {
      label: 'Vendors',
      value: users.vendorsCount ?? 0,
      pct: change.vendorsPercent,
      route: '/general/vendors',
      icon: faStore,
    },
    {
      label: 'Stores',
      value: users.restaurantsCount ?? 0,
      pct: change.restaurantsPercent,
      route: '/general/stores',
      icon: faStore,
    },
    {
      label: 'Riders',
      value: users.ridersCount ?? 0,
      pct: change.ridersPercent,
      route: '/general/riders',
      icon: faMotorcycle,
    },
  ];

  const attention = [
    {
      icon: faReceipt,
      title: 'Store documents to review',
      sub: 'KYC / bank details awaiting approval',
      count: pendingDocs,
      route: '/management/store-documents',
    },
    {
      icon: faWallet,
      title: 'Payouts to review',
      sub: money(s.pendingPayoutAmount) + ' pending',
      count: s.pendingPayouts ?? 0,
      route: '/management/finance',
    },
    {
      icon: faStore,
      title: 'Offline stores',
      sub: 'Live stores that are currently unavailable',
      count: Math.max(0, (s.totalStores ?? 0) - (s.activeStores ?? 0)),
      route: '/general/stores',
    },
    {
      icon: faMoneyBillWave,
      title: 'COD held by riders',
      sub: 'Cash collected, not yet remitted',
      count: s.codCashOutstanding ?? 0,
      money: true,
      route: '/management/rider-cash',
    },
    {
      icon: faReceipt,
      title: 'Unbilled commission',
      sub: 'COD-pickup commission not yet billed',
      count: s.unbilledCommission ?? 0,
      money: true,
      route: '/management/commission-bills',
    },
    {
      icon: faUsers,
      title: 'Waitlist to notify',
      sub: 'Sign-ups waiting for a service area',
      count: s.waitlistUnnotified ?? 0,
      route: '/management/waitlist',
    },
  ].filter((a) => Number(a.count) > 0);

  const chartRows = chartMode === 'revenue' ? salesByType : ordersByType;

  const summary = [
    ['Gross sales', money(s.gmvToday)],
    ['Orders', String(s.ordersToday ?? 0)],
    [
      'Avg. order value',
      money(s.ordersToday ? (s.gmvToday || 0) / s.ordersToday : 0),
    ],
    ['Pending payout', money(s.pendingPayoutAmount)],
  ];

  const onPreset = (v: string) => {
    setPreset(v);
    if (v !== 'custom') {
      const nextRange = rangeForPreset(v);
      setRange(nextRange);
      setRangeSelection(nextRange);
    }
  };

  const exportCsv = () => {
    const esc = (x: any) => `"${String(x ?? '').replace(/"/g, '""')}"`;
    const lines: string[] = [
      `LocalSell dashboard,${iso(start)} to ${iso(end)}`,
      '',
      'Metric,Value',
      ...metrics.map((m) => `${esc(m.label)},${esc(m.value)}`),
      '',
      'Stakeholder,Count,Change %',
      ...stakeholders.map(
        (k) => `${esc(k.label)},${k.value},${k.pct ?? ''}`,
      ),
      '',
      'Top stores (by GMV),Orders,GMV,Cancel %,Rating',
      ...perfRows.map(
        (r: any) =>
          `${esc(r.name)},${r.orders},${r.gmv},${r.cancelRate},${r.avgRating ?? ''}`,
      ),
      '',
      'Attention needed,Count',
      ...attention.map(
        (a) => `${esc(a.title)},${a.money ? a.count : a.count}`,
      ),
      '',
      `${chartMode === 'revenue' ? 'Revenue' : 'Orders'} by type,Value`,
      ...chartRows.map((r: any) => `${esc(r.label)},${r.value}`),
    ];
    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `localsell-dashboard_${iso(start)}_${iso(end)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`${isSuperAdminSidebarVisible ? 'w-[99%]' : 'w-full'} h-full overflow-x-hidden bg-[#f8fafc] dark:bg-dark-950`}
    >
      <main className="mx-auto max-w-[1660px] space-y-5 p-4 lg:p-6">
        <header className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Welcome back, {name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Showing{' '}
                {start.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                –{' '}
                {end.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#1c5bc7] hover:text-[#1c5bc7] dark:border-dark-600 dark:bg-dark-900 dark:text-white"
            >
              <FontAwesomeIcon icon={faFileArrowDown} />
              Export CSV
            </button>
          </div>

          <div className={`${CARD} flex flex-col gap-3 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between`}>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm dark:bg-dark-700 sm:grid-cols-4">
              {PRESETS.filter((p) => p.value !== 'custom').map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onPreset(p.value)}
                  aria-pressed={preset === p.value}
                  className={`rounded-md px-4 py-2 font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#1c5bc7]/30 ${
                    preset === p.value
                      ? 'bg-white text-[#1c5bc7] shadow-sm dark:bg-dark-900'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-dark-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">Custom range</span>
              <Calendar
                value={rangeSelection}
                onChange={(e) => {
                  const selected = (e.value ?? []) as (Date | null)[];
                  setRangeSelection(selected);
                  if (selected[0] && selected[1]) {
                    const from = new Date(selected[0]);
                    const to = new Date(selected[1]);
                    from.setHours(0, 0, 0, 0);
                    to.setHours(23, 59, 59, 999);
                    setRange([from, to]);
                    setPreset('custom');
                  }
                }}
                selectionMode="range"
                maxDate={new Date()}
                dateFormat="d M yy"
                showIcon
                readOnlyInput
                hideOnRangeSelection
                icon={<FontAwesomeIcon icon={faCalendarDays} />}
                placeholder="Select start and end dates"
                inputClassName="h-10 w-full cursor-pointer border-slate-200 px-3 text-sm font-medium text-slate-700 dark:border-dark-600 dark:bg-dark-900 dark:text-white"
                className="w-full sm:w-[18rem]"
              />
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {metrics.map((m) => (
            <MetricCard
              key={m.label}
              {...m}
              onClick={() => router.push(m.route)}
            />
          ))}
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
          <section className={`${CARD} p-5 shadow-sm`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Revenue &amp; orders breakdown
              </h2>
              <div className="inline-flex rounded-md border border-slate-200 p-0.5 text-xs dark:border-dark-600">
                {(['revenue', 'orders'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setChartMode(mode)}
                    className={`rounded px-3 py-1.5 font-semibold capitalize ${
                      chartMode === mode
                        ? 'bg-[#e8f0fc] text-[#1c5bc7]'
                        : 'text-slate-500'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <BreakdownChart rows={chartRows} currency={chartMode === 'revenue'} />
            <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-center dark:border-dark-600 dark:bg-dark-600 sm:grid-cols-4">
              {summary.map(([label, val]) => (
                <div
                  key={label}
                  className="bg-white py-3 dark:bg-dark-900"
                >
                  <small className="block text-[10px] uppercase tracking-wide text-slate-400">
                    {label}
                  </small>
                  <b className="text-sm text-slate-900 dark:text-white">
                    {val}
                  </b>
                </div>
              ))}
            </div>
          </section>

          <section className={`${CARD} flex flex-col p-5 shadow-sm`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Top stores
              </h2>
              <button
                type="button"
                onClick={() => router.push('/management/store-performance')}
                className="text-xs font-semibold text-[#1c5bc7] hover:underline"
              >
                View all →
              </button>
            </div>
            <div className="mt-2 flex-1">
              {perfRows.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">
                  No store activity in this range
                </p>
              )}
              {perfRows.slice(0, 5).map((r: any, i: number) => (
                <button
                  key={r._id}
                  type="button"
                  onClick={() => router.push('/management/store-performance')}
                  className="grid w-full grid-cols-[20px_1fr_auto] items-center gap-3 border-b border-slate-100 py-2.5 text-left last:border-0 dark:border-dark-600"
                >
                  <span className="text-xs font-bold text-slate-400">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate text-sm text-slate-900 dark:text-white">
                      {r.name}
                    </b>
                    <small className="text-[11px] text-slate-500">
                      {r.orders} orders · {r.cancelRate}% cancelled
                    </small>
                  </span>
                  <b className="text-sm text-slate-900 dark:text-white">
                    {money(r.gmv)}
                  </b>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Platform
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stakeholders.map((k) => {
              const down = typeof k.pct === 'number' && k.pct < 0;
              return (
                <button
                  key={k.label}
                  type="button"
                  onClick={() => router.push(k.route)}
                  className={`${CARD} p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#1c5bc7] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#1c5bc7]/30`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {k.label}
                    </span>
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e8f0fc] text-[#1c5bc7]">
                      <FontAwesomeIcon icon={k.icon} className="text-sm" />
                    </span>
                  </div>
                  <p className="mt-2 text-[22px] font-bold leading-none text-slate-900 dark:text-white">
                    {k.value}
                  </p>
                  <p className="mt-2 min-h-[18px] text-xs">
                    {typeof k.pct === 'number' ? (
                      <span
                        className={`font-semibold ${down ? 'text-red-500' : 'text-green-600'}`}
                      >
                        {down ? '↓' : '↑'} {Math.abs(k.pct).toFixed(1)}%
                        <span className="ml-1 font-normal text-slate-400">
                          this year
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Tap to manage</span>
                    )}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <section className={`${CARD} overflow-hidden shadow-sm`}>
            <h2 className="border-b border-slate-100 px-5 py-3.5 text-base font-semibold text-slate-900 dark:border-dark-600 dark:text-white">
              Attention needed
            </h2>
            {attention.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                All clear — nothing needs your attention 🎉
              </p>
            )}
            {attention.map((a) => (
              <button
                key={a.title}
                type="button"
                onClick={() => router.push(a.route)}
                className="flex w-full items-center gap-3 border-b border-slate-100 px-5 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-dark-600 dark:hover:bg-dark-950"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600">
                  <FontAwesomeIcon icon={a.icon} className="text-sm" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm text-slate-900 dark:text-white">
                    {a.title}
                  </b>
                  <small className="text-[11px] text-slate-500">{a.sub}</small>
                </span>
                <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                  {a.money ? money(a.count) : a.count}
                </span>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="shrink-0 text-xs text-slate-400"
                />
              </button>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
