'use client';

// Core
import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApolloError, useMutation, useQuery } from '@apollo/client';
import { Dialog } from 'primereact/dialog';

// PrimeReact
import { FilterMatchMode } from 'primereact/api';

// Context
import { ToastContext } from '@/lib/context/global/toast.context';
import { RestaurantsContext } from '@/lib/context/super-admin/restaurants.context';

// Custom Hooks
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import useDebounce from '@/lib/hooks/useDebounce';

// Custom Components
import RestaurantDuplicateDialog from '../duplicate-dialog';
import RestaurantsTableHeader from '../header/table-header';
import Table from '@/lib/ui/useable-components/table';
import CustomDialog from '@/lib/ui/useable-components/delete-dialog';

// Constants and Interfaces
import {
  IActionMenuItem,
  IQueryResult,
  IRestaurantResponse,
  IRestaurantsResponseGraphQL,
} from '@/lib/utils/interfaces';

// GraphQL Queries and Mutations
import {
  GET_RESTAURANTS_PAGINATED,
  GET_CLONED_RESTAURANTS_PAGINATED,
  GET_RESTAURANTS,
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
  const { currentTab } = useContext(RestaurantsContext);

  // Hooks
  const router = useRouter();

  // State for pagination and search
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState('');
  const [duplicateId, setDuplicateId] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<
    IRestaurantResponse[]
  >([]);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);

  // Debounce search to avoid too many API calls
  const debouncedSearchTerm = useDebounce(globalFilterValue, 500);

  const filters = {
    global: { value: globalFilterValue, matchMode: FilterMatchMode.CONTAINS },
    action: {
      value: selectedActions.length > 0 ? selectedActions : null,
      matchMode: FilterMatchMode.IN,
    },
  };

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, currentTab]);

  // Query variables
  const queryVariables = {
    page: currentPage,
    limit: rowsPerPage,
    search: debouncedSearchTerm || undefined,
  };

  //Query
  const { data, loading, refetch } = useQueryGQL(
    currentTab === 'Actual'
      ? GET_RESTAURANTS_PAGINATED
      : GET_CLONED_RESTAURANTS_PAGINATED,
    queryVariables,
    {
      fetchPolicy: 'cache-and-network',
      debounceMs: 300,
    }
  ) as IQueryResult<IRestaurantsResponseGraphQL | undefined, undefined>;

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
  const { data: allStoresData } = useQuery(GET_RESTAURANTS);
  const allStores = (allStoresData?.restaurants ?? []) as { _id: string; name: string }[];

  const [cloneMenu, { loading: cloning }] = useMutation(CLONE_MENU, {
    onCompleted: () => {
      showToast({ type: 'success', title: t('Clone menu'), message: t('Menu cloned'), duration: 2000 });
      setCloneSourceId('');
      setCloneTargetId('');
      setCloneReplace(false);
    },
    onError: ({ graphQLErrors, networkError }: ApolloError) =>
      showToast({
        type: 'error',
        title: t('Clone menu'),
        message: graphQLErrors[0]?.message ?? networkError?.message ?? t('Could not clone the menu'),
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
        message: graphQLErrors[0]?.message ?? networkError?.message ?? t('Could not update approval'),
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

  // Pagination handlers
  const handlePageChange = (page: number, rows: number) => {
    setCurrentPage(page);
    setRowsPerPage(rows);
  };

  // Constants
  const menuItems: IActionMenuItem<IRestaurantResponse>[] = [
    {
      label: t('View'),
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
        if (data) setStoreApproval({ variables: { id: data._id, status: 'APPROVED' } });
      },
    },
    {
      label: t('Suspend store'),
      command: (data?: IRestaurantResponse) => {
        if (data) setStoreApproval({ variables: { id: data._id, status: 'SUSPENDED' } });
      },
    },
    {
      label: t('Reject store'),
      command: (data?: IRestaurantResponse) => {
        if (data) setStoreApproval({ variables: { id: data._id, status: 'REJECTED' } });
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

  // Get pagination data
  const restaurantData =
    currentTab === 'Actual'
      ? data?.restaurantsPaginated
      : data?.getClonedRestaurantsPaginated;

  const restaurants = restaurantData?.data || [];
  const totalRecords = restaurantData?.totalCount || 0;

  return (
    <div className="p-3">
      <Table
        header={
          <RestaurantsTableHeader
            globalFilterValue={globalFilterValue}
            onGlobalFilterChange={(e) => setGlobalFilterValue(e.target.value)}
            selectedActions={selectedActions}
            setSelectedActions={setSelectedActions}
          />
        }
        data={loading ? [] : restaurants}
        filters={filters}
        setSelectedData={setSelectedProducts}
        selectedData={selectedProducts}
        columns={RESTAURANT_TABLE_COLUMNS({ menuItems })}
        loading={loading}
        rowsPerPage={rowsPerPage}
        // Server-side pagination props
        totalRecords={totalRecords}
        currentPage={currentPage}
        onPageChange={handlePageChange}
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
            <b>{allStores.find((s) => s._id === cloneSourceId)?.name}</b> {t('into another store.')}
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
            <input type="checkbox" checked={cloneReplace} onChange={(e) => setCloneReplace(e.target.checked)} />
            {t('Replace the target menu (deactivates items with order history)')}
          </label>
          <button
            onClick={() =>
              cloneTargetId &&
              cloneMenu({
                variables: { fromRestaurantId: cloneSourceId, toRestaurantId: cloneTargetId, replace: cloneReplace },
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
