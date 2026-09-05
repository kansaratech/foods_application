export const vendorDocsTypeDefs = /* GraphQL */ `
  type VendorDocument {
    _id: ID!
    vendorId: ID!
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

  type VendorDocumentSummary {
    required: Int!
    submitted: Int!
    verified: Int!
    rejected: Int!
    pending: Int!
  }

  type VendorDocumentsResult {
    documents: [VendorDocument!]!
    total: Int!
  }

  extend type Vendor {
    documentSummary: VendorDocumentSummary!
  }

  extend type Query {
    vendorDocuments(vendorId: ID!): [VendorDocument!]!
    "Admin review queue: vendors with at least one PENDING document."
    pendingVendorDocuments(page: Int, limit: Int): VendorDocumentsResult!
  }

  extend type Mutation {
    upsertVendorDocument(
      vendorId: ID!
      kind: String!
      number: String
      fileUrl: String
      holderName: String
      ifsc: String
      bankName: String
    ): VendorDocument!
    reviewVendorDocument(id: ID!, status: String!, note: String): VendorDocument!
    deleteVendorDocument(id: ID!): Boolean!
  }
`;
