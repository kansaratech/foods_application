export const financeOpsTypeDefs = /* GraphQL */ `
  # ---- Manual wallet adjustments (B2) ----

  type WalletAdjustmentRow {
    _id: ID!
    subjectType: String!
    subjectId: ID!
    subjectName: String
    amount: Float!
    reason: String!
    note: String
    createdByEmail: String
    createdAt: String!
  }

  type WalletAdjustmentsResult {
    adjustments: [WalletAdjustmentRow!]!
    total: Int!
  }

  # ---- Payout runs (B3) ----

  type PayoutRunItemRow {
    _id: ID!
    subjectType: String!
    subjectId: ID!
    payeeName: String!
    walletBalance: Float!
    heldCash: Float!
    amount: Float!
    status: String!
    method: String
    reference: String
    note: String
    paidAt: String
  }

  type PayoutRunRow {
    _id: ID!
    label: String!
    periodStart: String!
    periodEnd: String!
    status: String!
    itemCount: Int!
    grossTotal: Float!
    paidTotal: Float!
    note: String
    createdAt: String!
    completedAt: String
    items: [PayoutRunItemRow!]!
  }

  type PayoutRunsResult {
    runs: [PayoutRunRow!]!
    total: Int!
  }

  # ---- Reconciliation (B5) ----

  type ReconLine {
    label: String!
    expected: Float!
    actual: Float!
    delta: Float!
    ok: Boolean!
  }

  type ReconciliationReport {
    periodStart: String!
    periodEnd: String!
    lines: [ReconLine!]!
    storeWalletOutstanding: Float!
    riderWalletOutstanding: Float!
    negativeWalletStores: Int!
    negativeWalletRiders: Int!
    pendingRiderDeposits: Int!
    pendingRiderDepositTotal: Float!
    generatedAt: String!
  }

  extend type Query {
    walletAdjustments(subjectType: String, subjectId: ID, page: Int, limit: Int): WalletAdjustmentsResult!
    payoutRuns(page: Int, limit: Int): PayoutRunsResult!
    payoutRun(id: ID!): PayoutRunRow!
    "CSV text for a payout run — one row per payee."
    payoutRunCsv(id: ID!): String!
    reconciliationReport(startDate: String, endDate: String): ReconciliationReport!
  }

  extend type Mutation {
    adjustWallet(subjectType: String!, subjectId: ID!, amount: Float!, reason: String!, note: String): WalletAdjustmentRow!
    createPayoutRun(
      label: String
      periodStart: String
      periodEnd: String
      minAmount: Float
      includeStores: Boolean
      includeRiders: Boolean
    ): PayoutRunRow!
    markPayoutItemPaid(id: ID!, method: String, reference: String, note: String): PayoutRunItemRow!
    skipPayoutItem(id: ID!, note: String): PayoutRunItemRow!
    completePayoutRun(id: ID!): PayoutRunRow!
  }
`;
