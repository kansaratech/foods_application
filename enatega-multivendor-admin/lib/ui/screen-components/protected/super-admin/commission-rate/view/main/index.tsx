// GraphQL API imports
import { GET_COMMISSION_RATES_PAGINATED, updateCommission } from '@/lib/api/graphql';

// Context imports
import { ToastContext } from '@/lib/context/global/toast.context';

// Custom hooks
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import useDebounce from '@/lib/hooks/useDebounce';
// UI components
import Table from '@/lib/ui/useable-components/table';

// Type definitions
import { IQueryResult, ICommissionRateRestaurantResponse, IPaginationCommissionRateVars } from '@/lib/utils/interfaces';

// Apollo Client hooks
import { useMutation } from '@apollo/client';

// React hooks
import { useContext, useEffect, useState } from 'react';

import CommissionRateHeader from '../header/table-header';
import { useTranslations } from 'next-intl';
import { COMMISSION_RATE_COLUMNS } from '@/lib/ui/useable-components/table/columns/comission-rate-columns';

interface CommissionRateData {
  commissionRate: {
    restaurant: ICommissionRateRestaurantResponse[];
    currentPage: number;
    totalPages: number;
    totalCount: number;
    nextPage: boolean;
    prevPage: boolean;
  };
}

// The threshold checkboxes are nested (>20% implies >10% implies >5%), so
// selecting several and OR-ing them together is the same as filtering by
// the smallest selected threshold — that's what the server is asked for.
function minSelectedRate(selectedActions: string[]): number | undefined {
  const thresholds = selectedActions
    .map((a) => parseFloat(a.replace(/[^\d.]/g, '')))
    .filter((n) => !Number.isNaN(n));
  return thresholds.length ? Math.min(...thresholds) : undefined;
}

export default function CommissionRateMain() {
  //Hooks
  const t = useTranslations();

  // States
  const [restaurants, setRestaurants] = useState<ICommissionRateRestaurantResponse[] | null>(null);
  const [selectedRestaurants, setSelectedRestaurants] = useState<
    ICommissionRateRestaurantResponse[]
  >([]);
  const [loadingRestaurant, setLoadingRestaurant] = useState<string | null>(
    null
  );
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Context
  const { showToast } = useContext(ToastContext);

  // Query — search and the rate threshold are applied server-side so they
  // cover the full vendor list, not just whatever page happens to be loaded.
  const { data, error, refetch, loading } = useQueryGQL(
    GET_COMMISSION_RATES_PAGINATED,
    {
      page: currentPage,
      limit: rowsPerPage,
      search: debouncedSearch || undefined,
      minRate: minSelectedRate(selectedActions),
    },
    {
      fetchPolicy: 'cache-and-network',
    }
  ) as IQueryResult<CommissionRateData | undefined, IPaginationCommissionRateVars>;

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedActions]);

  // Mutation
  const [updateCommissionMutation] = useMutation(updateCommission);

  // Handlers
  const handleSave = async (restaurantId: string) => {
    const restaurant = restaurants?.find((r) => r._id === restaurantId);
    if (!restaurant?.commissionRate) {
      return showToast({
        type: 'error',
        title: t('Commission Updated'),
        message: `${t('Commission')} ${t('Update')} ${t('failed')}`,
      });
    }
    if (restaurant) {
      setLoadingRestaurant(restaurantId);
      if (restaurant?.commissionRate > 100) {
        setLoadingRestaurant(null);
        return showToast({
          type: 'error',
          title: t('Commission Updated'),
          message: t(
            'As commission rate is a %age value so it cannot exceed a max value of 100'
          ),
        });
      }
      try {
        await updateCommissionMutation({
          variables: {
            id: restaurantId,
            commissionRate: parseFloat(String(restaurant?.commissionRate)),
          },
        });
        showToast({
          type: 'success',
          title: t('Commission Updated'),
          message: `${t('Commission rate updated for')} ${restaurant.name}`,
          duration: 2000,
        });
        refetch();
      } catch (error) {
        showToast({
          type: 'error',
          title: t('Error'),
          message: `${t('Error updating commission rate for')} ${restaurant.name}`,
          duration: 2000,
        });
      } finally {
        setLoadingRestaurant(null);
      }
    }
  };

  const handleCommissionRateChange = (restaurantId: string, value: number) => {
    setRestaurants((prevRestaurants) =>
      prevRestaurants
        ? prevRestaurants.map((restaurant) =>
          restaurant._id === restaurantId
            ? { ...restaurant, commissionRate: value }
            : restaurant
        )
        : null
    );
  };

  // Use Effects
  useEffect(() => {
    if (data?.commissionRate?.restaurant) {
      setRestaurants(data.commissionRate.restaurant);
    } else if (error) {
      showToast({
        type: 'error',
        title: t('Error Fetching Restaurants'),
        message: t(
          'An error occurred while fetching restaurants - Please try again later'
        ),
        duration: 2000,
      });
    }
  }, [data, error]);

  return (
    <div className="p-3">
      <Table
        data={(loading || restaurants === null) ? [] : restaurants}
        setSelectedData={setSelectedRestaurants}
        selectedData={selectedRestaurants}
        columns={COMMISSION_RATE_COLUMNS({
          handleSave,
          handleCommissionRateChange,
          loadingRestaurant,
        })}
        loading={loading || restaurants === null}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        totalRecords={data?.commissionRate?.totalCount ?? 0}
        onPageChange={(page, rows) => {
          setCurrentPage(page);
          setRowsPerPage(rows);
        }}
        header={
          <CommissionRateHeader
            selectedActions={selectedActions}
            setSelectedActions={setSelectedActions}
            onSearch={setSearchTerm}
          />
        }
      />
    </div>
  );
}
