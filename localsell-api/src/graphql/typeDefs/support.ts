export const supportTypeDefs = /* GraphQL */ `
  type TicketUser {
    _id: ID!
    name: String
    email: String
    phone: String
    isActive: Boolean
    userType: String
  }

  type SupportTicket {
    _id: ID!
    title: String
    description: String
    status: String
    category: String
    orderId: String
    otherDetails: String
    createdAt: String
    updatedAt: String
    user: TicketUser
  }

  type TicketMessage {
    _id: ID!
    content: String
    senderType: String
    isRead: Boolean
    ticket: ID
    createdAt: String
    updatedAt: String
  }

  type TicketUserWithLatest {
    _id: ID!
    name: String
    email: String
    phone: String
    isActive: Boolean
    userType: String
    latestTicket: SupportTicket
  }

  type TicketUsersWithLatestResult {
    users: [TicketUserWithLatest!]!
    docsCount: Int!
    totalPages: Int!
    currentPage: Int!
  }

  type TicketUsersResult {
    users: [TicketUser!]!
    docsCount: Int!
    totalPages: Int!
    currentPage: Int!
  }

  type SingleUserSupportTicketsResult {
    tickets: [SupportTicket!]!
    docsCount: Int!
    totalPages: Int!
    currentPage: Int!
  }

  type TicketUserRefLite {
    _id: ID!
    name: String
  }

  type TicketMessagesTicketRef {
    _id: ID!
    title: String
    status: String
    user: TicketUserRefLite
  }

  type TicketMessagesResult {
    messages: [TicketMessage!]!
    ticket: TicketMessagesTicketRef
    page: Int!
    totalPages: Int!
    docsCount: Int!
  }

  input SupportTicketInput {
    title: String!
    description: String!
    category: String!
    userType: String
    orderId: String
    otherDetails: String
  }

  input MessageInput {
    content: String!
    ticket: ID!
  }

  input UpdateSupportTicketInput {
    ticketId: ID!
    status: String!
  }

  input FiltersInput {
    page: Int
    limit: Int
  }

  input SingleUserSupportTicketsInput {
    userId: ID!
    filters: FiltersInput
  }

  input TicketMessagesInput {
    ticket: ID!
    page: Int
    limit: Int
  }

  extend type Query {
    getTicketUsersWithLatest(input: FiltersInput): TicketUsersWithLatestResult!
    getTicketUsers(input: FiltersInput): TicketUsersResult!
    getSingleUserSupportTickets(input: SingleUserSupportTicketsInput!): SingleUserSupportTicketsResult!
    getSingleSupportTicket(ticketId: ID!): SupportTicket
    getTicketMessages(input: TicketMessagesInput!): TicketMessagesResult!
  }

  extend type Mutation {
    createSupportTicket(ticketInput: SupportTicketInput!): SupportTicket!
    createMessage(messageInput: MessageInput!): TicketMessage!
    updateSupportTicketStatus(input: UpdateSupportTicketInput!): SupportTicket!
  }
`;
