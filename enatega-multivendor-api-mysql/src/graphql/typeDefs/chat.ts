export const chatTypeDefs = /* GraphQL */ `
  type ChatUserLite {
    id: ID!
    name: String
  }

  type ChatMessage {
    id: ID!
    message: String
    image: String
    user: ChatUserLite
    createdAt: String
  }

  type SendChatMessageResult {
    success: Boolean!
    message: String
    data: ChatMessage
  }

  input ChatUserInput {
    id: ID!
    name: String
  }

  input ChatMessageInput {
    message: String
    image: String
    user: ChatUserInput
  }

  extend type Query {
    chat(order: ID!): [ChatMessage!]!
  }

  extend type Mutation {
    sendChatMessage(orderId: ID!, message: ChatMessageInput!): SendChatMessageResult!
  }

  extend type Subscription {
    subscriptionNewMessage(order: ID!): ChatMessage!
  }
`;
