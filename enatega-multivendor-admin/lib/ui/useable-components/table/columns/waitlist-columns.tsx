import { useTranslations } from 'next-intl';

import { IWaitlistEntry } from '@/lib/utils/interfaces';

export const WAITLIST_COLUMNS = ({
  onToggleNotified,
  pendingId,
}: {
  onToggleNotified: (entry: IWaitlistEntry) => void;
  pendingId: string | null;
}) => {
  const t = useTranslations();

  return [
    {
      headerName: t('Area'),
      propertyName: 'areaLabel',
      body: (row: IWaitlistEntry) => (
        <div className="flex flex-col">
          <span className="font-semibold">{row.areaLabel || '—'}</span>
          <a
            href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
          </a>
        </div>
      ),
    },
    {
      headerName: t('Contact'),
      propertyName: 'email',
      body: (row: IWaitlistEntry) => (
        <div className="flex flex-col">
          <span>{row.email || '—'}</span>
          {row.phone && <span className="text-xs text-gray-500">{row.phone}</span>}
        </div>
      ),
    },
    {
      headerName: t('Source'),
      propertyName: 'source',
      body: (row: IWaitlistEntry) => (
        <span className="capitalize">{row.source || 'web'}</span>
      ),
    },
    {
      headerName: t('Requested'),
      propertyName: 'createdAt',
      body: (row: IWaitlistEntry) =>
        new Date(row.createdAt).toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
    },
    {
      headerName: t('Notified'),
      propertyName: 'notified',
      body: (row: IWaitlistEntry) => (
        <button
          type="button"
          disabled={pendingId === row._id}
          onClick={() => onToggleNotified(row)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
            row.notified
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {row.notified ? t('Notified') : t('Mark notified')}
        </button>
      ),
    },
  ];
};
