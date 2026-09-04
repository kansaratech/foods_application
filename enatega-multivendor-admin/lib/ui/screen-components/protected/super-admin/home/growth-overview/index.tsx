'use client';
// Core
import { useEffect, useMemo, useState } from 'react';

// Prime React
import dynamic from 'next/dynamic';

// Lazy + client-only so Chart.js is a separate chunk, off the initial bundle.
const LineChart = dynamic(() => import('@/lib/ui/useable-components/line-chart'), {
  ssr: false,
});
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import { GET_DASHBOARD_USERS_BY_YEAR } from '@/lib/api/graphql';
import {
  IDashboardUsersByYearResponseGraphQL,
  IQueryResult,
} from '@/lib/utils/interfaces';
import DashboardUsersByYearStatsSkeleton from '@/lib/ui/useable-components/custom-skeletons/dasboard.user.year.stats.skeleton';
import { useTranslations } from 'next-intl';

// Dummy

export default function GrowthOverView() {
  // Hooks
  const t = useTranslations();

  // States
  const [chartData, setChartData] = useState({});
  const [chartOptions, setChartOptions] = useState({});

  // Query
  const { data, loading } = useQueryGQL(
    GET_DASHBOARD_USERS_BY_YEAR,
    {
      year: new Date().getFullYear(),
    },
    {
      fetchPolicy: 'cache-and-network',
      debounceMs: 300,
    }
  ) as IQueryResult<
    IDashboardUsersByYearResponseGraphQL | undefined,
    undefined
  >;

  const dashboardUsersByYear = useMemo(() => {
    if (!data) return null;
    return {
      usersCount: data?.getDashboardUsersByYear?.usersCount ?? [],
      vendorsCount: data?.getDashboardUsersByYear?.vendorsCount ?? [],
      restaurantsCount: data?.getDashboardUsersByYear?.restaurantsCount ?? [],
      ridersCount: data?.getDashboardUsersByYear?.ridersCount ?? 0,
    };
  }, [data]);

  // Handlers
  const onChartDataChange = () => {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue(
      '--text-color-secondary'
    );
    const surfaceBorder = '#4b5563'; // tailwind gray-600
    const data = {
      labels: [
        t('January'),
        t('February'),
        t('March'),
        t('April'),
        t('May'),
        t('June'),
        t('July'),
        t('August'),
        t('September'),
        t('October'),
        t('November'),
        t('December'),
      ],
      datasets: [
        {
          label: t('Users'),
          data: dashboardUsersByYear?.usersCount ?? [],
          fill: true,
          borderColor: '#1C5BC7',
          backgroundColor: 'rgba(28,91,199,0.12)',
          tension: 0.4,
        },
        {
          label: t('Vendors'),
          data: dashboardUsersByYear?.vendorsCount ?? [],
          fill: false,
          borderColor: '#16293F',
          backgroundColor: 'rgba(22,41,63,0.12)',
          tension: 0.4,
        },
        {
          label: t('Stores'),
          data: dashboardUsersByYear?.restaurantsCount ?? [],
          fill: false,
          borderColor: '#3E93DB',
          backgroundColor: 'rgba(62,147,219,0.12)',
          tension: 0.4,
        },
        {
          label: t('Riders'),
          data: dashboardUsersByYear?.ridersCount ?? [],
          fill: false,
          borderColor: '#94A3B8',
          backgroundColor: 'rgba(148,163,184,0.12)',
          tension: 0.4,
        },
      ],
    };
    const options = {
      maintainAspectRatio: false,
      aspectRatio: 0.6,

      plugins: {
        legend: {
          marginBottom: '20px',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            backgroundColor: textColor,
            color: textColor,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary,
          },
          grid: {
            color: surfaceBorder,
          },
        },
        y: {
          ticks: {
            color: textColorSecondary,
          },
          grid: {
            color: surfaceBorder,
          },
        },
      },
    };

    setChartData(data);
    setChartOptions(options);
  };
  // Use Effect
  useEffect(() => {
    onChartDataChange();
  }, [dashboardUsersByYear]);

  return (
    <div className="h-full rounded-xl border border-gray-200 bg-white p-5 dark:border-dark-600 dark:bg-dark-900">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
        {t('Growth Overview')}
      </h2>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
        {t('Tracking Stakeholders Growth Over the Year')}
      </p>
      <div className="mt-4">
        {loading ? (
          <DashboardUsersByYearStatsSkeleton />
        ) : (
          <LineChart data={chartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
}
