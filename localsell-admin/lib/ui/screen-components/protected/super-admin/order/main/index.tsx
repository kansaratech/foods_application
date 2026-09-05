import { gql, useApolloClient, useQuery } from '@apollo/client';
import './orders.css';
// Hooks
import { useState, useEffect } from 'react';
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import useDebounce from '@/lib/hooks/useDebounce';
// Interfaces & Types
import {
  IDateFilter,
  IQueryResult,
  IPaginationVars,
} from '@/lib/utils/interfaces';
import { IOrder, IExtendedOrder } from '@/lib/utils/interfaces';
import { getGraphQLErrorMessage } from '@/lib/utils/methods/error';
import { useTranslations } from 'next-intl';

// GraphQL
import {
  GET_ALL_ORDERS_PAGINATED,
  GET_ORDER_FILTER_OPTIONS,
} from '@/lib/api/graphql';

// Components
import OrderSuperAdminTableHeader from '../header/table-header';
import OrderDetailModal from '@/lib/ui/useable-components/popup-menu/order-details-modal';
import DashboardDateFilter from '@/lib/ui/useable-components/date-filter';
import OrderTable from '../order-table';
import ApiErrorAlert from '@/lib/ui/useable-components/api-error-alert';
// Prime React
import { FilterMatchMode } from 'primereact/api';
import { DataTableRowClickEvent } from 'primereact/datatable';

export default function OrderSuperAdminMain() {
  const t = useTranslations();
  const client = useApolloClient();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const { data: summaryData } = useQuery(
    gql`
      query OrderManagementSummary {
        orderManagementSummary {
          total
          pending
          inProgress
          deliveredToday
        }
      }
    `,
    { fetchPolicy: 'cache-and-network', pollInterval: 60000 }
  );

  // States
  const [selectedData, setSelectedData] = useState<IExtendedOrder[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<IExtendedOrder | null>(
    null
  );
  const [dateFilter, setDateFilter] = useState<IDateFilter>({
    dateKeyword: 'All',
    startDate: `${new Date().getFullYear()}-01-01`, // Current year, January 1st
    endDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`, // Today's date
  });
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10); // For PrimeReact Table's 'rows' prop
  const [currentPage, setCurrentPage] = useState(1); // For API 'page' parameter
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const debouncedSearch = useDebounce(globalFilterValue, 600);

  const handleDateFilter = (dateFilter: IDateFilter) => {
    setDateFilter({
      ...dateFilter,
      dateKeyword: dateFilter.dateKeyword ?? '',
    });
  };

  // Only send dates when Custom filter is active, otherwise backend handles date filtering
  const queryVariables = {
    page: currentPage,
    rows: rows,
    dateKeyword: dateFilter.dateKeyword,
    starting_date:
      dateFilter.dateKeyword === 'Custom' ? dateFilter.startDate : undefined,
    ending_date:
      dateFilter.dateKeyword === 'Custom' ? dateFilter.endDate : undefined,
    orderStatus: selectedActions.length > 0 ? selectedActions : undefined,
    search: debouncedSearch,
    restaurantId: selectedRestaurantId ?? undefined,
    riderId: selectedRiderId ?? undefined,
  };

  const { data: filterOptionsData, loading: filterOptionsLoading } =
    useQueryGQL(
      GET_ORDER_FILTER_OPTIONS,
      {},
      {
        fetchPolicy: 'cache-first',
      }
    ) as IQueryResult<
      | {
          orderFilterOptions: {
            restaurants: Array<{ _id: string; name: string }>;
            riders: Array<{
              _id: string;
              name: string;
              username?: string;
              phone?: string;
            }>;
          };
        }
      | undefined,
      Record<string, never>
    >;

  const {
    data: paginatedData,
    error: paginatedError,
    loading: paginatedLoading,
    refetch: refetchPaginated,
  } = useQueryGQL(GET_ALL_ORDERS_PAGINATED, queryVariables, {
    fetchPolicy: 'cache-and-network',
  }) as IQueryResult<
    | {
        allOrdersPaginated: {
          totalCount: number;
          currentPage: number;
          totalPages: number;
          prevPage: number;
          nextPage: number;
          orders: IOrder[];
        };
      }
    | undefined,
    IPaginationVars
  >;

  const [filters, setFilters] = useState({
    global: {
      value: '' as string | null,
      matchMode: FilterMatchMode.CONTAINS,
    },
  });

  useEffect(() => {
    if (!paginatedLoading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, paginatedLoading]);

  useEffect(() => {
    setFirst(0);
    setCurrentPage(1);
  }, [
    dateFilter,
    debouncedSearch,
    selectedActions,
    selectedRestaurantId,
    selectedRiderId,
  ]);

  // For global search - updates filters for PrimeReact DataTable
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };
    _filters['global'].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const handleRowClick = (event: DataTableRowClickEvent) => {
    const selectedOrder = event?.data as IExtendedOrder;
    setSelectedOrder(selectedOrder);
    setIsModalOpen(true);
  };

  const handleRefetch = () => {
    refetchPaginated({
      page: currentPage,
      rows: rows,
    });
  };

  const exportOrders = async () => {
    setExporting(true);
    setExportError('');
    try {
      const collected: IExtendedOrder[] = [];
      let page = 1,
        pages = 1;
      do {
        const result = await client.query({
          query: GET_ALL_ORDERS_PAGINATED,
          variables: { ...queryVariables, page, rows: 100 },
          fetchPolicy: 'network-only',
        });
        const batch = result.data.allOrdersPaginated;
        collected.push(...batch.orders);
        pages = batch.totalPages;
        page++;
      } while (page <= pages);
      const cell = (value: unknown) => {
        let text = String(value ?? '');
        if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
      };
      const csv = [
        [
          'Order',
          'Customer',
          'Phone',
          'Payment',
          'Status',
          'Placed at',
          'Restaurant',
          'Rider',
          'Total',
        ],
        ...collected.map((row) => [
          row.orderId,
          row.user?.name,
          row.user?.phone,
          row.paymentMethod,
          row.orderStatus,
          row.createdAt,
          row.restaurant?.name,
          row.rider?.name,
          row.orderAmount,
        ]),
      ]
        .map((row) => row.map(cell).join(','))
        .join('\r\n');
      const url = URL.createObjectURL(
        new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'orders.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError('Unable to export orders. Please try again.');
    } finally {
      setExporting(false);
    }
  };
  const summary = summaryData?.orderManagementSummary;
  return (
    <div className="management-order-content">
      <div className="orders-summary">
        {[
          {
            label: 'Total orders',
            value: summary?.total,
            icon: 'shopping-cart',
            tone: 'blue',
          },
          {
            label: 'Pending',
            value: summary?.pending,
            icon: 'clock',
            tone: 'amber',
          },
          {
            label: 'In progress',
            value: summary?.inProgress,
            icon: 'box',
            tone: 'blue',
          },
          {
            label: 'Delivered today',
            value: summary?.deliveredToday,
            icon: 'check',
            tone: 'green',
          },
        ].map((stat) => (
          <div className="orders-summary-card" key={stat.label}>
            <span className={`orders-summary-icon ${stat.tone}`}>
              <i className={`pi pi-${stat.icon}`} aria-hidden="true" />
            </span>
            <div>
              <p>{stat.label}</p>
              <strong>{stat.value ?? '?'}</strong>
            </div>
          </div>
        ))}
      </div>
      {exportError && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {exportError}
        </p>
      )}
      {
        <>
          <OrderSuperAdminTableHeader
            onExport={exportOrders}
            exporting={exporting}
            globalFilterValue={globalFilterValue}
            onGlobalFilterChange={onGlobalFilterChange}
            selectedActions={selectedActions}
            setSelectedActions={setSelectedActions}
            dateFilter={dateFilter}
            handleDateFilter={handleDateFilter}
            restaurants={
              filterOptionsData?.orderFilterOptions?.restaurants ?? []
            }
            riders={filterOptionsData?.orderFilterOptions?.riders ?? []}
            filtersLoading={filterOptionsLoading}
            selectedRestaurantId={selectedRestaurantId}
            selectedRiderId={selectedRiderId}
            setSelectedRestaurantId={setSelectedRestaurantId}
            setSelectedRiderId={setSelectedRiderId}
          />
          <DashboardDateFilter
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
          />
        </>
      }
      {!paginatedError && (
        <OrderTable
          data={paginatedData?.allOrdersPaginated}
          loading={paginatedLoading}
          isInitialLoad={isInitialLoad}
          handleRowClick={handleRowClick}
          selectedData={selectedData}
          setSelectedData={setSelectedData}
          first={first}
          rows={rows}
          filters={filters}
          globalFilterValue={globalFilterValue}
          onPage={(e) => {
            setFirst(e.first);
            setRows(Math.min(e.rows, 100));
            setCurrentPage((e.page ?? 0) + 1);
          }}
        />
      )}
      <OrderDetailModal
        visible={isModalOpen}
        onHide={() => setIsModalOpen(false)}
        restaurantData={selectedOrder}
      />

      <ApiErrorAlert
        error={getGraphQLErrorMessage(paginatedError)}
        refetch={handleRefetch}
        queryName={'GET_ALL_ORDERS_PAGINATED'}
        title={t('Error')}
      />
    </div>
  );
}
