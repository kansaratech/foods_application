export const staffTypeDefs = /* GraphQL */ `
  type Staff {
    _id: ID!
    name: String
    email: String
    phone: String
    isActive: Boolean
    permissions: [String!]
    userType: String
  }

  type StaffPaginated {
    data: [Staff!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  input StaffInput {
    _id: ID
    name: String
    email: String!
    phone: String
    isActive: Boolean
    permissions: [String!]
    password: String
  }

  extend type Query {
    staffs: [Staff!]!
    staffsPaginated(page: Int, limit: Int, search: String, isActive: Boolean): StaffPaginated!
  }

  extend type Mutation {
    createStaff(staffInput: StaffInput!): Staff!
    editStaff(staffInput: StaffInput!): Staff!
    deleteStaff(id: String!): Staff!
  }
`;
