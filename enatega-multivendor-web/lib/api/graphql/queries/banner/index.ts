import { gql } from "@apollo/client";

export const GET_BANNERS = gql`
  query Banners($placement: String) {
    banners(placement: $placement) {
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
