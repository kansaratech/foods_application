export const riderDocsTypeDefs = /* GraphQL */ `
  type RiderDocument {
    _id: ID!
    riderId: ID!
    kind: String!
    number: String
    fileUrl: String
    holderName: String
    ifsc: String
    bankName: String
    status: String!
    reviewNote: String
    reviewedAt: String
    createdAt: String!
    updatedAt: String!
  }

  type RiderDocumentSummary {
    required: Int!
    submitted: Int!
    verified: Int!
    rejected: Int!
    pending: Int!
  }

  type RiderDocumentsResult {
    documents: [RiderDocument!]!
    total: Int!
  }

  extend type Rider {
    documentSummary: RiderDocumentSummary!
  }

  extend type Query {
    riderDocuments(riderId: ID!): [RiderDocument!]!
    "Admin review queue: riders with at least one PENDING document."
    pendingRiderDocuments(page: Int, limit: Int): RiderDocumentsResult!
  }

  extend type Mutation {
    upsertRiderDocument(
      riderId: ID!
      kind: String!
      number: String
      fileUrl: String
      holderName: String
      ifsc: String
      bankName: String
    ): RiderDocument!
    reviewRiderDocument(id: ID!, status: String!, note: String): RiderDocument!
    deleteRiderDocument(id: ID!): Boolean!
  }
`;
