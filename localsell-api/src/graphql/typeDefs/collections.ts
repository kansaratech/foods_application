export const collectionsTypeDefs = /* GraphQL */ `
  type CommissionPayment {
    _id: ID!
    receiptNumber: String!
    billId: ID!
    invoiceNumber: String
    vendor: CommissionVendorLite
    amount: Float!
    method: String!
    reference: String
    note: String
    receivedAt: String!
    createdAt: String!
  }
  type CollectionOverview {
    unbilled: Float!
    outstanding: Float!
    collected: Float!
    openBills: Int!
    vendorsOwing: Int!
    pendingBills: [CommissionBill!]!
    recentReceipts: [CommissionPayment!]!
  }
  type CommissionPaymentsResult {
    payments: [CommissionPayment!]!
    total: Int!
  }
  extend type Query {
    commissionCollectionOverview: CollectionOverview!
    commissionPayments(
      startDate: String
      endDate: String
      vendorId: ID
      page: Int
      limit: Int
    ): CommissionPaymentsResult!
  }
  extend type Mutation {
    recordCommissionPayment(
      billId: ID!
      amount: Float!
      method: String!
      reference: String
      note: String
      receivedAt: String!
      idempotencyKey: String!
    ): CommissionPayment!
  }
`;
