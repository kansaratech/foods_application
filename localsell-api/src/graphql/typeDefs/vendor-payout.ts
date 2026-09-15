export const vendorPayoutTypeDefs = /* GraphQL */ `
  """
  The platform's own Cashfree account holds 100% of a CASHFREE order's money,
  so — unlike COD, where the store already has the cash and owes commission —
  here the platform owes the vendor their net share (order total minus commission).
  """
  type VendorPayable {
    _id: ID!
    orderId: ID!
    orderNumber: String!
    vendor: CommissionVendorLite
    storeName: String
    orderAmount: Float!
    commissionAmount: Float!
    netPayable: Float!
    status: String!
    payoutId: String
    orderDeliveredAt: String!
    createdAt: String!
  }

  type VendorPayablesResult {
    payables: [VendorPayable!]!
    total: Int!
  }

  "Immutable receipt for money actually paid out to a vendor against one or more VendorPayables."
  type VendorPayout {
    _id: ID!
    vendor: CommissionVendorLite
    amount: Float!
    method: String!
    reference: String
    note: String
    paidAt: String!
    createdAt: String!
  }

  type VendorPayoutOverview {
    pendingTotal: Float!
    pendingOrderCount: Int!
    vendorsOwed: Int!
    recentPayouts: [VendorPayout!]!
  }

  extend type Query {
    vendorPayables(vendorId: ID, status: String, page: Int, limit: Int): VendorPayablesResult!
    vendorPayoutOverview: VendorPayoutOverview!
  }

  extend type Mutation {
    recordVendorPayout(
      vendorId: ID!
      payableIds: [ID!]!
      method: String!
      reference: String
      note: String
      paidAt: String!
      idempotencyKey: String!
    ): VendorPayout!
  }
`;
