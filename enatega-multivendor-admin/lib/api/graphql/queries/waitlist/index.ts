import { gql } from '@apollo/client';

export const GET_WAITLIST_ENTRIES = gql`
  query WaitlistEntries($page: Int, $limit: Int, $search: String) {
    waitlistEntries(page: $page, limit: $limit, search: $search) {
      total
      entries {
        _id
        email
        phone
        latitude
        longitude
        areaLabel
        source
        notified
        createdAt
      }
    }
  }
`;
