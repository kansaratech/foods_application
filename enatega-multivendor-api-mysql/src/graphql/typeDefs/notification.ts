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
  }
`;
