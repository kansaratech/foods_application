export const paymentTypeDefs = /* GraphQL */ `
  enum UserTypeEnum {
    RIDER
    STORE
  }

  enum OrderTypeEnum {
    DELIVERY
    PICKUP
  }

  enum PaymentMethodEnum {
    COD
    PAYPAL
    STRIPE
  }

  input MoneyPaginationInput {
    pageSize: Int!
    pageNo: Int!
  }

  input DateFilterInput {
    starting_date: String
    ending_date: String
  }

  type WithdrawRequestsPagination {
    total: Int!
  }

  type WithdrawRequest {
    _id: ID!
    requestId: String!
    requestAmount: Float!
    requestTime: String
    status: String!
    createdAt: String
    rider: Rider
    store: Restaurant
  }

  type WithdrawRequestsResult {
    success: Boolean!
    message: String
    pagination: WithdrawRequestsPagination!
    data: [WithdrawRequest!]!
  }

  type WithdrawRequestMutationResult {
    success: Boolean!
    message: String
    data: WithdrawRequest
  }

  type BankDetails {
    accountName: String
    bankName: String
    accountNumber: String
    accountCode: String
  }

  type Transaction {
    _id: ID!
    amountCurrency: String
    status: String!
    transactionId: String!
    userType: String!
    userId: String!
    amountTransferred: Float!
    createdAt: String
    toBank: BankDetails
    rider: Rider
    store: Restaurant
  }

  type TransactionsPagination {
    total: Int!
  }

  type TransactionHistoryResult {
    data: [Transaction!]!
    pagination: TransactionsPagination!
  }

  type EarningRiderRef {
    _id: ID!
    name: String
    username: String
  }

  type EarningStoreRef {
    _id: ID!
    name: String
    username: String
  }

  type PlatformEarnings {
    marketplaceCommission: Float!
    deliveryCommission: Float!
    tax: Float!
    platformFee: Float!
    totalEarnings: Float!
  }

  type RiderEarnings {
    riderId: EarningRiderRef
    deliveryFee: Float!
    tip: Float!
    totalEarnings: Float!
  }

  type StoreEarnings {
    storeId: EarningStoreRef
    orderAmount: Float!
    totalEarnings: Float!
  }

  type Earning {
    _id: ID!
    orderId: String!
    orderType: String!
    paymentMethod: String!
    createdAt: String
    updatedAt: String
    platformEarnings: PlatformEarnings
    riderEarnings: RiderEarnings
    storeEarnings: StoreEarnings
  }

  type GrandTotalEarnings {
    platformTotal: Float!
    riderTotal: Float!
    storeTotal: Float!
  }

  type EarningsData {
    earnings: [Earning!]!
    grandTotalEarnings: GrandTotalEarnings!
  }

  type EarningsPagination {
    total: Int!
  }

  type EarningsResult {
    success: Boolean!
    message: String
    data: EarningsData!
    pagination: EarningsPagination!
  }

  type EarningsGraphOrderDetail {
    orderId: String!
    orderType: String!
    paymentMethod: String!
  }

  type StoreEarningsGraphDayEntry {
    totalOrderAmount: Float!
    totalEarnings: Float!
    orderDetails: [EarningsGraphOrderDetail!]!
    date: String!
  }

  type StoreEarningsGraphRow {
    _id: String!
    totalEarningsSum: Float!
    earningsArray: [StoreEarningsGraphDayEntry!]!
  }

  type StoreEarningsGraphResult {
    totalCount: Int!
    earnings: [StoreEarningsGraphRow!]!
  }

  type RiderEarningsGraphDayEntry {
    tip: Float!
    deliveryFee: Float!
    totalEarnings: Float!
    orderDetails: [EarningsGraphOrderDetail!]!
    date: String!
  }

  type RiderEarningsGraphRow {
    _id: String!
    date: String
    totalEarningsSum: Float!
    totalTipsSum: Float!
    totalDeliveries: Int!
    totalHours: Float!
    earningsArray: [RiderEarningsGraphDayEntry!]!
  }

  type RiderEarningsGraphResult {
    totalCount: Int!
    earnings: [RiderEarningsGraphRow!]!
  }

  extend type Query {
    withdrawRequests(userType: UserTypeEnum, userId: String, pagination: MoneyPaginationInput, search: String): WithdrawRequestsResult!
    storeCurrentWithdrawRequest(storeId: String): WithdrawRequest
    riderCurrentWithdrawRequest(riderId: String): WithdrawRequest
    storeEarningsGraph(storeId: ID!, page: Int, limit: Int, startDate: String, endDate: String): StoreEarningsGraphResult!
    riderEarningsGraph(riderId: ID!, page: Int, limit: Int, startDate: String, endDate: String): RiderEarningsGraphResult!
    transactionHistory(userType: UserTypeEnum, userId: String, search: String, pagination: MoneyPaginationInput, dateFilter: DateFilterInput): TransactionHistoryResult!
    earnings(
      userId: String
      userType: UserTypeEnum
      orderType: OrderTypeEnum
      paymentMethod: PaymentMethodEnum
      search: String
      pagination: MoneyPaginationInput
      dateFilter: DateFilterInput
    ): EarningsResult!
  }

  extend type Mutation {
    createWithdrawRequest(requestAmount: Float!, restaurant: String, userId: String): WithdrawRequest!
    updateWithdrawReqStatus(id: ID!, status: String!): WithdrawRequestMutationResult!
  }
`;
