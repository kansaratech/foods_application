'use client';
import ActionButton from '@/lib/ui/useable-components/button/action-button';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  dateString,
  dateValue,
} from '@/lib/ui/useable-components/date-input/calendar';
import SegmentedControl from '@/lib/ui/useable-components/custom-tab/segmented-control';
import DateRangePicker from '@/lib/ui/useable-components/custom-date-range/range-picker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowTrendUp,
  faBagShopping,
  faChevronRight,
  faFileArrowDown,
  faIndianRupeeSign,
  faReceipt,
  faStore,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

import { useUserContext } from '@/lib/hooks/useUser';

// Chart.js wrapper — client-only, separate chunk.
const Chart = dynamic(() => import('@/lib/ui/useable-components/line-chart'), {
  ssr: false,
  loading: () => (
    <div className="h-[260px] animate-pulse rounded-lg bg-slate-100 dark:bg-dark-600" />
  ),
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
const iso = dateString;
const pctText = (curr: number, prev: number) => {
  if (!prev) return null;
  const p = ((curr - prev) / prev) * 100;
  return {
    up: p >= 0,
    label: `${p >= 0 ? '↑' : '↓'} ${Math.abs(p).toFixed(1)}%`,
  };
};

const CARD =
  'rounded-xl border border-slate-200 bg-white dark:border-dark-600 dark:bg-dark-900';

const PRESETS = [
  { label: 'today', value: 'today', days: 0 },
  { label: 'last_7_days', value: '7', days: 6 },
  { label: 'last_30_days', value: '30', days: 29 },
  { label: 'this_month', value: 'month', days: -1 },
  { label: 'custom', value: 'custom', days: -1 },
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
    blue: 'bg-primary-light text-primary',
    sky: 'bg-[#eaf4fc] text-brand-sky',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${CARD} min-w-0 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
            className="h-full rounded-full bg-primary"
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
  const t = useTranslations('home_dashboard');
  if (!rows.some((r) => r.value > 0))
    return (
      <p className="flex h-[260px] items-center justify-center text-sm text-slate-400">
        {t('no_activity_in_this_range_yet')}
      </p>
    );
  const data = {
    labels: rows.map((r) => {
      const type = r.label.toUpperCase().replace(/[ _-]/g, '');
      const key = (
        { DELIVERY: 'delivery', PICKUP: 'pickup', DINEIN: 'dine_in' } as Record<
          string,
          string
        >
      )[type];
      return key ? t(key) : r.label;
    }),
    datasets: [
      {
        label: currency ? t('revenue') : t('orders'),
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
            currency
              ? money(c.parsed.y)
              : t('count_orders', { count: c.parsed.y }),
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
  const t = useTranslations('home_dashboard');
  const locale = useLocale();
  const { user } = useUserContext();
  const router = useRouter();

  const [preset, setPreset] = useState('7');
  const [range, setRange] = useState<[Date, Date]>(() => rangeForPreset('7'));
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
    (a: any, b: any) => b.gmv - a.gmv
  );
  const pendingDocs = docsData?.pendingStoreDocuments?.total ?? 0;

  const name = user?.name || user?.email?.split('@')[0] || t('admin');
  const salesDelta = pctText(s.gmvToday ?? 0, s.gmvPrev ?? 0);
  const ordersDelta = pctText(s.ordersToday ?? 0, s.ordersPrev ?? 0);

  const metrics = [
    {
      label: t('gross_sales'),
      value: money(s.gmvToday),
      icon: faIndianRupeeSign,
      tone: 'blue',
      route: '/management/finance-report',
      delta: salesDelta,
      hint: t('vs_previous_period'),
    },
    {
      label: t('orders'),
      value: s.ordersToday ?? 0,
      icon: faBagShopping,
      tone: 'blue',
      route: '/management/orders',
      delta: ordersDelta,
      hint: t('vs_previous_period'),
    },
    {
      label: t('active_orders'),
      value: s.activeOrders ?? 0,
      icon: faArrowTrendUp,
      tone: 'green',
      route: '/management/orders',
      hint: t('live_right_now'),
    },
    {
      label: t('stores_live'),
      value: `${s.activeStores ?? 0} / ${s.totalStores ?? 0}`,
      icon: faStore,
      tone: 'blue',
      route: '/general/stores',
      progress: s.totalStores ? (s.activeStores / s.totalStores) * 100 : 0,
    },
  ];

  const stakeholders = [
    {
      label: t('customers'),
      value: users.usersCount ?? 0,
      pct: change.usersPercent,
      route: '/general/users',
      icon: faUsers,
    },
    {
      label: t('vendors'),
      value: users.vendorsCount ?? 0,
      pct: change.vendorsPercent,
      route: '/general/vendors',
      icon: faStore,
    },
    {
      label: t('stores'),
      value: users.restaurantsCount ?? 0,
      pct: change.restaurantsPercent,
      route: '/general/stores',
      icon: faStore,
    },
  ];

  const attention = [
    {
      icon: faReceipt,
      title: t('store_documents_to_review'),
      sub: t('kyc_bank_details_awaiting_approval'),
      count: pendingDocs,
      route: '/management/store-documents',
    },
    {
      icon: faStore,
      title: t('offline_stores'),
      sub: t('live_stores_that_are_currently_unavailable'),
      count: Math.max(0, (s.totalStores ?? 0) - (s.activeStores ?? 0)),
      route: '/general/stores',
    },
    {
      icon: faReceipt,
      title: t('unbilled_commission'),
      sub: t('delivered_order_commission_not_yet_billed'),
      count: s.unbilledCommission ?? 0,
      money: true,
      route: '/management/finance/billing',
    },
    {
      icon: faUsers,
      title: t('waitlist_to_notify'),
      sub: t('sign_ups_waiting_for_a_service_area'),
      count: s.waitlistUnnotified ?? 0,
      route: '/management/waitlist',
    },
  ].filter((a) => Number(a.count) > 0);

  const chartRows = chartMode === 'revenue' ? salesByType : ordersByType;

  const summary = [
    [t('gross_sales'), money(s.gmvToday)],
    [t('orders'), String(s.ordersToday ?? 0)],
    [
      t('avg_order_value'),
      money(s.ordersToday ? (s.gmvToday || 0) / s.ordersToday : 0),
    ],
    [t('unbilled_commission'), money(s.unbilledCommission)],
  ];

  const onPreset = (v: string) => {
    setPreset(v);
    if (v !== 'custom') {
      const nextRange = rangeForPreset(v);
      setRange(nextRange);
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
      ...stakeholders.map((k) => `${esc(k.label)},${k.value},${k.pct ?? ''}`),
      '',
      'Top stores (by GMV),Orders,GMV,Cancel %,Rating',
      ...perfRows.map(
        (r: any) =>
          `${esc(r.name)},${r.orders},${r.gmv},${r.cancelRate},${r.avgRating ?? ''}`
      ),
      '',
      'Attention needed,Count',
      ...attention.map((a) => `${esc(a.title)},${a.money ? a.count : a.count}`),
      '',
      `${chartMode === 'revenue' ? t('revenue') : t('orders')} by type,Value`,
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
      className="min-h-full w-full bg-[#f8fafc] dark:bg-dark-950"
    >
      <main className="w-full space-y-5 p-4 lg:p-6 xl:p-8">
        <header className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t('welcome_back_name', { name })}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {t('showing_start_end', {
                  start: start.toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }),
                  end: end.toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }),
                })}
              </p>
            </div>
            <ActionButton
              variant="secondary"
              type="button"
              onClick={exportCsv}
              className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-dark-600 dark:bg-dark-900 dark:text-white"
            >
              <FontAwesomeIcon icon={faFileArrowDown} />
              {t('export_csv')}
            </ActionButton>
          </div>

          <div
            className={`${CARD} flex flex-col gap-3 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between`}
          >
            <SegmentedControl
              label={t('reporting_period')}
              options={PRESETS.filter((p) => p.value !== 'custom').map(
                (p) => p.value
              )}
              selectedTab={preset}
              setSelectedTab={onPreset}
              renderLabel={(value) =>
                t(PRESETS.find((p) => p.value === value)?.label ?? value)
              }
            />

            <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t('custom_range')}
              </span>
              <DateRangePicker
                startDate={dateString(range[0])}
                endDate={dateString(range[1])}
                showLabel={false}
                label={t('reporting_dates')}
                onChange={(start, end) => {
                  const from = dateValue(start),
                    to = dateValue(end);
                  if (from && to) {
                    to.setHours(23, 59, 59, 999);
                    setRange([from, to]);
                    setPreset('custom');
                  }
                }}
              />
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {t('revenue_orders_breakdown')}
              </h2>
              <div className="inline-flex rounded-md border border-slate-200 p-0.5 text-xs dark:border-dark-600">
                {(['revenue', 'orders'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setChartMode(mode)}
                    aria-pressed={chartMode === mode}
                    className={`rounded px-3 py-1.5 font-semibold capitalize ${
                      chartMode === mode
                        ? 'bg-primary-light text-primary'
                        : 'text-slate-500'
                    }`}
                  >
                    {t(mode === 'revenue' ? 'revenue' : 'orders')}
                  </button>
                ))}
              </div>
            </div>
            <BreakdownChart
              rows={chartRows}
              currency={chartMode === 'revenue'}
            />
            <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-center dark:border-dark-600 dark:bg-dark-600 sm:grid-cols-4">
              {summary.map(([label, val]) => (
                <div key={label} className="bg-white py-3 dark:bg-dark-900">
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {t('top_stores')}
              </h2>
              <button
                type="button"
                onClick={() => router.push('/management/store-performance')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {t('view_all')}
              </button>
            </div>
            <div className="mt-2 flex-1">
              {perfRows.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">
                  {t('no_store_activity_in_this_range')}
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
                      {t('orders_orders_rate_cancelled', {
                        orders: r.orders,
                        rate: r.cancelRate,
                      })}
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
            {t('platform')}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stakeholders.map((k) => {
              const down = typeof k.pct === 'number' && k.pct < 0;
              return (
                <button
                  key={k.label}
                  type="button"
                  onClick={() => router.push(k.route)}
                  className={`${CARD} p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {k.label}
                    </span>
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-light text-primary">
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
                          {t('this_year')}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        {t('tap_to_manage')}
                      </span>
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
              {t('attention_needed')}
            </h2>
            {attention.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                {t('all_clear_nothing_needs_your_attention')}
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
