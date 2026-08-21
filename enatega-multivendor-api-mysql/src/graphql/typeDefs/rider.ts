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

  type TimeSlot {
    startTime: String
    endTime: String
  }

  type DaySchedule {
    day: String
    enabled: Boolean
    slots: [TimeSlot!]
  }

  type Rider {
    _id: ID!
    name: String
    username: String
    phone: String
    email: String
    image: String
    available: Boolean
    isActive: Boolean
    vehicleType: String
    assigned: [String!]
    zone: ZoneLite
    location: Coordinates
    timeZone: String
    workSchedule: [DaySchedule!]
    bussinessDetails: BussinessDetails
    licenseDetails: LicenseDetails
    vehicleDetails: VehicleDetails
    accountNumber: String
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

  input TimeSlotInput {
    startTime: String
    endTime: String
  }

  input DayScheduleInput {
    day: String!
    enabled: Boolean!
    slots: [TimeSlotInput!]
  }

  input LicenseDetailsInput {
    number: String
    expiryDate: String
    image: String
  }

  input VehicleDetailsInput {
    number: String
    image: String
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
    riderLogin(username: String, password: String, notificationToken: String, timeZone: String!): AuthPayload!
    updateRiderLocation(latitude: String!, longitude: String!): Rider!
    updateRiderLicenseDetails(id: String!, licenseDetails: LicenseDetailsInput): Rider!
    updateRiderVehicleDetails(id: String!, vehicleDetails: VehicleDetailsInput): Rider!
    updateRiderBussinessDetails(id: String!, bussinessDetails: BussinessDetailsInput): Rider!
    updateWorkSchedule(riderId: String!, workSchedule: [DayScheduleInput!]!, timeZone: String!): Rider!
  }

  extend type Subscription {
    riderUpdated: RiderUpdatedPayload!
    subscriptionRiderLocation(riderId: String!): Rider!
  }

  type RiderUpdatedPayload {
    _id: ID!
  }
`;
