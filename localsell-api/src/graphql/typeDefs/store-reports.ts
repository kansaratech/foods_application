export const storeReportsTypeDefs = /* GraphQL */ `
  type StoreReportBucket {
    "YYYY-MM-DD for groupBy DAY, YYYY-MM for groupBy MONTH."
    bucket: String!
    label: String!
    orders: Int!
    delivered: Int!
    cancelled: Int!
    pickup: Int!
    selfDelivery: Int!
    platformDelivery: Int!
    grossSales: Float!
    codCashCollected: Float!
    commissionOwed: Float!
    gstCollected: Float!
    netEarnings: Float!
  }

  type StoreOrderReport {
    storeId: ID!
    groupBy: String!
    startDate: String!
    endDate: String!
    buckets: [StoreReportBucket!]!
    totals: StoreReportBucket!
  }

  type StoreCollectionBill {
    _id: ID!
    invoiceNumber: String
    periodStart: String!
    periodEnd: String!
    commissionTotal: Float!
    status: String!
  }

  type StoreCollectionSummary {
    storeId: ID!
    startDate: String!
    endDate: String!
    "COD cash the store physically collected on pickup + self-delivery orders in range."
    codCashCollected: Float!
    "Platform commission owed on that cash (billed, not netted from a payout)."
    commissionOwed: Float!
    "GST the store collected and must remit."
    gstCollected: Float!
    "Cash the store keeps after settling platform commission (GST still to remit separately)."
    netAfterCommission: Float!
    "Commission on delivered orders not yet rolled into a bill."
    unbilledCommission: Float!
    "Sum of every still-unpaid commission bill for this store."
    outstandingBillsTotal: Float!
    outstandingBills: [StoreCollectionBill!]!
  }

  extend type Query {
    storeOrderReport(storeId: ID!, groupBy: String!, startDate: String, endDate: String): StoreOrderReport!
    storeCollectionSummary(storeId: ID!, startDate: String, endDate: String): StoreCollectionSummary!
  }
`;
