'use client';

// Core
import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApolloError, gql, useMutation, useQuery } from '@apollo/client';
import { Dialog } from 'primereact/dialog';

// PrimeReact

// Context
import { ToastContext } from '@/lib/context/global/toast.context';
import { RestaurantsContext } from '@/lib/context/super-admin/restaurants.context';

// Custom Hooks

import useDebounce from '@/lib/hooks/useDebounce';

// Custom Components
import RestaurantDuplicateDialog from '../duplicate-dialog';
import StoresOverview from './stores-overview';
import { StoreListRow } from './stores-overview';
import Table from '@/lib/ui/useable-components/table';
import CustomDialog from '@/lib/ui/useable-components/delete-dialog';

// Constants and Interfaces
import { IActionMenuItem, IRestaurantResponse } from '@/lib/utils/interfaces';

// GraphQL Queries and Mutations
import {
  HARD_DELETE_RESTAURANT,
  SET_STORE_APPROVAL,
  CLONE_MENU,
} from '@/lib/api/graphql';

// Method
import { onUseLocalStorage } from '@/lib/utils/methods';

// Dummy
import { DataTableRowClickEvent } from 'primereact/datatable';
import { useTranslations } from 'next-intl';
import { RESTAURANT_TABLE_COLUMNS } from '@/lib/ui/useable-components/table/columns/restaurant-column';

export default function RestaurantsMain() {
  // Hooks
  const t = useTranslations();

  // Context
  const { showToast } = useContext(ToastContext);
  const { currentTab, onSetCurrentTab } = useContext(RestaurantsContext);

  // Hooks
  const router = useRouter();

  // State for pagination and search
  const [deleteId, setDeleteId] = useState('');
  const [duplicateId, setDuplicateId] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<
    IRestaurantResponse[]
  >([]);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [view, setView] = useState('all');
  const [zone, setZone] = useState('');
  const [approval, setApproval] = useState('');
  const [availability, setAvailability] = useState('');
  const [category, setCategory] = useState('');
  const debouncedSearchTerm = useDebounce(globalFilterValue, 300);
  const { data, loading, error, refetch } = useQuery(
    gql`
      query StoresDirectory {
        restaurants {
          _id
          unique_restaurant_id
          name
          image
          address
          city
          state
          isActive
          approvalStatus
          shopType
          username
          owner {
            _id
            email
          }
          zone {
            _id
            title
          }
          documentSummary {
            required
            verified
            pending
            rejected
          }
        }
        getClonedRestaurants {
          _id
        }
      }
    `,
    { fetchPolicy: 'cache-and-network' }
  );

  // API
  const [hardDeleteRestaurant, { loading: isHardDeleting }] = useMutation(
    HARD_DELETE_RESTAURANT,
    {
      onCompleted: () => {
        showToast({
          type: 'success',
          title: t('Store Delete'),
          message: t(`Store has been deleted successfully`),
          duration: 2000,
        });
        setDeleteId('');
        // Refetch data after deletion
        refetch();
      },
      onError: ({ networkError, graphQLErrors }: ApolloError) => {
        showToast({
          type: 'error',
          title: t('Store Delete'),
          message:
            graphQLErrors[0]?.message ??
            networkError?.message ??
            t(`Store delete failed`),
          duration: 2500,
        });
        setDeleteId('');
      },
    }
  );

  const [cloneSourceId, setCloneSourceId] = useState('');
  const [cloneTargetId, setCloneTargetId] = useState('');
  const [cloneReplace, setCloneReplace] = useState(false);
  const allStores = (data?.restaurants ?? []) as StoreListRow[];

  const [cloneMenu, { loading: cloning }] = useMutation(CLONE_MENU, {
    onCompleted: () => {
      showToast({
        type: 'success',
        title: t('Clone menu'),
        message: t('Menu cloned'),
        duration: 2000,
      });
      setCloneSourceId('');
      setCloneTargetId('');
      setCloneReplace(false);
    },
    onError: ({ graphQLErrors, networkError }: ApolloError) =>
      showToast({
        type: 'error',
        title: t('Clone menu'),
        message:
          graphQLErrors[0]?.message ??
          networkError?.message ??
          t('Could not clone the menu'),
        duration: 3000,
      }),
  });

  const [setStoreApproval] = useMutation(SET_STORE_APPROVAL, {
    onCompleted: (d) => {
      showToast({
        type: 'success',
        title: t('Store approval'),
        message: `${t('Store is now')} ${t(d?.setStoreApproval?.approvalStatus ?? '')}`,
        duration: 2000,
      });
      refetch();
    },
    onError: ({ graphQLErrors, networkError }: ApolloError) => {
      showToast({
        type: 'error',
        title: t('Store approval'),
        message:
          graphQLErrors[0]?.message ??
          networkError?.message ??
          t('Could not update approval'),
        duration: 2500,
      });
    },
  });

  const handleDelete = async (id: string) => {
    try {
      await hardDeleteRestaurant({ variables: { id: id } });
    } catch (err) {
      showToast({
        type: 'error',
        title: t('Store Delete'),
        message: t(`Store delete failed`),
      });
      setDeleteId('');
    }
  };

  // Constants
  const menuItems: IActionMenuItem<IRestaurantResponse>[] = [
    {
      label: t('Open Portal'),
      command: (data?: IRestaurantResponse) => {
        if (data) {
          onUseLocalStorage('save', 'restaurantId', data?._id);
          onUseLocalStorage('save', 'shopType', data?.shopType);
          const routeStack = ['Admin'];
          onUseLocalStorage('save', 'routeStack', JSON.stringify(routeStack));
          router.push(`/admin/store/`);
        }
      },
    },
    {
      label: t('Edit'),
      command: (data?: IRestaurantResponse) => {
        if (data) router.push(`/general/stores/create?id=${data._id}`);
      },
    },
    {
      label: t('Duplicate'),
      command: (data?: IRestaurantResponse) => {
        if (data) {
          setDuplicateId(data._id);
        }
      },
    },
    {
      label: t('Approve store'),
      command: (data?: IRestaurantResponse) => {
        if (data)
          setStoreApproval({ variables: { id: data._id, status: 'APPROVED' } });
      },
    },
    {
      label: t('Suspend store'),
      command: (data?: IRestaurantResponse) => {
        if (data)
          setStoreApproval({
            variables: { id: data._id, status: 'SUSPENDED' },
          });
      },
    },
    {
      label: t('Reject store'),
      command: (data?: IRestaurantResponse) => {
        if (data)
          setStoreApproval({ variables: { id: data._id, status: 'REJECTED' } });
      },
    },
    {
      label: t('Clone menu from here'),
      command: (data?: IRestaurantResponse) => {
        if (data) {
          setCloneSourceId(data._id);
          setCloneTargetId('');
        }
      },
    },
    {
      label: t('Delete'),
      command: (data?: IRestaurantResponse) => {
        if (data) {
          setDeleteId(data._id);
        }
      },
    },
  ];

  const clonedIds = new Set<string>(
    (data?.getClonedRestaurants ?? []).map(
      (store: { _id: string }) => store._id
    )
  );
  const incomplete = (store: StoreListRow) =>
    !!store.documentSummary &&
    store.documentSummary.verified < store.documentSummary.required;
  const filteredStores = allStores.filter((store) => {
    const search = debouncedSearchTerm.trim().toLowerCase();
    return (
      (!search ||
        [
          store.name,
          store.owner?.email,
          store.username,
          store.address,
          store.city,
        ].some((value) => value?.toLowerCase().includes(search))) &&
      (currentTab !== 'Cloned' || clonedIds.has(store._id)) &&
      (view !== 'pending' || store.approvalStatus === 'PENDING') &&
      (view !== 'incomplete' || incomplete(store)) &&
      (!zone || store.zone?._id === zone) &&
      (!approval || store.approvalStatus === approval) &&
      (!availability || store.isActive === (availability === 'live')) &&
      (!category || store.shopType === category)
    );
  });

  return (
    <div className="stores-directory">
      <StoresOverview
        stores={allStores}
        clonedCount={clonedIds.size}
        loading={loading && !data}
        view={currentTab === 'Cloned' ? 'cloned' : view}
        onViewChange={(value) => {
          onSetCurrentTab(value === 'cloned' ? 'Cloned' : 'Actual');
          setView(value);
        }}
        search={globalFilterValue}
        onSearch={setGlobalFilterValue}
        zone={zone}
        approval={approval}
        availability={availability}
        category={category}
        onZone={setZone}
        onApproval={setApproval}
        onAvailability={setAvailability}
        onCategory={setCategory}
        onClear={() => {
          setGlobalFilterValue('');
          setZone('');
          setApproval('');
          setAvailability('');
          setCategory('');
        }}
        exportStores={filteredStores}
      />
      {error && (
        <div
          role="alert"
          className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          Unable to load stores.{' '}
          <button onClick={() => refetch()} className="underline">
            Try again
          </button>
        </div>
      )}
      <Table
        key={[
          debouncedSearchTerm,
          currentTab,
          view,
          zone,
          approval,
          availability,
          category,
        ].join('|')}
        data={loading && !data ? [] : filteredStores}
        setSelectedData={setSelectedProducts}
        selectedData={selectedProducts}
        columns={RESTAURANT_TABLE_COLUMNS({ menuItems })}
        loading={loading && !data}
        className="stores-admin-table"
        scrollable={false}
        minWidth="64rem"
        scrollHeight="calc(100dvh - 19rem)"
        rowsPerPage={10}
        handleRowClick={(event: DataTableRowClickEvent) => {
          const target = event.originalEvent.target as HTMLElement | null;

          if (target?.closest('.prevent-row-click')) {
            return;
          }

          onUseLocalStorage('save', 'restaurantId', event.data._id);
          onUseLocalStorage('save', 'shopType', event.data.shopType);
          const routeStack = ['Admin'];
          onUseLocalStorage('save', 'routeStack', JSON.stringify(routeStack));
          router.push(`/admin/store/`);
        }}
      />

      <CustomDialog
        loading={isHardDeleting}
        visible={!!deleteId}
        onHide={() => {
          setDeleteId('');
        }}
        onConfirm={() => {
          handleDelete(deleteId);
        }}
        message={t('Are you sure you want to delete this store?')}
      />

      <RestaurantDuplicateDialog
        restaurantId={duplicateId}
        visible={!!duplicateId}
        onHide={() => {
          setDuplicateId('');
          refetch();
        }}
      />

      <Dialog
        header={t('Clone menu')}
        visible={!!cloneSourceId}
        onHide={() => setCloneSourceId('')}
        style={{ width: '26rem', maxWidth: '95vw' }}
      >
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-gray-500">
            {t('Copy every category, item and add-on from')}{' '}
            <b>{allStores.find((s) => s._id === cloneSourceId)?.name}</b>{' '}
            {t('into another store')}
          </p>
          <label className="flex flex-col">
            <span className="mb-1 text-gray-500">{t('Target store')}</span>
            <select
              value={cloneTargetId}
              onChange={(e) => setCloneTargetId(e.target.value)}
              className="h-10 rounded border border-gray-300 px-2 dark:bg-dark-950"
            >
              <option value="">{t('Select')}…</option>
              {allStores
                .filter((s) => s._id !== cloneSourceId)
                .map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cloneReplace}
              onChange={(e) => setCloneReplace(e.target.checked)}
            />
            {t(
              'Replace the target menu (deactivates items with order history)'
            )}
          </label>
          <button
            onClick={() =>
              cloneTargetId &&
              cloneMenu({
                variables: {
                  fromRestaurantId: cloneSourceId,
                  toRestaurantId: cloneTargetId,
                  replace: cloneReplace,
                },
              })
            }
            disabled={!cloneTargetId || cloning}
            className="mt-1 h-10 rounded bg-black text-white disabled:opacity-50"
          >
            {cloning ? t('Cloning') : t('Clone menu')}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
