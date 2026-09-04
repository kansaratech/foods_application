// Core
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Interface
import { IStatsCardProps } from '@/lib/utils/interfaces';

// Methods
import { formatNumber, formatNumberWithCurrency } from '@/lib/utils/methods';
import DashboardStatsCardSkeleton from '../custom-skeletons/dasboard.stats.card.skeleton';

export default function StatsCard({
  label,
  total,
  description,
  currencySymbol,
  route,
  loading = false,
  amountConfig,
  icon,
  isClickable = true,
}: IStatsCardProps) {
  const stats_card = () => (
    <div
      className={`flex min-h-[112px] flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 transition dark:border-dark-600 dark:bg-dark-900 dark:text-white ${
        isClickable
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-primary-color hover:shadow-md'
          : 'cursor-default'
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </span>
        {icon ? (
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-light text-primary-color dark:bg-dark-600">
            <FontAwesomeIcon icon={icon} className="text-sm" />
          </span>
        ) : (
          currencySymbol && (
            <span className="text-sm font-medium text-gray-400">{currencySymbol}</span>
          )
        )}
      </div>
      <div className="mt-2 text-3xl font-bold leading-none text-gray-900 dark:text-white">
        {currencySymbol ? currencySymbol : ''}
        {amountConfig
          ? amountConfig?.format === 'currency'
            ? formatNumberWithCurrency(total, amountConfig.currency)
            : formatNumber(total)
          : total}
      </div>
      {description && (
        <div className="mt-2 text-xs text-gray-400">{description}</div>
      )}
    </div>
  );

  return loading ? (
    <DashboardStatsCardSkeleton />
  ) : isClickable ? (
    <Link href={route ?? ''}>{stats_card()}</Link>
  ) : (
    stats_card()
  );
}
