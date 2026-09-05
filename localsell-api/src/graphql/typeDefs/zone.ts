export const zoneTypeDefs = /* GraphQL */ `
  type ZoneLocation {
    coordinates: [[[Float]]]
  }

  type Zone {
    _id: ID!
    title: String!
    description: String
    location: ZoneLocation
    isActive: Boolean
  }

  type ZonePaginated {
    data: [Zone!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  input ZoneInput {
    _id: ID
    title: String!
    description: String
    coordinates: [[[Float]]]
  }

  extend type Query {
    zones: [Zone!]!
    zonesPaginated(page: Int, limit: Int, search: String, isActive: Boolean): ZonePaginated!
  }

  extend type Mutation {
    createZone(zone: ZoneInput!): Zone!
    editZone(zone: ZoneInput!): Zone!
    deleteZone(id: String!): Zone!
  }
`;
