export const orderTypeDefs = /* GraphQL */ `
  type OrderItemAddonOption {
    _id: ID!
    title: String!
    price: Float!
  }

  type OrderItemAddon {
    _id: ID!
    title: String!
    options: [OrderItemAddonOption!]!
  }

  type OrderItem {
    _id: ID!
    food: ID!
    title: String!
    price: Float!
    quantity: Int!
    specialInstructions: String
    variation: Variation
    addons: [OrderItemAddon!]!
  }

  type OrderUserLite {
    _id: ID!
    name: String
    phone: String
    email: String
  }

  type OrderRestaurantLite {
    _id: ID!
    name: String!
    image: String
    address: String
    location: Coordinates
  }

  type Order {
    _id: ID!
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
  }

  type OrdersActiveOrdersResult {
    totalCount: Int!
    orders: [Order!]!
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
    orders(offset: Int): [Order!]!
    getUsersActiveOrders(page: Int, limit: Int, offset: Int): [Order!]!
    getUsersPastOrders(page: Int, limit: Int, offset: Int): [Order!]!

    allOrders(page: Int): [Order!]!
    getActiveOrders(restaurantId: String, page: Int, rowsPerPage: Int, search: String): OrdersActiveOrdersResult!
    ordersByRestId(restaurant: String!, page: Int, rows: Int, search: String): OrdersActiveOrdersResult!
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
    updateOrderStatus(id: String!, status: String!): Order!
    updateStatus(id: String!, orderStatus: String!): Order!
    assignRider(id: String!, riderId: String!): Order!
  }

  extend type Subscription {
    orderStatusChanged(userId: String!): OrderStatusChangedPayload!
    subscriptionOrder(id: String!): Order!
  }

  type OrderStatusChangedPayload {
    userId: String!
    origin: String
    order: Order!
  }
`;
