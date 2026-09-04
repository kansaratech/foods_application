export const auditTypeDefs = /* GraphQL */ `
  type AuditActor {
    _id: ID
    email: String
  }

  type AuditLog {
    _id: ID!
    timestamp: String!
    admin: AuditActor
    actorType: String
    action: String!
    targetType: String
    targetId: String
    summary: String
    changes: String
  }

  type AuditLogsResult {
    auditLogs: [AuditLog!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  extend type Query {
    auditLogs(page: Int, limit: Int, action: String, targetType: String, search: String): AuditLogsResult!
  }
`;
