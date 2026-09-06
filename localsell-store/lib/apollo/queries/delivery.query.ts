import { gql } from "@apollo/client";

export const STORE_DELIVERY_AGENTS = gql`
  query StoreDeliveryAgents($storeId: ID!, $includeInactive: Boolean) {
    storeDeliveryAgents(storeId: $storeId, includeInactive: $includeInactive) {
      _id
      name
      phone
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const STORE_ORDER_REPORT = gql`
  query StoreOrderReport(
    $storeId: ID!
    $groupBy: String!
    $startDate: String
    $endDate: String
  ) {
    storeOrderReport(
      storeId: $storeId
      groupBy: $groupBy
      startDate: $startDate
      endDate: $endDate
    ) {
      groupBy
      startDate
      endDate
      totals {
        orders
        delivered
        cancelled
        pickup
        selfDelivery
        platformDelivery
        grossSales
        codCashCollected
        commissionOwed
        gstCollected
        netEarnings
      }
      buckets {
        bucket
        label
        orders
        delivered
        cancelled
        pickup
        selfDelivery
        platformDelivery
        grossSales
        codCashCollected
        commissionOwed
        gstCollected
        netEarnings
      }
    }
  }
`;

export const STORE_COLLECTION_SUMMARY = gql`
  query StoreCollectionSummary($storeId: ID!, $startDate: String, $endDate: String) {
    storeCollectionSummary(storeId: $storeId, startDate: $startDate, endDate: $endDate) {
      codCashCollected
      commissionOwed
      gstCollected
      netAfterCommission
      unbilledCommission
      outstandingBillsTotal
      outstandingBills {
        _id
        invoiceNumber
        periodStart
        periodEnd
        commissionTotal
        status
      }
    }
  }
`;
