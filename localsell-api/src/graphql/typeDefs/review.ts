export const reviewTypeDefs = /* GraphQL */ `
  type ReviewOrderUser {
    _id: ID!
    name: String
    email: String
  }

  type ReviewOrderLite {
    user: ReviewOrderUser
  }

  type Review {
    _id: ID!
    order: ReviewOrderLite
    rating: Int!
    description: String
    comments: String
    isActive: Boolean
    createdAt: String
  }

  type ReviewData {
    total: Int!
    ratings: Float!
    reviews: [Review!]!
  }

  type ReviewsByRestaurantResult {
    reviews: [Review!]!
  }

  input ReviewInput {
    order: String!
    rating: Int!
    description: String
    comments: String
  }

  extend type Query {
    reviewsByRestaurant(restaurant: String!): ReviewsByRestaurantResult!
  }

  extend type Mutation {
    reviewOrder(reviewInput: ReviewInput!): Order!
  }
`;
