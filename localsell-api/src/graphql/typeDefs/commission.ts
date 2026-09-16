export const commissionTypeDefs = /* GraphQL */ `
  type CommissionVendorLite {
    _id: ID!
    name: String
    businessName: String
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
    invoiceNumber: String
    periodStart: String!
    periodEnd: String!
    cycle: String!
    orderCount: Int!
    grossFoodSubtotal: Float!
    commissionTotal: Float!
    status: String!
    paidAt: String
    paidAmount: Float
    outstandingAmount: Float!
    payments: [CommissionPayment!]!
    note: String
    createdAt: String!
  }

  type CommissionBillDetail {
    bill: CommissionBill!
    records: [CommissionRecordRow!]!
    invoice: CommissionInvoice!
  }

  "Everything a printable vendor invoice needs, pre-composed by the server."
  type CommissionInvoice {
    invoiceNumber: String!
    issuedOn: String!
    periodLabel: String!
    platformName: String!
    platformAddress: String
    platformGstin: String
    vendorName: String!
    vendorEmail: String
    vendorPhone: String
    storeNames: [String!]!
    orderCount: Int!
    grossFoodSubtotal: Float!
    commissionRate: Float!
    commissionTotal: Float!
    status: String!
    note: String
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
    "Net owed to this vendor from CASHFREE orders, not yet paid out."
    payoutPendingTotal: Float!
    "payoutPendingTotal - outstandingTotal. Positive = LocalSell owes the vendor; negative = the vendor owes LocalSell."
    netBalance: Float!
    bills: [CommissionBill!]!
  }

  "One vendor's consolidated money position: what LocalSell owes them (CASHFREE payouts) net against what they owe LocalSell (COD commission)."
  type VendorBalance {
    _id: ID!
    vendor: CommissionVendorLite!
    "Outstanding COD commission this vendor owes LocalSell."
    commissionOutstanding: Float!
    "Net CASHFREE payout LocalSell owes this vendor, not yet paid."
    payoutPending: Float!
    "payoutPending - commissionOutstanding. Positive = pay the vendor; negative = collect from the vendor."
    netBalance: Float!
  }

  type VendorBalancesResult {
    balances: [VendorBalance!]!
    total: Int!
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
    reference: String
    note: String
    status: String!
    confirmedAt: String
    createdAt: String!
  }

  type RiderCashOutstandingRow {
    rider: RiderCashLite!
    entryCount: Int!
    outstanding: Float!
    oldestUnremittedAt: String
    pendingDepositCount: Int!
    pendingDepositTotal: Float!
  }

  type RiderCashSummary {
    rider: RiderCashLite!
    outstanding: Float!
    lifetimeCollected: Float!
    lifetimeRemitted: Float!
    cashLimit: Float!
    walletBalance: Float!
    availableToWithdraw: Float!
    pendingDepositTotal: Float!
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
    taxCollected: Float!
    riderPayouts: Float!
    codCashCollected: Float!
    codCashRemitted: Float!
    codCashOutstanding: Float!
    perVendor: [FinanceVendorRow!]!
    perRider: [FinanceRiderRow!]!
  }

  extend type Query {
    commissionPeriodPreview: CommissionPeriodPreview!
    commissionBills(status: String, vendorId: ID, page: Int, limit: Int, search: String, startDate: String, endDate: String): CommissionBillsResult!
    commissionBill(id: ID!): CommissionBillDetail!
    myCommissionSummary: MyCommissionSummary!
    "Admin-only consolidated balance sheet: who LocalSell owes, and who owes LocalSell, across all vendors."
    vendorBalances(page: Int, limit: Int, search: String): VendorBalancesResult!
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
    "A rider self-reports a cash deposit; it stays PENDING until an admin confirms it."
    riderReportDeposit(riderId: ID, amount: Float!, method: String, reference: String, note: String): RiderCashRemittanceRow!
    "Admin confirms (approve=true) or rejects a rider-reported deposit."
    confirmRiderCashDeposit(id: ID!, approve: Boolean!, note: String): RiderCashRemittanceRow!
  }
`;
