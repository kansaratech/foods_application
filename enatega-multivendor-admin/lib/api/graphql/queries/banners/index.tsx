import { gql } from '@apollo/client';

export const GET_BANNERS = gql`
  query Banners {
    banners(activeOnly: false) {
      _id
      title
      description
      action
      screen
      file
      parameters
      startDate
      endDate
      placement
      priority
      couponCode
      isActive
    }
  }
`;
