export const adminTypeDefs = /* GraphQL */ `
  type RestaurantLite {
    _id: ID!
    orderId: String
    name: String!
    image: String
    address: String
  }

  type Vendor {
    _id: ID!
    unique_id: String
    email: String
    userType: String
    isActive: Boolean
    name: String
    image: String
    firstName: String
    lastName: String
    phoneNumber: String
    restaurants: [Restaurant!]!
    businessName: String
    businessType: String
    "The ShopType id businessType resolves from — lets the edit form preselect the right dropdown option without a slug round-trip."
    businessTypeId: String
    isGstRegistered: Boolean
    gstin: String
    "ACTIVE | DRAFT — a DRAFT vendor was started in the registration wizard but not yet finalized."
    status: String
  }

  type OwnerAuthPayload {
    userId: ID!
    token: String!
    tokenExpiration: String
    refreshToken: String
    refreshTokenExpiration: String
    email: String
    userType: String
    name: String
    image: String
    permissions: [String!]!
    userTypeId: String
    restaurants: [RestaurantLite!]!
    isActive: Boolean
  }

  type AdminUser {
    _id: ID!
    name: String
    email: String
    phone: String
    userType: String
    status: String
    notes: String
    createdAt: String
    updatedAt: String
    lastLogin: String
    phoneIsVerified: Boolean
    emailIsVerified: Boolean
    isActive: Boolean
    isOrderNotification: Boolean
    isOfferNotification: Boolean
    notificationToken: String
    favourite: [String!]!
    addresses: [Address!]!
  }

  type UsersPaginated {
    data: [AdminUser!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  input VendorInput {
    _id: ID
    name: String
    email: String!
    image: String
    firstName: String
    lastName: String
    phoneNumber: String
    password: String
    businessName: String
    # Accepts either a ShopType id or slug, resolved server-side.
    businessType: String
    isGstRegistered: Boolean
    gstin: String
  }

  type DashboardUsers {
    usersCount: Int!
    vendorsCount: Int!
    restaurantsCount: Int!
    ridersCount: Int!
  }

  type ResetUserSessionResult {
    _id: ID!
  }

  type WebNotification {
    _id: ID!
    body: String
    navigateTo: String
    read: Boolean
    createdAt: String
  }

  type MetricsGeneral {
    excellence: String
    topgun: String
    experience: String
    skydiver: String
    rider: String
    haha: String
    hehe: String
    huhu: String
    yoyo: String
    turu: String
  }

  extend type Query {
    ownerSession: OwnerAuthPayload
    hasOwnerPermission(permission: String!): Boolean!

    vendors: [Vendor!]!
    getVendor(id: String!): Vendor

    users: [AdminUser!]!
    usersPaginated(
      page: Int
      limit: Int
      search: String
      registrationMethod: String
      status: String
    ): UsersPaginated!
    user(id: ID!): AdminUser

    getDashboardUsers: DashboardUsers!

    webNotifications: [WebNotification!]!
  }

  extend type Mutation {
    ownerLogin(email: String!, password: String!): OwnerAuthPayload!
    refreshToken(refreshToken: String!, userType: String!): OwnerAuthPayload!

    markWebNotificationsAsRead: [WebNotification!]!

    createVendor(vendorInput: VendorInput!): Vendor!
    "Lenient partial save used by the registration wizard's Continue/Save draft actions. Only email is required; leaves status DRAFT."
    saveVendorDraft(vendorInput: VendorInput!): Vendor!
    editVendor(vendorInput: VendorInput!): Vendor!
    deleteVendor(id: String!): Boolean!

    updateUserStatus(id: ID!, status: String!, reason: String): AdminUser!
    updateUserNotes(id: ID!, notes: String!): AdminUser!
    deleteUser(id: ID!): AdminUser!
    resetUserSession(userId: ID!): ResetUserSessionResult!

    metricsGeneral: MetricsGeneral!
  }
`;
