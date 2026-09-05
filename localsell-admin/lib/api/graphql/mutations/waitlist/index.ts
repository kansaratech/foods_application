import { gql } from '@apollo/client';

export const MARK_WAITLIST_NOTIFIED = gql`
  mutation MarkWaitlistNotified($id: String!, $notified: Boolean!) {
    markWaitlistNotified(id: $id, notified: $notified) {
      _id
      notified
    }
  }
`;
