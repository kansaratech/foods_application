'use client';

// Core
import { useMutation } from '@apollo/client';
import { useEffect, useState } from 'react';

// Interface and Types
import {
  IRiderResponse,
  IRidersPaginatedDataResponse,
  TRiderStatusFilter,
} from '@/lib/utils/interfaces/rider.interface';

// UI Components
import RidersTableHeader from '../header/table-header';
import RiderStatCards from '../header/stat-cards';
import CustomDialog from '@/lib/ui/useable-components/delete-dialog';
import Table from '@/lib/ui/useable-components/table';
import { RIDER_TABLE_COLUMNS } from '@/lib/ui/useable-components/table/columns/rider-columns';

// Utilities and Data
import { IActionMenuItem } from '@/lib/utils/interfaces/action-menu.interface';

// Hooks
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import useToast from '@/lib/hooks/useToast';
import useDebounce from '@/lib/hooks/useDebounce';

// GraphQL and Utilities
import { DELETE_RIDER, GET_RIDERS_PAGINATED } from '@/lib/api/graphql';
import { IQueryResult } from '@/lib/utils/interfaces';

// Data
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export default function RidersMain() {
  // Hooks
  const t = useTranslations();
  const { showToast } = useToast();
  const router = useRouter();

  // State - Table
  const [deleteId, setDeleteId] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<IRiderResponse[]>(
    []
  );
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TRiderStatusFilter>('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const debouncedSearch = useDebounce(globalFilterValue, 500);

  // Translate the single "status" filter into the backend's available/onDelivery args.
  const statusArgs =
    statusFilter === 'online'
      ? { available: true, onDelivery: false }
      : statusFilter === 'on_delivery'
        ? { onDelivery: true }
        : statusFilter === 'offline'
          ? { available: false }
          : {};

  // Query
  const { data, loading } = useQueryGQL(GET_RIDERS_PAGINATED, {
    page: currentPage,
    limit: rowsPerPage,
    search: debouncedSearch || undefined,
    zone: zoneFilter || undefined,
    vehicleType: vehicleTypeFilter || undefined,
    ...statusArgs,
  }, {
    fetchPolicy: 'network-only',
  }) as IQueryResult<
    IRidersPaginatedDataResponse | undefined,
    undefined
  >;

  //Mutation
  const [mutateDelete, { loading: mutationLoading }] = useMutation(
    DELETE_RIDER,
    {
      refetchQueries: 'active',
      awaitRefetchQueries: true,
    }
  );

  // For global search
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalFilterValue(e.target.value);
  };

  const onClearFilters = () => {
    setGlobalFilterValue('');
    setZoneFilter(null);
    setStatusFilter('all');
    setVehicleTypeFilter(null);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, zoneFilter, statusFilter, vehicleTypeFilter]);

  const menuItems: IActionMenuItem<IRiderResponse>[] = [
    {
      label: t('Edit'),
      command: (data?: IRiderResponse) => {
        if (data) router.push(`/general/riders/create?id=${data._id}`);
      },
    },
    {
      label: t('Delete'),
      command: (data?: IRiderResponse) => {
        if (data) {
          setDeleteId(data._id);
        }
      },
    },
  ];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <RiderStatCards />
      <div className="p-3">
      <Table
        header={
          <RidersTableHeader
            globalFilterValue={globalFilterValue}
            onGlobalFilterChange={onGlobalFilterChange}
            zoneFilter={zoneFilter}
            onZoneFilterChange={setZoneFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            vehicleTypeFilter={vehicleTypeFilter}
            onVehicleTypeFilterChange={setVehicleTypeFilter}
            onClearFilters={onClearFilters}
          />
        }
        data={data?.ridersPaginated?.data || []}
        setSelectedData={setSelectedProducts}
        selectedData={selectedProducts}
        loading={loading}
        columns={RIDER_TABLE_COLUMNS({ menuItems })}
        totalRecords={data?.ridersPaginated?.totalCount ?? 0}
        currentPage={data?.ridersPaginated?.currentPage ?? currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={(page, rowCount) => {
          setCurrentPage(page);
          setRowsPerPage(rowCount);
        }}
        scrollable={false}
        className="directory-admin-table"
      />
      </div>
      <CustomDialog
        loading={mutationLoading}
        visible={!!deleteId}
        onHide={() => {
          setDeleteId('');
        }}
        onConfirm={() => {
          mutateDelete({
            variables: { id: deleteId },
            onCompleted: () => {
              showToast({
                type: 'success',
                title: t('Success'),
                message: t('Rider Deleted'),
                duration: 3000,
              });
              setDeleteId('');
            },
          });
        }}
        message={t('Are you sure you want to delete this item?')}
      />
    </div>
  );
}
