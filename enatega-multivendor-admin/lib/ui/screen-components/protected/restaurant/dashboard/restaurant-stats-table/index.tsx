// React and third-party imports
import React, { useContext, useMemo } from 'react';

// API and context imports
import { GET_RESTAURANT_DASHBOARD_ORDER_SALES_DETAILS_BY_PAYMENT_METHOD } from '@/lib/api/graphql/queries/dashboard';
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context';
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import {
  IDashboardOrderSalesDetailsByPaymentMethodResponseGraphQL,
  IDashboardRestaurantStatesTableComponentsProps,
  IPaymentMethodStatsBucket,
  IQueryResult,
  TPaymentMethodKey,
} from '@/lib/utils/interfaces';

// Component imports
import PaymentMethodStats from '@/lib/ui/useable-components/payment-method-stats';

// Hooks
import { useConfiguration } from '@/lib/hooks/useConfiguration';

const PAYMENT_METHOD_KEYS: TPaymentMethodKey[] = ['all', 'cod', 'card'];

export default function RestaurantStatesTable({
  dateFilter,
}: IDashboardRestaurantStatesTableComponentsProps) {
  // Hooks
  const { CURRENCY_CODE } = useConfiguration();

  // Context
  const { restaurantLayoutContextData } = useContext(RestaurantLayoutContext);

  // API
  const { data: salesDetailsData, loading: salesDetailsLoading } = useQueryGQL(
    GET_RESTAURANT_DASHBOARD_ORDER_SALES_DETAILS_BY_PAYMENT_METHOD,
    {
      restaurant: restaurantLayoutContextData?.restaurantId ?? '',
      dateKeyword: dateFilter?.dateKeyword,
      starting_date: dateFilter.startDate,
      ending_date: dateFilter.endDate,
    },
    {
      fetchPolicy: 'cache-and-network',
      debounceMs: 300,
      enabled: !!restaurantLayoutContextData?.restaurantId,
    }
  ) as IQueryResult<
    IDashboardOrderSalesDetailsByPaymentMethodResponseGraphQL | undefined,
    undefined
  >;

  // Memo
  const dashboardOrderSalesDetailsByPaymentMethod = useMemo(() => {
    if (!salesDetailsData) return null;
    return (
      salesDetailsData?.getRestaurantDashboardOrderSalesDetailsByPaymentMethod ??
      null
    );
  }, [salesDetailsData]);

  const buckets = useMemo<IPaymentMethodStatsBucket[]>(() => {
    const source = dashboardOrderSalesDetailsByPaymentMethod;
    if (!source) return [];
    return PAYMENT_METHOD_KEYS.map((key) => ({
      key,
      items: source[key] ?? [],
    }));
  }, [dashboardOrderSalesDetailsByPaymentMethod]);

  if (!dashboardOrderSalesDetailsByPaymentMethod) return null;

  return (
    <div className="p-3">
      <PaymentMethodStats
        loading={salesDetailsLoading}
        buckets={buckets}
        currency={CURRENCY_CODE ?? 'USD'}
      />
    </div>
  );
}
