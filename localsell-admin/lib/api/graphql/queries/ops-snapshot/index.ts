import { gql } from '@apollo/client';

export const GET_ADMIN_OPS_SNAPSHOT = gql`
  query AdminOpsSnapshot($startDate: String, $endDate: String) {
    adminOpsSnapshot(startDate: $startDate, endDate: $endDate) {
      ordersToday
      gmvToday
      ordersWeek
      gmvWeek
      ordersPrev
      gmvPrev
      activeOrders
      activeStores
      totalStores
      ridersOnline
      totalRiders
      pendingPayouts
      pendingPayoutAmount
      unbilledCommission
      codCashOutstanding
      waitlistUnnotified
    }
  }
`;
