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
    status: String
    employmentType: String
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
    currentTask: RiderCurrentTask
    createdAt: String
    updatedAt: String
  }

  type RiderCurrentTask {
    orderId: String
    status: String
  }

  type RiderStats {
    total: Int!
    online: Int!
    onDelivery: Int!
    documentsPending: Int!
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
    email: String
    image: String
    zone: String
    vehicleType: String
    vehicleNumber: String
    employmentType: String
    available: Boolean
    isActive: Boolean
    password: String
    "When true and no password is supplied, a random invite password is generated and an account-setup message is sent."
    sendSetupLink: Boolean
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
    ridersPaginated(page: Int, limit: Int, search: String, zone: String, available: Boolean, isActive: Boolean, vehicleType: String, onDelivery: Boolean): RiderPaginated!
    rider(id: String!): Rider
    availableRiders: [Rider!]!
    ridersByZone(id: String!): [Rider!]!
    riderStats: RiderStats!
  }

  extend type Mutation {
    createRider(riderInput: RiderInput!): Rider!
    "Lenient upsert used by the multi-step rider registration form's 'Save as draft' action."
    saveRiderDraft(riderInput: RiderInput!): Rider!
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
