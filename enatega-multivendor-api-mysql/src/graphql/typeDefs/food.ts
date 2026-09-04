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
    id: ID!
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
    images: [String!]
    badge: String
    isActive: Boolean
    isOutOfStock: Boolean
    isCombo: Boolean
    comboItems: [ComboItemRef!]!
    compareAtPrice: Float
    pairedFoods: [FoodLite!]!
    subCategory: ID
    variations: [Variation!]!
    createdAt: String
    updatedAt: String
  }

  type FoodLite {
    _id: ID!
    title: String!
    image: String
    price: Float
    isOutOfStock: Boolean
  }

  type ComboItemRef {
    foodId: ID!
    variationId: ID
    title: String!
    quantity: Int!
    image: String
    isOutOfStock: Boolean
  }

  input ComboItemInput {
    foodId: ID!
    variationId: ID
    quantity: Int
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
    isRequired: Boolean
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
    images: [String!]
    badge: String
    isActive: Boolean
    category: ID!
    subCategory: ID
    variations: [VariationInput!]!
    isCombo: Boolean
    comboItems: [ComboItemInput!]
    compareAtPrice: Float
    pairedFoodIds: [ID!]
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
    isRequired: Boolean
    options: [OptionInput!]
  }

  extend type Query {
    "Combo / meal-deal Foods for a store (isCombo = true)."
    restaurantCombos(restaurantId: String!): [Food!]!
    popularFoodItems(restaurantId: String!): [Food!]!
    subCategories: [SubCategory!]!
    subCategory(id: String): SubCategory
    subCategoriesByParentId(parentCategoryId: String!): [SubCategory!]!
    restaurantCategoriesPaginated(restaurantId: String!, page: Int, limit: Int, search: String): CategoryPaginated!
    restaurantOptionsPaginated(restaurantId: String!, page: Int, limit: Int, search: String): OptionPaginated!
    restaurantAddonsPaginated(restaurantId: String!, page: Int, limit: Int, search: String): AddonPaginated!
  }

  type CategoryPaginated {
    data: [Category!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  type OptionPaginated {
    data: [Option!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  type AddonPaginated {
    data: [Addon!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  extend type Mutation {
    createFood(foodInput: FoodInput!): Restaurant!
    editFood(foodInput: FoodInput!): Restaurant!
    deleteFood(id: String!, restaurant: String!, categoryId: String!): Food!
    updateFoodOutOfStock(id: String!, restaurant: String!, categoryId: String!): Boolean!
    updateVariationOutOfStock(id: String!, restaurant: String!): Boolean!
    "Copy every category, item, variation and add-on from one store's menu into another."
    cloneMenu(fromRestaurantId: ID!, toRestaurantId: ID!, replace: Boolean): Restaurant!

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
