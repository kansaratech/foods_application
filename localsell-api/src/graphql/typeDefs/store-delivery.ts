export const storeDeliveryTypeDefs = /* GraphQL */ `
  type StoreDeliveryAgent {
    _id: ID!
    restaurantId: ID!
    name: String!
    phone: String
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  extend type Order {
    "PICKUP | SELF | PLATFORM — how this order is being fulfilled."
    deliveryMode: String!
    storeDeliveryAgent: StoreDeliveryAgent
  }

  extend type Query {
    storeDeliveryAgents(storeId: ID!, includeInactive: Boolean): [StoreDeliveryAgent!]!
  }

  extend type Mutation {
    createStoreDeliveryAgent(storeId: ID!, name: String!, phone: String): StoreDeliveryAgent!
    updateStoreDeliveryAgent(id: ID!, name: String, phone: String, isActive: Boolean): StoreDeliveryAgent!
    deleteStoreDeliveryAgent(id: ID!): Boolean!
    "Store dispatch choice for a delivery order it has accepted. agentId set = the store's own person (deliveryMode SELF); agentId null = hand back to the LocalSell fleet (deliveryMode PLATFORM)."
    assignStoreDeliveryAgent(orderId: ID!, agentId: ID): Order!
  }
`;
