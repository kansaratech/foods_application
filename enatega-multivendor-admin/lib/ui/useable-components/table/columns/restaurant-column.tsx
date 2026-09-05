'use client';

// Core
import Image from '@/lib/ui/useable-components/safe-image';
import { useContext, useState } from 'react';

// Context
import { ToastContext } from '@/lib/context/global/toast.context';

// Apollo Client
import { ApolloError, useMutation } from '@apollo/client';

// Custom Components
import CustomInputSwitch from '../../custom-input-switch';

// Interfaces
import { IActionMenuProps, IRestaurantResponse } from '@/lib/utils/interfaces';

// GraphQL Queries and Mutations
import { DELETE_RESTAURANT } from '@/lib/api/graphql';

// Components
import ActionMenu from '../../action-menu';
import Link from 'next/link';
import { StoreListRow } from '@/lib/ui/screen-components/protected/super-admin/restaurants/view/main/stores-overview';
import { useTranslations } from 'next-intl';

export const RESTAURANT_TABLE_COLUMNS = ({
  menuItems,
}: {
  menuItems: IActionMenuProps<IRestaurantResponse>['items'];
}) => {
  // Hooks
  const t = useTranslations();

  // Context
  const { showToast } = useContext(ToastContext);

  // State
  const [deletingRestaurant, setDeletingRestaurant] = useState<{
    id: string;
    isActive: boolean;
  }>({ id: '', isActive: false });

  // API
  const [deleteRestaurant] = useMutation(DELETE_RESTAURANT, {
    onCompleted: () => {
      showToast({
        type: 'success',
        title: t('Store Status'),
        message: `${t('Store has been marked as')} ${deletingRestaurant.isActive ? t('in-active') : t('active')}`,
        duration: 2000,
      });
    },
    onError,
  });

  // Handle checkbox change
  const onHandleRestaurantStatusChange = async (
    isActive: boolean,
    id: string
  ) => {
    try {
      setDeletingRestaurant({
        id,
        isActive,
      });
      await deleteRestaurant({ variables: { id: id } });
    } catch (err) {
      showToast({
        type: 'error',
        title: t('Store Status'),
        message: `${t('Store marked as')} ${isActive ? t('in-active') : t('active')} ${t('failed')}`,
        duration: 2000,
      });
    } finally {
      setDeletingRestaurant({
        ...deletingRestaurant,
        id: '',
      });
    }
  };

  function onError({ graphQLErrors, networkError }: ApolloError) {
    showToast({
      type: 'error',
      title: t('Store Status Change'),
      message:
        graphQLErrors[0]?.message ??
        networkError?.message ??
        t('Store Status Change Failed'),
      duration: 2500,
    });

    setDeletingRestaurant({
      ...deletingRestaurant,
      id: '',
    });
  }

  return [
    {
      headerName: t('Image'),
      propertyName: 'image',
      hidden: true,
      body: (restaurant: IRestaurantResponse) => {
        return (
          <Image
            width={30}
            height={30}
            alt={t('Store')}
            src={
              restaurant.image
                ? restaurant.image
                : 'https://images.unsplash.com/photo-1595418917831-ef942bd9f9ec?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
            }
          />
        );
      },
    },
    {
      headerName: t('Store'),
      propertyName: 'name',
      body: (restaurant: IRestaurantResponse) => (
        <div className="flex min-w-[13rem] items-center gap-3">
          <Image
            width={32}
            height={32}
            alt={restaurant.name || t('Store')}
            src={restaurant.image || '/assets/images/png/logo.png'}
            className="h-8 w-8 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {restaurant.name}
            </p>
            <p className="max-w-[13rem] truncate text-[11px] text-slate-400">
              ID: {restaurant.unique_restaurant_id || restaurant._id}
            </p>
          </div>
        </div>
      ),
    },
    {
      headerName: t('Vendor'),
      propertyName: 'owner.email',
      body: (store: StoreListRow) => (
        <div className="stores-cell">
          <span>{store.owner?.email || '?'}</span>
          <small>{store.username}</small>
        </div>
      ),
    },
    {
      headerName: 'Location',
      propertyName: 'address',
      body: (store: StoreListRow) => (
        <div className="stores-cell">
          <span>
            {[store.city, store.state].filter(Boolean).join(', ') ||
              store.address ||
              '?'}
          </span>
          {store.city && <small>{store.address}</small>}
        </div>
      ),
    },
    {
      headerName: 'Setup',
      propertyName: 'documentSummary.verified',
      body: (store: StoreListRow) => {
        const summary = store.documentSummary;
        if (!summary) return <span className="text-slate-400">?</span>;
        const complete = summary.verified >= summary.required;
        return (
          <span
            title="Verified required documents"
            className={`stores-badge ${complete ? 'green' : 'amber'}`}
          >
            <i
              className={`pi pi-${complete ? 'check-circle' : 'info-circle'}`}
            />
            {summary.verified}/{summary.required}{' '}
            {complete
              ? 'Complete'
              : `Missing ${summary.required - summary.verified}`}
          </span>
        );
      },
    },
    {
      headerName: t('Approval'),
      propertyName: 'approvalStatus',
      body: (rowData: IRestaurantResponse & { approvalStatus?: string }) => {
        const s = rowData.approvalStatus || 'UNKNOWN';
        const cls: Record<string, string> = {
          APPROVED: 'bg-green-100 text-green-700',
          PENDING: 'bg-amber-100 text-amber-700',
          REJECTED: 'bg-red-100 text-red-700',
          SUSPENDED: 'bg-gray-200 text-gray-600',
        };
        return (
          <span className={`stores-badge ${cls[s] ?? ''}`}>
            <i
              className={`pi pi-${s === 'APPROVED' ? 'check-circle' : s === 'PENDING' ? 'clock' : 'times-circle'}`}
            />
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </span>
        );
      },
    },
    {
      headerName: 'Availability',
      propertyName: 'actions',
      body: (rowData: IRestaurantResponse) => {
        return (
          <CustomInputSwitch
            className="prevent-row-click stores-availability"
            label={rowData.isActive ? 'Live' : 'Offline'}
            loading={rowData?._id === deletingRestaurant?.id}
            isActive={rowData.isActive}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              e.stopPropagation();
              onHandleRestaurantStatusChange(rowData.isActive, rowData._id);
            }}
          />
        );
      },
    },
    {
      headerName: t('Actions'),
      propertyName: 'actions',
      body: (rowData: IRestaurantResponse) => (
        <div className="prevent-row-click flex items-center justify-between gap-3">
          <Link
            className="stores-details"
            href={`/general/stores/create?id=${rowData._id}`}
          >
            View details
          </Link>
          <ActionMenu items={menuItems} data={rowData} />
        </div>
      ),
    },
  ];
};
