export const bannerTypeDefs = /* GraphQL */ `
  type Banner {
    _id: ID!
    title: String
    description: String
    action: String
    screen: String
    file: String
    parameters: String
  }

  input BannerInput {
    _id: ID
    title: String
    description: String
    file: String
    action: String
    screen: String
  }

  extend type Query {
    banners: [Banner!]!
  }

  extend type Mutation {
    createBanner(bannerInput: BannerInput!): Banner!
    editBanner(bannerInput: BannerInput!): Banner!
    deleteBanner(id: String!): Boolean!
  }
`;
