import { gql } from "@apollo/client";

export const RESTAURANT_CATEGORIES_PAGINATED = gql`
  query RestaurantCategoriesPaginated(
    $restaurantId: String!
    $page: Int
    $limit: Int
    $search: String
  ) {
    restaurantCategoriesPaginated(
      restaurantId: $restaurantId
      page: $page
      limit: $limit
      search: $search
    ) {
      data {
        _id
        title
        image
        foods {
          _id
          title
          description
          image
          isActive
          isOutOfStock
          variations {
            _id
            title
            price
            discounted
            isOutOfStock
            addons
          }
        }
      }
      totalCount
      currentPage
      totalPages
    }
  }
`;

export const RESTAURANT_ADDONS = gql`
  query RestaurantAddons($id: String) {
    restaurant(id: $id) {
      addons {
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
  }
`;
