export const notificationTypeDefs = /* GraphQL */ `
  type Notification {
    _id: ID!
    title: String
    body: String
    createdAt: String
  }

  type NotificationsPaginated {
    data: [Notification!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  type NotificationTokenResult {
    success: Boolean!
    message: String
  }

  extend type Query {
    notifications: [Notification!]!
    notificationsPaginated(page: Int, limit: Int, search: String): NotificationsPaginated!
  }

  extend type Mutation {
    sendNotificationUser(notificationTitle: String, notificationBody: String!): Boolean!
    saveNotificationTokenWeb(token: String!): NotificationTokenResult!
    "Public: a restaurant owner or rider applies to join from the marketing site. Records a lead the onboarding team sees in Admin → Notifications."
    submitPartnerApplication(
      role: String!
      firstName: String!
      lastName: String!
      email: String!
      phone: String!
    ): Boolean!
  }
`;
