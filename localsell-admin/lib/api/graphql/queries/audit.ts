import { gql } from '@apollo/client';

export const GET_AUDIT_LOGS = gql`
  query AuditLogs($page: Int, $limit: Int) {
    auditLogs(page: $page, limit: $limit) {
      auditLogs {
        _id
        timestamp
        admin {
          _id
          email
        }
        actorType
        action
        targetType
        targetId
        summary
        changes
      }
      totalCount
      currentPage
      totalPages
    }
  }
`;
