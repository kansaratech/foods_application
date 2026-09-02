import { gql } from "@apollo/client";

export const ACTIVE_COUPONS = gql`
  query ActiveCoupons($restaurantId: ID) {
    activeCoupons(restaurantId: $restaurantId, campaignOnly: true) {
      _id
      title
      discount
      restaurantId
    }
  }
`;
