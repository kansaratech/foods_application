'use client';

// Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserGroup,
  faSignal,
  faTruck,
  faFileLines,
} from '@fortawesome/free-solid-svg-icons';

// Interfaces
import { IQueryResult } from '@/lib/utils/interfaces';
import { IRiderStatsResponse } from '@/lib/utils/interfaces/rider.interface';

// GraphQL
import { GET_RIDER_STATS } from '@/lib/api/graphql';
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import { useTranslations } from 'next-intl';

export default function RiderStatCards() {
  const t = useTranslations();

  const { data, loading } = useQueryGQL(GET_RIDER_STATS, {
    fetchPolicy: 'cache-and-network',
  }) as IQueryResult<IRiderStatsResponse | undefined, undefined>;

  const stats = data?.riderStats;

  const cards = [
    {
      label: t('Total riders'),
      value: stats?.total ?? 0,
      icon: faUserGroup,
      iconClass: 'bg-blue-50 text-blue-600',
      valueClass: 'text-slate-900 dark:text-white',
    },
    {
      label: t('Online'),
      value: stats?.online ?? 0,
      icon: faSignal,
      iconClass: 'bg-green-50 text-green-600',
      valueClass: 'text-green-600',
    },
    {
      label: t('On delivery'),
      value: stats?.onDelivery ?? 0,
      icon: faTruck,
      iconClass: 'bg-amber-50 text-amber-600',
      valueClass: 'text-amber-600',
    },
    {
      label: t('Documents pending'),
      value: stats?.documentsPending ?? 0,
      icon: faFileLines,
      iconClass: 'bg-rose-50 text-rose-600',
      valueClass: 'text-rose-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 p-3 pb-0 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-900"
        >
          <div className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-full ${card.iconClass}`}>
            <FontAwesomeIcon icon={card.icon} />
          </div>
          <div>
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className={`text-xl font-bold ${card.valueClass}`}>{loading ? '—' : card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
