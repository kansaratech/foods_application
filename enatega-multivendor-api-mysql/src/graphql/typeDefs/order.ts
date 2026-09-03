export const orderTypeDefs = /* GraphQL */ `
  type OrderItemAddonOption {
    _id: ID!
    id: ID!
    title: String!
    price: Float!
    description: String
  }

  type OrderItemAddon {
    _id: ID!
    id: ID!
    title: String!
    options: [OrderItemAddonOption!]!
    description: String
    quantityMinimum: Int
    quantityMaximum: Int
  }

  type OrderItem {
    _id: ID!
    id: ID!
    food: ID!
    title: String!
    price: Float!
    quantity: Int!
    specialInstructions: String
    variation: Variation
    addons: [OrderItemAddon!]!
    description: String
    image: String
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }

  type OrderUserLite {
    _id: ID!
    name: String
    phone: String
    email: String
    username: String
    available: Boolean
  }

  type OrderRestaurantLite {
    _id: ID!
    name: String!
    image: String
    logo: String
    slug: String
    shopType: String
    address: String
    location: Coordinates
  }

  type Order {
    _id: ID!
    id: ID!
    orderId: String!
    restaurant: OrderRestaurantLite!
    deliveryAddress: Address
    items: [OrderItem!]!
    user: OrderUserLite!
    rider: OrderUserLite
    paymentMethod: String!
    paidAmount: Float!
    orderAmount: Float!
    orderStatus: String!
    status: String!
    paymentStatus: String!
    isActive: Boolean!
    isPickedUp: Boolean!
    createdAt: String
    updatedAt: String
    deliveryCharges: Float!
    tipping: Float!
    taxationAmount: Float!
    discountAmount: Float!
    instructions: String
    orderDate: String
    expectedTime: String
    acceptedAt: String
    pickedAt: String
    deliveredAt: String
    cancelledAt: String
    assignedAt: String
    completionTime: String
    preparationTime: String
    reason: String
    isRinged: Boolean
    review: Review
  }

  type OrdersActiveOrdersResult {
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
    prevPage: Int
    nextPage: Int
    orders: [Order!]!
  }

  type OrderFilterRestaurant {
    _id: ID!
    name: String!
  }

  type OrderFilterRider {
    _id: ID!
    name: String
    username: String
    phone: String
  }

  type OrderFilterOptions {
    restaurants: [OrderFilterRestaurant!]!
    riders: [OrderFilterRider!]!
  }

  input OrderAddonInput {
    _id: ID!
    options: [ID!]!
  }

  input OrderItemInput {
    food: ID!
    quantity: Int!
    variation: ID
    addons: [OrderAddonInput!]
    specialInstructions: String
  }

  extend type Query {
    order(id: String!): Order
    orderDetails(id: String!): Order
    orders(offset: Int): [Order!]!
    getUsersActiveOrders(page: Int, limit: Int, offset: Int): [Order!]!
    getUsersPastOrders(page: Int, limit: Int, offset: Int): [Order!]!

    allOrders(page: Int): [Order!]!
    riderOrders: [Order!]!
    getActiveOrders(restaurantId: String, page: Int, rowsPerPage: Int, actions: [String], search: String): OrdersActiveOrdersResult!
    ordersByRestId(restaurant: String!, page: Int, rows: Int, search: String, orderStatus: [String]): OrdersActiveOrdersResult!
    restaurantOrders: [Order!]!
    allOrdersPaginated(
      page: Int
      rows: Int
      dateKeyword: String
      starting_date: String
      ending_date: String
      orderStatus: [String]
      search: String
      restaurantId: ID
      riderId: ID
    ): OrdersActiveOrdersResult!
    orderFilterOptions: OrderFilterOptions!
  }

  extend type Mutation {
    placeOrder(
      restaurant: String!
      orderInput: [OrderItemInput!]!
      paymentMethod: String!
      couponCode: String
      tipping: Float!
      taxationAmount: Float!
      address: AddressInput!
      orderDate: String!
      isPickedUp: Boolean!
      deliveryCharges: Float!
      instructions: String
    ): Order!
    abortOrder(id: String!): Order!
    "Customer (or admin) changes fulfilment type / payment method while the order is still PENDING. Recomputes the delivery fee + total."
    modifyOrder(
      id: ID!
      isPickedUp: Boolean
      paymentMethod: String
      address: AddressInput
      deliveryCharges: Float
    ): Order!
    updateOrderStatus(id: String!, status: String!): Order!
    updateStatus(id: String!, orderStatus: String!): Order!
    assignRider(id: String!, riderId: String!): Order!
    assignOrder(id: String!): Order!
    updateOrderStatusRider(id: String!, status: String!): Order!
    acceptOrder(_id: String!, time: String): Order!
    cancelOrder(_id: String!, reason: String!): Order!
    muteRing(orderId: String): Boolean!
    orderPickedUp(_id: String!): Order!
  }

  extend type Subscription {
    orderStatusChanged(userId: String!): OrderStatusChangedPayload!
    subscriptionOrder(id: String!): Order!
    subscribePlaceOrder(restaurant: String!): OrderStatusChangedPayload!
    subscriptionDispatcher: Order!
    subscriptionAssignRider(riderId: String!): RiderAssignedPayload!
    subscriptionZoneOrders(zoneId: String!): ZoneOrdersPayload!
  }

  type ZoneOrdersPayload {
    zoneId: String!
    origin: String
    order: Order!
  }

  type OrderStatusChangedPayload {
    userId: String!
    origin: String
    order: Order!
  }

  type RiderAssignedPayload {
    origin: String
    order: Order!
  }
`;
