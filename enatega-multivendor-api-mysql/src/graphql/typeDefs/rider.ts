export const riderTypeDefs = /* GraphQL */ `
  type LicenseDetails {
    number: String
    expiryDate: String
    image: String
  }

  type VehicleDetails {
    number: String
    image: String
  }

  type BussinessDetails {
    bankName: String
    accountName: String
    accountCode: String
    accountNumber: String
    bussinessRegNo: String
    companyRegNo: String
    taxRate: Float
  }

  type ZoneLite {
    _id: ID!
    title: String
  }

  type Rider {
    _id: ID!
    name: String
    username: String
    phone: String
    email: String
    available: Boolean
    isActive: Boolean
    vehicleType: String
    assigned: [String!]
    zone: ZoneLite
    bussinessDetails: BussinessDetails
    licenseDetails: LicenseDetails
    vehicleDetails: VehicleDetails
    currentWalletAmount: Float
    totalWalletAmount: Float
    withdrawnWalletAmount: Float
    createdAt: String
    updatedAt: String
  }

  type RiderPaginated {
    data: [Rider!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  input RiderInput {
    _id: ID
    name: String!
    username: String
    phone: String
    zone: String
    vehicleType: String
    available: Boolean
    password: String
  }

  extend type Query {
    riders: [Rider!]!
    ridersPaginated(page: Int, limit: Int, search: String, zone: String, available: Boolean, isActive: Boolean): RiderPaginated!
    rider(id: String!): Rider
    availableRiders: [Rider!]!
    ridersByZone(id: String!): [Rider!]!
  }

  extend type Mutation {
    createRider(riderInput: RiderInput!): Rider!
    editRider(riderInput: RiderInput!): Rider!
    deleteRider(id: String!): Rider!
    toggleAvailablity(id: String!): Rider!
  }

  extend type Subscription {
    riderUpdated: RiderUpdatedPayload!
  }

  type RiderUpdatedPayload {
    _id: ID!
  }
`;
