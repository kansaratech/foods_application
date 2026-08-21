export const userTypeDefs = /* GraphQL */ `
  type Address {
    _id: ID!
    id: ID!
    label: String
    deliveryAddress: String
    details: String
    location: Coordinates
    selected: Boolean
  }

  type User {
    _id: ID!
    name: String
    phone: String
    phoneIsVerified: Boolean
    email: String
    emailIsVerified: Boolean
    notificationToken: String
    isActive: Boolean
    isOrderNotification: Boolean
    isOfferNotification: Boolean
    addresses: [Address!]!
    favourite: [String!]!
  }

  type AuthPayload {
    userId: ID!
    token: String!
    tokenExpiration: String
    isActive: Boolean
    name: String
    email: String
    phone: String
    isNewUser: Boolean
  }

  type DeactivateResult {
    isActive: Boolean
  }

  type PushTokenResult {
    _id: ID!
    notificationToken: String
  }

  type NotificationStatusResult {
    _id: ID!
    notificationToken: String
    isOrderNotification: Boolean
    isOfferNotification: Boolean
  }

  input UserInput {
    phone: String
    email: String
    password: String
    name: String
    notificationToken: String
    appleId: String
    emailIsVerified: Boolean
    isPhoneExists: Boolean
  }

  input UpdateUserInput {
    name: String!
    phone: String
    phoneIsVerified: Boolean
    emailIsVerified: Boolean
  }

  input AddressInput {
    _id: ID
    label: String
    deliveryAddress: String
    details: String
    longitude: String
    latitude: String
  }

  extend type Query {
    profile: User
  }

  extend type Mutation {
    login(email: String, password: String, type: String!, appleId: String, idToken: String, name: String, notificationToken: String): AuthPayload!
    createUser(userInput: UserInput!): AuthPayload!
    updateUser(updateUserInput: UpdateUserInput!): User!
    emailExist(email: String!): Boolean!
    phoneExist(phone: String!): Boolean!
    sendOtpToEmail(email: String!): Result!
    sendOtpToPhoneNumber(phone: String!): Result!
    verifyOtp(otp: String!, email: String, phone: String): Result!
    forgotPassword(email: String!): Result!
    resetPassword(password: String!, email: String!, otp: String!): Result!
    changePassword(oldPassword: String!, newPassword: String!): Boolean!
    Deactivate(isActive: Boolean!, email: String!): DeactivateResult!
    pushToken(token: String): PushTokenResult!
    updateNotificationStatus(offerNotification: Boolean!, orderNotification: Boolean!): NotificationStatusResult!
    addFavourite(id: ID!): User!

    createAddress(addressInput: AddressInput!): User!
    editAddress(addressInput: AddressInput!): User!
    deleteAddress(id: ID!): User!
    deleteBulkAddresses(ids: [ID!]!): User!
    selectAddress(id: String!): User!
  }
`;
