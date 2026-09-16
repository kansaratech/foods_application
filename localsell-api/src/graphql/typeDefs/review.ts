export const reviewTypeDefs = /* GraphQL */ `
  type ReviewOrderUser {
    _id: ID!
    name: String
    email: String
  }

  type ReviewOrderLite {
    _id: ID!
    user: ReviewOrderUser
  }

  type ReviewRestaurantLite {
    _id: ID!
    name: String!
  }

  type Review {
    _id: ID!
    order: ReviewOrderLite
    restaurant: ReviewRestaurantLite
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
    total: Int!
    ratings: Float!
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
