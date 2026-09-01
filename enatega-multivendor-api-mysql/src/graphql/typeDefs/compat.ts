/**
 * Compatibility surface for the legacy Enatega mobile apps (customer/rider/store)
 * whose query documents predate this MySQL API. These add thin aliases / stubs so
 * the apps stop throwing GraphQL validation errors on secondary features. Where a
 * real implementation exists it is delegated to; the rest return safe defaults.
 */
export const compatTypeDefs = /* GraphQL */ `
  type Tip {
    _id: ID!
    tipVariations: [Float!]!
    enabled: Boolean
  }

  type PlatformVersion {
    android: String
    ios: String
  }

  type AppVersions {
    customerAppVersion: PlatformVersion
    riderAppVersion: PlatformVersion
    restaurantAppVersion: PlatformVersion
  }

  "Legacy customer-app 'popular items' row: a food id + how many times it was ordered."
  type PopularItem {
    id: ID!
    count: Int!
  }

  "Legacy customer-app grocery-detail category/food mapping row."
  type StoreCategoryDetail {
    id: ID!
    category_name: String
    url: String
    food_id: ID
  }

  extend type Query {
    tips: Tip!
    relatedItems(itemId: String!, restaurantId: String!): [ID!]!
    popularItems(restaurantId: String!): [PopularItem!]!
    fetchCategoryDetailsByStoreIdForMobile(storeId: String!): [StoreCategoryDetail!]!
    getVersions: AppVersions!
  }
`;
