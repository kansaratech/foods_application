export const storeDocsTypeDefs = /* GraphQL */ `
  type StoreDocument {
    _id: ID!
    restaurantId: ID!
    storeName: String
    kind: String!
    number: String
    fileUrl: String
    holderName: String
    ifsc: String
    bankName: String
    expiryDate: String
    status: String!
    reviewNote: String
    reviewedAt: String
    createdAt: String!
    updatedAt: String!
  }

  type StoreDocumentSummary {
    required: Int!
    submitted: Int!
    verified: Int!
    rejected: Int!
    pending: Int!
  }

  type StoreDocumentsResult {
    documents: [StoreDocument!]!
    total: Int!
  }

  extend type Restaurant {
    documentSummary: StoreDocumentSummary!
  }

  extend type Query {
    storeDocuments(restaurantId: ID!): [StoreDocument!]!
    "Admin review queue: stores with at least one PENDING document."
    pendingStoreDocuments(page: Int, limit: Int): StoreDocumentsResult!
  }

  extend type Mutation {
    upsertStoreDocument(
      restaurantId: ID!
      kind: String!
      number: String
      fileUrl: String
      holderName: String
      ifsc: String
      bankName: String
      expiryDate: String
    ): StoreDocument!
    reviewStoreDocument(id: ID!, status: String!, note: String): StoreDocument!
    deleteStoreDocument(id: ID!): Boolean!
  }
`;
