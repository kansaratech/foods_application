// Custom Components
import CustomTextField from '@/lib/ui/useable-components/input-field';
import { Dropdown } from 'primereact/dropdown';

// Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons';

// Interfaces
import { IRidersTableHeaderProps, TRiderStatusFilter } from '@/lib/utils/interfaces';
import { IQueryResult } from '@/lib/utils/interfaces';
import { IRiderZonesResponse } from '@/lib/utils/interfaces';
import { useTranslations } from 'next-intl';

// GraphQL
import { GET_ZONES } from '@/lib/api/graphql';
import { useQueryGQL } from '@/lib/hooks/useQueryQL';

// Constants
import { VEHICLE_TYPE } from '@/lib/utils/constants';

export default function RidersTableHeader({
  globalFilterValue,
  onGlobalFilterChange,
  zoneFilter,
  onZoneFilterChange,
  statusFilter,
  onStatusFilterChange,
  vehicleTypeFilter,
  onVehicleTypeFilterChange,
  onClearFilters,
}: IRidersTableHeaderProps) {
  // Hooks
  const t = useTranslations();

  const { data } = useQueryGQL(GET_ZONES, {
    fetchPolicy: 'cache-and-network',
  }) as IQueryResult<IRiderZonesResponse | undefined, undefined>;

  const zoneOptions = [
    { label: t('All zones'), value: null },
    ...(data?.zones.map((z) => ({ label: z.title, value: z._id })) ?? []),
  ];

  const statusOptions: { label: string; value: TRiderStatusFilter }[] = [
    { label: t('All status'), value: 'all' },
    { label: t('Online'), value: 'online' },
    { label: t('On delivery'), value: 'on_delivery' },
    { label: t('Offline'), value: 'offline' },
  ];

  const vehicleOptions = [
    { label: t('All vehicle types'), value: null },
    ...VEHICLE_TYPE.map((v) => ({ label: v.label, value: v.code })),
  ];

  const hasActiveFilters =
    !!globalFilterValue || !!zoneFilter || statusFilter !== 'all' || !!vehicleTypeFilter;

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-60">
          <CustomTextField
            type="text"
            name="riderFilter"
            maxLength={35}
            showLabel={false}
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t('Search riders by name, ID or phone') + '...'}
          />
        </div>
        <Dropdown
          value={zoneFilter}
          options={zoneOptions}
          onChange={(e) => onZoneFilterChange(e.value)}
          placeholder={t('All zones')}
          className="h-10 w-full border border-gray-300 dark:border-dark-600 dark:bg-dark-950 dark:text-white sm:w-44"
        />
        <Dropdown
          value={statusFilter}
          options={statusOptions}
          onChange={(e) => onStatusFilterChange(e.value)}
          placeholder={t('All status')}
          className="h-10 w-full border border-gray-300 dark:border-dark-600 dark:bg-dark-950 dark:text-white sm:w-44"
        />
        <Dropdown
          value={vehicleTypeFilter}
          options={vehicleOptions}
          onChange={(e) => onVehicleTypeFilterChange(e.value)}
          placeholder={t('All vehicle types')}
          className="h-10 w-full border border-gray-300 dark:border-dark-600 dark:bg-dark-950 dark:text-white sm:w-48"
        />
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex h-10 items-center gap-1.5 whitespace-nowrap px-2 text-sm font-medium text-[#1c5bc7] hover:underline"
          >
            <FontAwesomeIcon icon={faRotateLeft} />
            {t('Clear filters')}
          </button>
        )}
      </div>
    </div>
  );
}
