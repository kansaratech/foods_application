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
      headerName: t('ID'), propertyName: 'unique_restaurant_id',
    },
    { headerName: t('Name'), propertyName: 'name' },
    { headerName: t('Vendor'), propertyName: 'owner.email' },
    {
      headerName: t('Email'),
      propertyName: 'username',
    },
    { headerName: t('Address'), propertyName: 'address' },
    {
      headerName: t('Approval'),
      propertyName: 'approvalStatus',
      body: (rowData: IRestaurantResponse & { approvalStatus?: string }) => {
        const s = rowData.approvalStatus || 'APPROVED';
        const cls: Record<string, string> = {
          APPROVED: 'bg-green-100 text-green-700',
          PENDING: 'bg-amber-100 text-amber-700',
          REJECTED: 'bg-red-100 text-red-700',
          SUSPENDED: 'bg-gray-200 text-gray-600',
        };
        return <span className={`rounded px-2 py-0.5 text-xs ${cls[s] ?? ''}`}>{t(s)}</span>;
      },
    },
    {
      headerName: t('Docs'),
      propertyName: 'documentSummary',
      body: (
        rowData: IRestaurantResponse & {
          documentSummary?: { required: number; verified: number; pending: number; rejected: number };
        },
      ) => {
        const s = rowData.documentSummary;
        if (!s) return <span className="text-xs text-gray-400">—</span>;
        const cls =
          s.rejected > 0
            ? 'bg-red-100 text-red-700'
            : s.verified >= s.required
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700';
        return <span className={`rounded px-2 py-0.5 text-xs ${cls}`}>{s.verified}/{s.required}</span>;
      },
    },
    {
      headerName: t('Status'),
      propertyName: 'actions',
      body: (rowData: IRestaurantResponse) => {
        return (
          <CustomInputSwitch
            className="prevent-row-click"
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
        <ActionMenu items={menuItems} data={rowData} />
      ),
    },
  ];
};
