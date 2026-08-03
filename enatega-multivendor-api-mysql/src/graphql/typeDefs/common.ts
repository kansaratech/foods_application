export const commonTypeDefs = /* GraphQL */ `
  type Coordinates {
    coordinates: [Float!]!
  }

  type Result {
    result: String
  }

  type SuccessMessage {
    success: Boolean!
    message: String
  }

  type Configuration {
    _id: ID!
    currency: String
    currencySymbol: String
    deliveryRate: Float
    termsAndConditions: String
    privacyPolicy: String
    testOtp: String
    skipMobileVerification: Boolean
    skipEmailVerification: Boolean
    costType: String
  }

  type ShopType {
    _id: ID!
    name: String!
    image: String
    slug: String!
    isActive: Boolean
  }

  type ShopTypeFetchPaginated {
    data: [ShopType!]!
    total: Int!
    page: Int!
    pageSize: Int!
    totalPages: Int!
    hasNextPage: Boolean!
    hasPrevPage: Boolean!
  }

  input CreateShopTypeInput {
    name: String!
    image: String
  }

  input UpdateShopTypeInput {
    _id: ID!
    name: String
    image: String
    isActive: Boolean
  }

  input FetchShopTypeFilter {
    search: String
    isActive: Boolean
  }

  input PaginationInput {
    page: Int
    limit: Int
  }

  type Cuisine {
    _id: ID!
    name: String!
    description: String
    image: String
    shopType: String
  }

  type CuisinePaginated {
    data: [Cuisine!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  input CuisineInput {
    _id: ID
    name: String!
    description: String
    image: String
    shopType: String
  }

  type UploadResponse {
    imageUrl: String!
  }

  type ShopTypeList {
    data: [ShopType!]!
  }

  type Query {
    configuration: Configuration
    fetchAllShopTypes: ShopTypeList
    fetchShopTypes(filter: FetchShopTypeFilter, pagination: PaginationInput): ShopTypeFetchPaginated!
    cuisines: [Cuisine!]!
    cuisinesPaginated(page: Int, limit: Int, search: String, shopType: String): CuisinePaginated!
  }

  type Mutation {
    uploadImageToS3(image: String!): UploadResponse!
    createShopType(dto: CreateShopTypeInput): ShopType!
    updateShopType(dto: UpdateShopTypeInput): ShopType!
    deleteShopType(id: String!): ShopType!
    createCuisine(cuisineInput: CuisineInput!): Cuisine!
    editCuisine(cuisineInput: CuisineInput!): Cuisine!
    deleteCuisine(id: String!): Boolean!
  }

  type Subscription {
    _noop: Boolean
  }
`;
