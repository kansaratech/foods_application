export const serviceabilityTypeDefs = /* GraphQL */ `
  type ServiceabilityResult {
    serviceable: Boolean!
    storeCount: Int!
    nearestArea: String
    nearestDistanceKm: Float
  }

  type WaitlistEntry {
    _id: ID!
    email: String
    phone: String
    latitude: Float!
    longitude: Float!
    areaLabel: String
    source: String
    notified: Boolean!
    createdAt: String!
  }

  type WaitlistPaginated {
    entries: [WaitlistEntry!]!
    total: Int!
  }

  input JoinWaitlistInput {
    email: String
    phone: String
    latitude: Float!
    longitude: Float!
    areaLabel: String
    source: String
  }

  extend type Query {
    serviceability(latitude: Float!, longitude: Float!): ServiceabilityResult!
    waitlistEntries(page: Int, limit: Int, search: String): WaitlistPaginated!
  }

  extend type Mutation {
    joinWaitlist(input: JoinWaitlistInput!): Boolean!
    markWaitlistNotified(id: String!, notified: Boolean!): WaitlistEntry!
  }
`;
