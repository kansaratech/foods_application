export const foodTypeDefs = /* GraphQL */ `
  type Category {
    _id: ID!
    title: String!
    image: String
    foods: [Food!]!
    createdAt: String
    updatedAt: String
  }

  type Variation {
    _id: ID!
    title: String!
    price: Float!
    discounted: Float
    isOutOfStock: Boolean
    addons: [ID!]!
  }

  type Food {
    _id: ID!
    title: String!
    description: String
    image: String
    isActive: Boolean
    isOutOfStock: Boolean
    subCategory: ID
    variations: [Variation!]!
    createdAt: String
    updatedAt: String
  }

  type SubCategory {
    _id: ID!
    title: String!
    parentCategoryId: ID!
  }

  input SubCategoryInput {
    title: String!
    parentCategoryId: String!
  }

  type Option {
    _id: ID!
    title: String!
    description: String
    price: Float!
  }

  type Addon {
    _id: ID!
    title: String!
    description: String
    quantityMinimum: Int
    quantityMaximum: Int
    options: [Option!]!
  }

  input VariationInput {
    _id: ID
    title: String!
    price: Float!
    discounted: Float
    isOutOfStock: Boolean
    addons: [ID!]
  }

  input FoodInput {
    _id: ID
    restaurant: ID!
    title: String!
    description: String
    image: String
    isActive: Boolean
    category: ID!
    subCategory: ID
    variations: [VariationInput!]!
  }

  input CategoryInput {
    _id: ID
    title: String!
    image: String
    restaurant: ID!
  }

  input OptionInput {
    _id: ID
    title: String!
    description: String
    price: Float!
  }

  input AddonInput {
    _id: ID
    restaurant: ID!
    title: String!
    description: String
    quantityMinimum: Int
    quantityMaximum: Int
    options: [OptionInput!]
  }

  extend type Query {
    popularFoodItems(restaurantId: String!): [Food!]!
    subCategories: [SubCategory!]!
    subCategory(id: String): SubCategory
    subCategoriesByParentId(parentCategoryId: String!): [SubCategory!]!
    restaurantCategoriesPaginated(restaurantId: String!, page: Int, limit: Int, search: String): CategoryPaginated!
  }

  type CategoryPaginated {
    data: [Category!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  extend type Mutation {
    createFood(foodInput: FoodInput!): Restaurant!
    editFood(foodInput: FoodInput!): Restaurant!
    deleteFood(id: String!, restaurant: String!, categoryId: String!): Food!
    updateFoodOutOfStock(id: String!, restaurant: String!, categoryId: String!): Boolean!

    createCategory(category: CategoryInput!): Restaurant!
    editCategory(category: CategoryInput!): Restaurant!
    deleteCategory(id: String!, restaurant: String!): Restaurant!

    createAddon(addonInput: AddonInput!): Addon!
    editAddon(addonInput: AddonInput!): Addon!
    deleteAddon(id: String!, restaurant: String!): Boolean!

    createSubCategories(subCategories: [SubCategoryInput!]!): Boolean!
    deleteSubCategory(_id: String!): Boolean!
  }
`;
