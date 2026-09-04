'use client';

import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { GET_ADMIN_OPS_SNAPSHOT } from '@/lib/api/graphql';

const money = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

interface Snap {
  ordersToday: number;
  gmvToday: number;
  ordersWeek: number;
  gmvWeek: number;
  activeOrders: number;
  activeStores: number;
  totalStores: number;
  ridersOnline: number;
  totalRiders: number;
  pendingPayouts: number;
  pendingPayoutAmount: number;
  unbilledCommission: number;
  codCashOutstanding: number;
  waitlistUnnotified: number;
}

function Tile({
  label,
  value,
  sub,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'warn' | 'good';
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex flex-col items-start rounded-lg border p-3 text-left transition dark:border-dark-600 ${
        onClick ? 'hover:border-primary-color hover:shadow-sm' : 'cursor-default'
      }`}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <span
        className={`mt-1 text-xl font-bold ${
          tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-green-600' : 'text-gray-800 dark:text-white'
        }`}
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-gray-400">{sub}</span>}
    </button>
  );
}

export default function OpsSnapshot() {
  const t = useTranslations();
  const router = useRouter();
  const { data, loading } = useQuery(GET_ADMIN_OPS_SNAPSHOT, { fetchPolicy: 'cache-and-network' });
  const s: Snap | undefined = data?.adminOpsSnapshot;

  if (loading && !s) {
    return <div className="mb-6 h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-dark-900" />;
  }
  if (!s) return null;

  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{t('Today')}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <Tile label={t('Orders today')} value={String(s.ordersToday)} sub={`${money(s.gmvToday)} GMV`} />
        <Tile label={t('This week')} value={String(s.ordersWeek)} sub={`${money(s.gmvWeek)} GMV`} />
        <Tile
          label={t('Active orders')}
          value={String(s.activeOrders)}
          onClick={() => router.push('/management/orders')}
        />
        <Tile
          label={t('Stores live')}
          value={`${s.activeStores}/${s.totalStores}`}
          onClick={() => router.push('/general/stores')}
        />
        <Tile
          label={t('Riders online')}
          value={`${s.ridersOnline}/${s.totalRiders}`}
          onClick={() => router.push('/general/riders')}
        />
        <Tile
          label={t('Pending payouts')}
          value={String(s.pendingPayouts)}
          sub={money(s.pendingPayoutAmount)}
          tone={s.pendingPayouts > 0 ? 'warn' : undefined}
          onClick={() => router.push('/management/finance')}
        />
        <Tile
          label={t('COD held by riders')}
          value={money(s.codCashOutstanding)}
          tone={s.codCashOutstanding > 0 ? 'warn' : undefined}
          onClick={() => router.push('/management/finance')}
        />
      </div>
      {(s.unbilledCommission > 0 || s.waitlistUnnotified > 0) && (
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
          {s.unbilledCommission > 0 && (
            <span>
              {t('Unbilled commission (COD pickup)')}: <b>{money(s.unbilledCommission)}</b>
            </span>
          )}
          {s.waitlistUnnotified > 0 && (
            <span>
              {t('Waitlist to notify')}: <b>{s.waitlistUnnotified}</b>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
