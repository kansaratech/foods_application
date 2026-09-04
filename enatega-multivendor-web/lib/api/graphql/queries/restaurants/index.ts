import { gql } from "@apollo/client";

export const RELATED_ITEMS = gql`
  query RelatedItems($itemId: String!, $restaurantId: String!) {
    relatedItems(itemId: $itemId, restaurantId: $restaurantId)
  }
`;

export const FOOD = gql`
  fragment FoodItem on Food {
    _id
    title
    image
    description
    badge
    subCategory
    isOutOfStock
    variations {
      _id
      title
      price
      discounted
      addons
    }
  }
`;

export const RESTAURANTS_FRAGMENT = gql`
  fragment RestaurantPreviewFields on Restaurant {
    _id
    name
    image
    logo
    slug
    shopType
    minimumOrder
    deliveryTime
    location {
      coordinates
    }
    reviewAverage
    reviewCount
    cuisines
    openingTimes {
      day
      times {
        startTime
        endTime
      }
    }
    isAvailable
    isActive
  }
`;

// The carousel endpoints (recentOrder/mostOrdered/topRatedVendors Preview)
// return the `RestaurantCarouselPreview` type, NOT `RestaurantPreview`. Spreading
// RestaurantPreviewFields on them fails with GRAPHQL_VALIDATION_FAILED, so use
// this dedicated fragment (same fields, all valid on the carousel type).
export const RESTAURANTS_CAROUSEL_FRAGMENT = gql`
  fragment RestaurantCarouselPreviewFields on RestaurantCarouselPreview {
    _id
    name
    image
    logo
    slug
    shopType
    minimumOrder
    deliveryTime
    location {
      coordinates
    }
    reviewAverage
    reviewCount
    cuisines
    openingTimes {
      day
      times {
        startTime
        endTime
      }
    }
    isAvailable
    isActive
  }
`;

export const RECENT_ORDER_RESTAURANTS = gql`
  ${RESTAURANTS_CAROUSEL_FRAGMENT}
  query GetRecentOrderRestaurants($latitude: Float, $longitude: Float) {
    recentOrderRestaurantsPreview(latitude: $latitude, longitude: $longitude) {
      ...RestaurantCarouselPreviewFields
    }
  }
`;

export const MOST_ORDER_RESTAURANTS = gql`
  ${RESTAURANTS_CAROUSEL_FRAGMENT}
  query GetMostOrderedRestaurants(
    $latitude: Float
    $longitude: Float
    $page: Int
    $limit: Int
    $shopType: String
  ) {
    mostOrderedRestaurantsPreview(
      latitude: $latitude
      longitude: $longitude
      page: $page
      limit: $limit
      shopType: $shopType
    ) {
      ...RestaurantCarouselPreviewFields
    }
  }
`;

export const NEAR_BY_RESTAURANTS_PREVIEW = gql`
  ${RESTAURANTS_FRAGMENT}
  query Restaurants(
    $latitude: Float
    $longitude: Float
    $radiusKm: Float
    $shopType: String
  ) {
    nearByRestaurants(
      latitude: $latitude
      longitude: $longitude
      radiusKm: $radiusKm
      shopType: $shopType
    ) {
      restaurants {
        ...RestaurantPreviewFields
      }
    }
  }
`;

export const ACTIVE_RESTAURANT_COUNT = gql`
  query ActiveRestaurantCount(
    $latitude: Float
    $longitude: Float
    $radiusKm: Float
    $shopType: String
  ) {
    activeRestaurantCount(
      latitude: $latitude
      longitude: $longitude
      radiusKm: $radiusKm
      shopType: $shopType
    )
  }
`;

export const POPULAR_RESTAURANTS_PREVIEW = gql`
  ${RESTAURANTS_CAROUSEL_FRAGMENT}
  query PopularRestaurantsPreview(
    $latitude: Float
    $longitude: Float
    $radiusKm: Float
    $limit: Int
    $shopType: String
  ) {
    popularRestaurantsPreview(
      latitude: $latitude
      longitude: $longitude
      radiusKm: $radiusKm
      limit: $limit
      shopType: $shopType
    ) {
      ...RestaurantCarouselPreviewFields
      reviewCount
    }
    activeRestaurantCount(
      latitude: $latitude
      longitude: $longitude
      radiusKm: $radiusKm
    )
  }
`;

export const GET_RESTAURANT_BY_ID_SLUG = gql`
  query RestaurantByIdAndSlug($id: String) {
    restaurant(id: $id) {
      _id
      orderId
      orderPrefix
      isActive
      name
      image
      logo
      slug
      username
      phone
      shopType
      address
      location {
        coordinates
      }
      deliveryTime
      minimumOrder
      tax
      stripeDetailsSubmitted
      reviewData {
        total
        ratings
        reviews {
          _id
          order {
            user {
              _id
              name
              email
            }
          }
          rating
          description
          createdAt
        }
      }
      categories {
        _id
        title
        foods {
          _id
          title
          image
          description
          badge
          isOutOfStock
          isCombo
          compareAtPrice
          subCategory
          comboItems {
            foodId
            variationId
            title
            quantity
            image
            isOutOfStock
          }
          pairedFoods {
            _id
            title
            image
            price
            isOutOfStock
          }
          variations {
            _id
            title
            price
            discounted
            addons
            isOutOfStock
          }
        }
      }
      options {
        _id
        title
        description
        price
      }
      addons {
        _id
        title
        description
        quantityMinimum
        quantityMaximum
        isRequired
        options {
          _id
          title
          description
          price
        }
      }
      zone {
        _id
        title
      }
      rating
      isAvailable
      openingTimes {
        day
        times {
          startTime
          endTime
        }
      }
    }
  }
`;

export const GET_REVIEWS_BY_RESTAURANT = gql`
  query GetReviewsByRestaurant($restaurant: String!) {
    reviewsByRestaurant(restaurant: $restaurant) {
      reviews {
        _id
        rating
        description
        comments
        isActive
        createdAt
        updatedAt
        order {
          _id
          user {
            _id
            name
            email
          }
        }
        restaurant {
          _id
          name
        }
      }
      ratings
      total
    }
  }
`;

export const GET_CATEGORIES_SUB_CATEGORIES_LIST = gql`
  query FetchCategoryDetailsByStoreId($storeId: String!) {
    fetchCategoryDetailsByStoreId(storeId: $storeId) {
      id
      label
      # slug
      url
      items {
        id
        label
        url
        # slug
      }
    }
  }
`;

export const GET_POPULAR_SUB_CATEGORIES_LIST = gql`
  query PopularItems($restaurantId: String!) {
    popularItems(restaurantId: $restaurantId) {
      id
      count
    }
  }
`;

export const GET_SUB_CATEGORIES = gql`
  query subCategories {
    subCategories {
      _id
      title
      parentCategoryId
    }
  }
`;
