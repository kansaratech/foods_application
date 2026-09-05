'use client';

// Components
import HeaderText from '@/lib/ui/useable-components/header-text';

// Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFileArrowUp } from '@fortawesome/free-solid-svg-icons';

// GraphQL
import { GET_RIDERS } from '@/lib/api/graphql';
import { useLazyQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { IRidersDataResponse } from '@/lib/utils/interfaces/rider.interface';

export default function RiderHeader() {
  // Hooks
  const t = useTranslations();
  const router = useRouter();

  const [fetchRiders, { loading: exporting }] = useLazyQuery<IRidersDataResponse>(GET_RIDERS, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      const esc = (x: unknown) => `"${String(x ?? '').replace(/"/g, '""')}"`;
      const head = ['Name', 'Username', 'Phone', 'Zone', 'Vehicle type', 'Available'];
      const body = data.riders.map((r) =>
        [r.name, r.username, r.phone, r.zone?.title ?? '', r.vehicleType, r.available ? 'Yes' : 'No']
          .map(esc)
          .join(','),
      );
      const blob = new Blob([[head.map(esc).join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'riders.csv';
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <div className="sticky top-0 z-10 w-full flex-shrink-0 bg-white p-4 shadow-sm dark:bg-dark-950">
      <p className="text-xs text-slate-400">
        {t('General')} / {t('Riders')}
      </p>
      <div className="mt-1 flex w-full flex-wrap items-start justify-between gap-3">
        <div>
          <HeaderText className="heading" text={t('Riders')} />
          <p className="mt-1 text-sm text-slate-500">{t('Manage delivery partners, assignments and availability')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchRiders()}
            disabled={exporting}
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#1c5bc7] hover:text-[#1c5bc7] disabled:opacity-50 dark:border-dark-600 dark:bg-dark-900 dark:text-white"
          >
            <FontAwesomeIcon icon={faFileArrowUp} />
            {t('Export')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/general/riders/create')}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#1c5bc7] px-4 text-sm font-semibold text-white transition hover:bg-[#164ba3]"
          >
            <FontAwesomeIcon icon={faPlus} />
            {t('Add rider')}
          </button>
        </div>
      </div>
    </div>
  );
}
