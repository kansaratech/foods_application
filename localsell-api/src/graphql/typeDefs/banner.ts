export const bannerTypeDefs = /* GraphQL */ `
  type Banner {
    _id: ID!
    title: String
    description: String
    action: String
    screen: String
    file: String
    parameters: String
    startDate: String
    endDate: String
    placement: String
    priority: Int
    couponCode: String
    isActive: Boolean
    "Only set when action is 'Navigate Specific Restaurant' (screen holds that restaurant's id) — resolved LIVE from the restaurant, never cached on the banner, so routing never goes stale if the store's type/slug changes after the banner was created."
    shopType: String
    slug: String
  }

  input BannerInput {
    _id: ID
    title: String
    description: String
    file: String
    action: String
    screen: String
    startDate: String
    endDate: String
    placement: String
    priority: Int
    couponCode: String
    isActive: Boolean
  }

  extend type Query {
    "activeOnly (default true): only banners whose isActive is true and now is inside [startDate, endDate]."
    banners(placement: String, activeOnly: Boolean): [Banner!]!
  }

  extend type Mutation {
    createBanner(bannerInput: BannerInput!): Banner!
    editBanner(bannerInput: BannerInput!): Banner!
    deleteBanner(id: String!): Boolean!
  }
`;
