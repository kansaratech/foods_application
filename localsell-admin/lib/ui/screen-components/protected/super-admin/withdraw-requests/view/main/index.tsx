/* eslint-disable @typescript-eslint/no-explicit-any */
// Core
import { useState, useEffect } from 'react';

// Prime React
import { FilterMatchMode } from 'primereact/api';

// Components
import Table from '@/lib/ui/useable-components/table';
import WithdrawRequestTableHeader from '../header/table-header';
import { WITHDRAW_REQUESTS_TABLE_COLUMNS } from '@/lib/ui/useable-components/table/columns/withdraw-requests-columns';

// GraphQL
import { GET_ALL_WITHDRAW_REQUESTS } from '@/lib/api/graphql';
import { useQuery } from '@apollo/client';

// Interfaces
import {
  IGetWithDrawRequestsData,
  IWithDrawRequest,
} from '@/lib/utils/interfaces/';
import { IActionMenuProps, IQueryResult } from '@/lib/utils/interfaces';
import useDebounce from '@/lib/hooks/useDebounce';

export default function WithdrawRequestsSuperAdminMain({
  setVisible,
  setSelectedRequest,
}: {
  setVisible: (value: boolean) => void;
  setSelectedRequest: (request: IWithDrawRequest | undefined) => void;
}) {
  // States
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedData, setSelectedData] = useState<IWithDrawRequest[]>([]);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: {
      value: null as string | null,
      matchMode: FilterMatchMode.CONTAINS,
    },
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Hooks
  const debouncedSearch = useDebounce(globalFilterValue);

  // Get userType from selected actions (RIDER or STORE)
  const selectedUserType = selectedActions.find((action) =>
    ['RIDER', 'STORE'].includes(action)
  );

  // Get status filter from selected actions
  const selectedStatus = selectedActions.find((action) =>
    ['REQUESTED', 'TRANSFERRED', 'CANCELLED'].includes(action)
  );

  // Query with proper typing — status and user-type filters are applied
  // server-side so the pagination total always matches what's shown.
  const { data, loading, refetch } = useQuery(GET_ALL_WITHDRAW_REQUESTS, {
    variables: {
      pageSize: pageSize,
      pageNo: currentPage,
      userType: selectedUserType,
      status: selectedStatus,
      search: debouncedSearch,
    },
    fetchPolicy: 'cache-and-network',
  }) as unknown as IQueryResult<IGetWithDrawRequestsData | undefined, any>;

  // Global search handler
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };
    _filters['global'].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  // Handle page change
  const onPageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const menuItems: IActionMenuProps<IWithDrawRequest>['items'] = [
    {
      label: 'Bank Details',
      command: (data?: IWithDrawRequest) => {
        if (data) {
          setSelectedRequest(data);
          setVisible(true);
        }
      },
    },
  ];

  // Use Effect
  useEffect(() => {
    setCurrentPage(1);
    refetch({ search: debouncedSearch });
  }, [selectedUserType, selectedStatus, debouncedSearch]);

  return (
    <div className="p-3">
      <Table
        header={
          <WithdrawRequestTableHeader
            globalFilterValue={globalFilterValue}
            onGlobalFilterChange={onGlobalFilterChange}
            selectedActions={selectedActions}
            setSelectedActions={setSelectedActions}
          />
        }
        data={data?.withdrawRequests?.data ?? []}
        filters={filters}
        setSelectedData={setSelectedData}
        selectedData={selectedData}
        loading={loading}
        columns={WITHDRAW_REQUESTS_TABLE_COLUMNS({
          menuItems,
          currentPage,
          pageSize,
          search: debouncedSearch,
          selectedActions,
        })}
        totalRecords={data?.withdrawRequests?.pagination?.total}
        onPageChange={onPageChange}
        currentPage={currentPage}
        rowsPerPage={pageSize}
      />
    </div>
  );
}
