import { gql } from '@apollo/client';

export const GET_ADMIN_OPS_SNAPSHOT = gql`
  query AdminOpsSnapshot {
    adminOpsSnapshot {
      ordersToday
      gmvToday
      ordersWeek
      gmvWeek
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
