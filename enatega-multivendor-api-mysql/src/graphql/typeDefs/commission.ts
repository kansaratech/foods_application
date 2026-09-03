export const commissionTypeDefs = /* GraphQL */ `
  type CommissionVendorLite {
    _id: ID!
    name: String
    email: String
    phone: String
  }

  type CommissionRecordRow {
    _id: ID!
    orderNumber: String!
    restaurantId: String!
    storeName: String
    foodSubtotal: Float!
    commissionRate: Float!
    commissionAmount: Float!
    orderDeliveredAt: String!
    billId: String
  }

  type CommissionBill {
    _id: ID!
    vendor: CommissionVendorLite
    periodStart: String!
    periodEnd: String!
    cycle: String!
    orderCount: Int!
    grossFoodSubtotal: Float!
    commissionTotal: Float!
    status: String!
    paidAt: String
    paidAmount: Float
    note: String
    createdAt: String!
  }

  type CommissionBillDetail {
    bill: CommissionBill!
    records: [CommissionRecordRow!]!
  }

  type CommissionBillsResult {
    bills: [CommissionBill!]!
    total: Int!
  }

  type CommissionPeriodPreviewRow {
    vendor: CommissionVendorLite!
    orderCount: Int!
    grossFoodSubtotal: Float!
    commissionTotal: Float!
  }

  type CommissionPeriodPreview {
    periodStart: String!
    periodEnd: String!
    cycle: String!
    rows: [CommissionPeriodPreviewRow!]!
    unbilledOrderCount: Int!
    unbilledCommissionTotal: Float!
  }

  type MyCommissionSummary {
    cycle: String!
    currentPeriodStart: String!
    currentPeriodEnd: String!
    currentPeriodCommission: Float!
    currentPeriodOrderCount: Int!
    outstandingTotal: Float!
    bills: [CommissionBill!]!
  }

  # ---- Rider COD cash ----

  type RiderCashLite {
    _id: ID!
    name: String
    username: String
    phone: String
  }

  type RiderCashEntryRow {
    _id: ID!
    orderNumber: String!
    collectedTotal: Float!
    riderKeeps: Float!
    owedToPlatform: Float!
    deliveredAt: String!
    remitted: Boolean!
  }

  type RiderCashRemittanceRow {
    _id: ID!
    amount: Float!
    entryCount: Int!
    method: String
    note: String
    createdAt: String!
  }

  type RiderCashOutstandingRow {
    rider: RiderCashLite!
    entryCount: Int!
    outstanding: Float!
    oldestUnremittedAt: String
  }

  type RiderCashSummary {
    rider: RiderCashLite!
    outstanding: Float!
    lifetimeCollected: Float!
    lifetimeRemitted: Float!
    entries: [RiderCashEntryRow!]!
    remittances: [RiderCashRemittanceRow!]!
  }

  # ---- Consolidated platform finance report ----

  type FinanceVendorRow {
    vendor: CommissionVendorLite!
    orders: Int!
    foodSubtotal: Float!
    commission: Float!
  }

  type FinanceRiderRow {
    rider: RiderCashLite!
    deliveries: Int!
    earned: Float!
    cashCollected: Float!
    cashOutstanding: Float!
  }

  type PlatformFinanceReport {
    periodStart: String!
    periodEnd: String!
    orderVolume: Float!
    deliveredOrders: Int!
    commissionAccrued: Float!
    commissionBilled: Float!
    commissionPaid: Float!
    commissionOutstanding: Float!
    storePayouts: Float!
    riderPayouts: Float!
    codCashCollected: Float!
    codCashRemitted: Float!
    codCashOutstanding: Float!
    perVendor: [FinanceVendorRow!]!
    perRider: [FinanceRiderRow!]!
  }

  extend type Query {
    commissionPeriodPreview: CommissionPeriodPreview!
    commissionBills(status: String, vendorId: ID, page: Int, limit: Int): CommissionBillsResult!
    commissionBill(id: ID!): CommissionBillDetail!
    myCommissionSummary: MyCommissionSummary!
    riderCashOutstanding: [RiderCashOutstandingRow!]!
    riderCashSummary(riderId: ID!): RiderCashSummary!
    platformFinanceReport(startDate: String, endDate: String): PlatformFinanceReport!
  }

  extend type Mutation {
    closeCommissionPeriod(periodStart: String, periodEnd: String): [CommissionBill!]!
    "Close only periods that have fully ended (same as the 6-hourly scheduler)."
    closeCompletedCommissionPeriods: [CommissionBill!]!
    updateCommissionBillStatus(id: ID!, status: String!, paidAmount: Float, note: String): CommissionBill!
    recordRiderCashRemittance(riderId: ID!, amount: Float, method: String, note: String): RiderCashRemittanceRow!
  }
`;
