export const couponTypeDefs = /* GraphQL */ `
  type Coupon {
    _id: ID!
    title: String!
    discount: Float
    enabled: Boolean
    startDate: String
    endDate: String
    lifeTimeActive: Boolean
    restaurantId: String
  }

  type CouponPaginated {
    data: [Coupon!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  input CouponInput {
    _id: ID
    title: String!
    discount: Float
    enabled: Boolean
    lifeTimeActive: Boolean
    startDate: String
    endDate: String
  }

  type CouponVerifyResult {
    success: Boolean!
    message: String
    coupon: Coupon
  }

  extend type Query {
    coupons: [Coupon!]!
    couponsPaginated(page: Int, limit: Int, search: String, enabled: Boolean, startDate: String, endDate: String): CouponPaginated!
    restaurantCoupons(restaurantId: String!): [Coupon!]!
    restaurantCouponsPaginated(restaurantId: String!, page: Int, limit: Int, search: String, enabled: Boolean): CouponPaginated!
    "Enabled, in-window coupons for the storefront: globals plus (when restaurantId is given) that store's own. campaignOnly (default false) drops evergreen lifeTimeActive coupons, keeping only date-bounded campaign ones."
    activeCoupons(restaurantId: ID, campaignOnly: Boolean): [Coupon!]!
  }

  extend type Mutation {
    coupon(coupon: String!, restaurantId: ID!): CouponVerifyResult!
    createCoupon(couponInput: CouponInput!): Coupon!
    editCoupon(couponInput: CouponInput!): Coupon!
    deleteCoupon(id: String!): Boolean!

    createRestaurantCoupon(restaurantId: ID!, couponInput: CouponInput!): Coupon!
    editRestaurantCoupon(restaurantId: ID!, couponInput: CouponInput!): Coupon!
    deleteRestaurantCoupon(restaurantId: ID!, couponId: ID!): Boolean!
  }
`;
