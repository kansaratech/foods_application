// Core
import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';

// Custom Components
import ActionMenu from '@/lib/ui/useable-components/action-menu';
import Image from '@/lib/ui/useable-components/safe-image';

// Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBicycle,
  faCar,
  faMotorcycle,
  faTruckPickup,
} from '@fortawesome/free-solid-svg-icons';

// Interfaces and Types
import { IActionMenuProps } from '@/lib/utils/interfaces/action-menu.interface';
import { IRiderResponse } from '@/lib/utils/interfaces/rider.interface';

// GraphQL
import { TOGGLE_RIDER } from '@/lib/api/graphql';
import { useMutation } from '@apollo/client';
import { ToastContext } from '@/lib/context/global/toast.context';
import { useTranslations } from 'next-intl';
import { toTextCase } from '@/lib/utils/methods';

const AVATAR_PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
];

const VEHICLE_ICON: Record<string, typeof faBicycle> = {
  bicycle: faBicycle,
  motorbike: faMotorcycle,
  car: faCar,
  pickup_truck: faTruckPickup,
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function avatarColorFor(id: string): string {
  const sum = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

export const RIDER_TABLE_COLUMNS = ({
  menuItems,
}: {
  menuItems: IActionMenuProps<IRiderResponse>['items'];
}) => {
  // Hooks
  const t = useTranslations();
  const router = useRouter();

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRider, setSelectedRider] = useState<{
    id: string;
    isActive: boolean;
  }>({ id: '', isActive: false });

  const { showToast } = useContext(ToastContext);

  // GraphQL mutation hook
  const [mutateToggle, { loading }] = useMutation(TOGGLE_RIDER, {
    refetchQueries: 'active',
    awaitRefetchQueries: true,
    onCompleted: () => {
      setIsLoading(false);
      showToast({
        type: 'success',
        title: t('Rider Status'),
        message: t('Status Changed Successfully'),
      });
    },
    onError: () => {
      setIsLoading(false);
      showToast({
        type: 'error',
        title: t('Rider Status'),
        message: t('Status Change Failed'),
      });
    },
  });

  // Handle availability toggle
  const onHandleAvailabilityChange = async (id: string) => {
    try {
      setIsLoading(true);
      setSelectedRider({ id, isActive: true });
      await mutateToggle({ variables: { id } });
    } catch (error) {
      showToast({
        type: 'error',
        title: t('Rider Status'),
        message: t('Something went wrong'),
      });
    } finally {
      setSelectedRider({ id: '', isActive: false });
      setIsLoading(false);
    }
  };

  return [
    {
      headerName: t('Rider'),
      propertyName: 'name',
      body: (rider: IRiderResponse) => (
        <div className="flex min-w-0 items-center gap-2.5">
          {rider.image ? (
            <Image
              src={rider.image}
              alt={rider.name}
              width={32}
              height={32}
              className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-xs font-semibold ${avatarColorFor(rider._id)}`}
            >
              {initialsOf(rider.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{rider.name}</p>
            <p className="truncate text-xs text-slate-400">{rider.username}</p>
          </div>
        </div>
      ),
    },
    {
      headerName: t('Contact'),
      propertyName: 'phone',
      body: (rider: IRiderResponse) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-700 dark:text-white">{rider.phone}</p>
          {rider.email && <p className="truncate text-xs text-slate-400">{rider.email}</p>}
        </div>
      ),
    },
    {
      headerName: t('Zone'),
      propertyName: 'zone',
      body: (rider: IRiderResponse) => rider.zone?.title ?? '-',
    },
    {
      headerName: t('Vehicle'),
      propertyName: 'vehicleType',
      body: (rider: IRiderResponse) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-white">
          <FontAwesomeIcon icon={VEHICLE_ICON[rider.vehicleType] ?? faBicycle} className="text-slate-400" />
          {toTextCase(rider.vehicleType?.replaceAll('_', ' ') ?? '', 'title')}
        </span>
      ),
    },
    {
      headerName: t('Availability'),
      propertyName: 'available',
      body: (rider: IRiderResponse) => {
        const isOnDelivery = !!rider.currentTask;
        const isBusy = rider._id === selectedRider.id && (loading || isLoading);
        const label = !rider.available ? t('Offline') : isOnDelivery ? t('On delivery') : t('Online');
        const colorClass = !rider.available
          ? 'bg-slate-100 text-slate-500'
          : isOnDelivery
            ? 'bg-amber-50 text-amber-700'
            : 'bg-green-50 text-green-700';
        const dotClass = !rider.available ? 'bg-slate-400' : isOnDelivery ? 'bg-amber-500' : 'bg-green-500';
        return (
          <button
            type="button"
            disabled={isOnDelivery || isBusy}
            onClick={(e) => {
              e.stopPropagation();
              if (!isOnDelivery) onHandleAvailabilityChange(rider._id);
            }}
            title={isOnDelivery ? t('Cannot change availability while on delivery') : undefined}
            className={`prevent-row-click inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colorClass} ${isOnDelivery ? 'cursor-default' : 'cursor-pointer hover:opacity-80'} ${isBusy ? 'opacity-50' : ''}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
            {label}
          </button>
        );
      },
    },
    {
      headerName: t('Current task'),
      propertyName: 'currentTask',
      body: (rider: IRiderResponse) =>
        rider.currentTask ? (
          <span className="text-sm text-slate-700 dark:text-white">
            {t('Order')} #{rider.currentTask.orderId}
          </span>
        ) : (
          <span className="text-sm text-slate-400">{t('No active task')}</span>
        ),
    },
    {
      headerName: t('Status'),
      propertyName: 'documentSummary',
      body: (rider: IRiderResponse) => {
        const summary = rider.documentSummary;
        const pending = !summary || summary.verified < summary.required;
        return (
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              pending ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
            }`}
          >
            {pending ? t('Verification pending') : t('Active')}
          </span>
        );
      },
    },
    {
      propertyName: 'actions',
      body: (rider: IRiderResponse) => (
        <div className="prevent-row-click flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/general/riders/${rider._id}`);
            }}
            className="text-sm font-medium text-[#1c5bc7] hover:underline"
          >
            {t('View profile')}
          </button>
          <ActionMenu items={menuItems} data={rider} />
        </div>
      ),
    },
  ];
};
