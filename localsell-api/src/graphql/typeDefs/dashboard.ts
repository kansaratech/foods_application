export const dashboardTypeDefs = /* GraphQL */ `
  type PercentageChange {
    usersPercent: Float
    vendorsPercent: Float
    restaurantsPercent: Float
    ridersPercent: Float
  }

  type DashboardUsersByYear {
    usersCount: [Int!]!
    vendorsCount: [Int!]!
    restaurantsCount: [Int!]!
    ridersCount: [Int!]!
    percentageChange: PercentageChange!
  }

  type DashboardTypeStat {
    value: Float!
    label: String!
  }

  type RestaurantDashboardOrdersSalesStats {
    totalOrders: Int!
    totalSales: Float!
    totalCODOrders: Int!
    totalCardOrders: Int!
  }

  type RestaurantDashboardSalesOrderCountByYear {
    salesAmount: [Float!]!
    ordersCount: [Int!]!
  }

  type PaymentMethodStatsData {
    total_orders: Int!
    total_sales: Float!
    total_sales_without_delivery: Float!
    total_delivery_fee: Float!
  }

  type PaymentMethodTypeBreakdown {
    _type: String!
    data: PaymentMethodStatsData!
  }

  type PickupDeliveryTotal {
    total_orders: Int!
  }

  type RestaurantOrderSalesByPaymentMethod {
    total_orders: Int!
    total_sales: Float!
    total_sales_without_delivery: Float!
    total_delivery_fee: Float!
    pickup_total_orders: Int!
    delivery_total_orders: Int!
    pickup_orders: Int!
    delivery_orders: Int!
    pickup: PickupDeliveryTotal!
    delivery: PickupDeliveryTotal!
    all: [PaymentMethodTypeBreakdown!]!
    cod: [PaymentMethodTypeBreakdown!]!
    card: [PaymentMethodTypeBreakdown!]!
  }

  type StoreDetail {
    _id: ID!
    totalOrders: Int!
    restaurantName: String!
    totalSales: Float!
    pickUpCount: Int!
    deliveryCount: Int!
  }

  type StoreDetailPaginated {
    data: [StoreDetail!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  type VendorDashboardStatsCard {
    totalRestaurants: Int!
    totalOrders: Int!
    totalSales: Float!
    totalDeliveries: Int!
  }

  type VendorLiveMonitor {
    online_stores: Int!
    cancelled_orders: Int!
    delayed_orders: Int!
    ratings: Float
  }

  type VendorDashboardGrowthByYear {
    totalRestaurants: [Int!]!
    totalOrders: [Int!]!
    totalSales: [Float!]!
  }

  type AdminOpsSnapshot {
    ordersToday: Int!
    gmvToday: Float!
    ordersWeek: Int!
    gmvWeek: Float!
    "Orders/GMV for the immediately preceding window of equal length (for deltas)."
    ordersPrev: Int!
    gmvPrev: Float!
    activeOrders: Int!
    activeStores: Int!
    totalStores: Int!
    ridersOnline: Int!
    totalRiders: Int!
    pendingPayouts: Int!
    pendingPayoutAmount: Float!
    unbilledCommission: Float!
    codCashOutstanding: Float!
    waitlistUnnotified: Int!
  }

  type StorePerformanceRow {
    _id: ID!
    name: String!
    approvalStatus: String!
    orders: Int!
    delivered: Int!
    cancelled: Int!
    cancelRate: Float!
    gmv: Float!
    avgOrderValue: Float!
    commissionEarned: Float!
    avgRating: Float
    reviewCount: Int!
    walletBalance: Float!
  }

  type StorePerformanceResult {
    rows: [StorePerformanceRow!]!
    total: Int!
    periodStart: String!
    periodEnd: String!
  }

  extend type Query {
    adminOpsSnapshot(startDate: String, endDate: String): AdminOpsSnapshot!
    storePerformance(startDate: String, endDate: String, page: Int, limit: Int, search: String): StorePerformanceResult!
    getDashboardUsersByYear(year: Int!): DashboardUsersByYear!
    getDashboardOrdersByType: [DashboardTypeStat!]!
    getDashboardSalesByType: [DashboardTypeStat!]!

    getRestaurantDashboardOrdersSalesStats(
      restaurant: String!
      starting_date: String!
      ending_date: String!
      dateKeyword: String
    ): RestaurantDashboardOrdersSalesStats!

    getRestaurantDashboardSalesOrderCountDetailsByYear(restaurant: String!, year: Int!): RestaurantDashboardSalesOrderCountByYear!

    getRestaurantDashboardOrderSalesDetailsByPaymentMethod(
      restaurant: String!
      starting_date: String!
      ending_date: String!
      dateKeyword: String
    ): RestaurantOrderSalesByPaymentMethod!

    getStoreDetailsByVendorId(id: String!, dateKeyword: String, starting_date: String, ending_date: String): [StoreDetail!]!

    getStoreDetailsByVendorIdPaginated(
      id: String!
      dateKeyword: String
      starting_date: String
      ending_date: String
      page: Int
      limit: Int
      search: String
    ): StoreDetailPaginated!

    getVendorDashboardStatsCardDetails(
      vendorId: String!
      dateKeyword: String
      starting_date: String!
      ending_date: String!
    ): VendorDashboardStatsCard!

    getLiveMonitorData(id: String!, dateKeyword: String, starting_date: String, ending_date: String): VendorLiveMonitor!

    getVendorDashboardGrowthDetailsByYear(vendorId: String!, year: Int!): VendorDashboardGrowthByYear!
  }
`;
