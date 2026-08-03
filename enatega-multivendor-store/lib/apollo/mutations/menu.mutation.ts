import { gql } from "@apollo/client";

export const CREATE_CATEGORY = gql`
  mutation CreateCategory($category: CategoryInput!) {
    createCategory(category: $category) {
      _id
    }
  }
`;

export const EDIT_CATEGORY = gql`
  mutation EditCategory($category: CategoryInput!) {
    editCategory(category: $category) {
      _id
    }
  }
`;

export const DELETE_CATEGORY = gql`
  mutation DeleteCategory($id: String!, $restaurant: String!) {
    deleteCategory(id: $id, restaurant: $restaurant) {
      _id
    }
  }
`;

export const CREATE_FOOD = gql`
  mutation CreateFood($foodInput: FoodInput!) {
    createFood(foodInput: $foodInput) {
      _id
    }
  }
`;

export const EDIT_FOOD = gql`
  mutation EditFood($foodInput: FoodInput!) {
    editFood(foodInput: $foodInput) {
      _id
    }
  }
`;

export const DELETE_FOOD = gql`
  mutation DeleteFood($id: String!, $restaurant: String!, $categoryId: String!) {
    deleteFood(id: $id, restaurant: $restaurant, categoryId: $categoryId) {
      _id
    }
  }
`;

export const UPDATE_FOOD_OUT_OF_STOCK = gql`
  mutation UpdateFoodOutOfStock(
    $id: String!
    $restaurant: String!
    $categoryId: String!
  ) {
    updateFoodOutOfStock(id: $id, restaurant: $restaurant, categoryId: $categoryId)
  }
`;

export const CREATE_ADDON = gql`
  mutation CreateAddon($addonInput: AddonInput!) {
    createAddon(addonInput: $addonInput) {
      _id
      title
      description
      quantityMinimum
      quantityMaximum
      options {
        _id
        title
        description
        price
      }
    }
  }
`;

export const EDIT_ADDON = gql`
  mutation EditAddon($addonInput: AddonInput!) {
    editAddon(addonInput: $addonInput) {
      _id
      title
      description
      quantityMinimum
      quantityMaximum
      options {
        _id
        title
        description
        price
      }
    }
  }
`;

export const DELETE_ADDON = gql`
  mutation DeleteAddon($id: String!, $restaurant: String!) {
    deleteAddon(id: $id, restaurant: $restaurant)
  }
`;
