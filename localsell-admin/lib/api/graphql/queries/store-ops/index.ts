import { gql } from '@apollo/client';

export const GET_STORE_PERFORMANCE = gql`
  query StorePerformance($startDate: String, $endDate: String, $page: Int, $limit: Int, $search: String) {
    storePerformance(startDate: $startDate, endDate: $endDate, page: $page, limit: $limit, search: $search) {
      total
      periodStart
      periodEnd
      rows {
        _id
        name
        approvalStatus
        orders
        delivered
        cancelled
        cancelRate
        gmv
        avgOrderValue
        commissionEarned
        avgRating
        reviewCount
        walletBalance
      }
    }
  }
`;

export const GET_STORE_DOCUMENTS = gql`
  query StoreDocuments($restaurantId: ID!) {
    storeDocuments(restaurantId: $restaurantId) {
      _id
      restaurantId
      storeName
      kind
      number
      fileUrl
      holderName
      ifsc
      bankName
      issueDate
      fileName
      fileSize
      createdAt
      expiryDate
      status
      reviewNote
      reviewedAt
      updatedAt
    }
  }
`;

export const GET_RESTAURANT_COMBOS = gql`
  query RestaurantCombos($restaurantId: String!) {
    restaurantCombos(restaurantId: $restaurantId) {
      _id
      title
      description
      image
      images
      badge
      isActive
      isOutOfStock
      isCombo
      compareAtPrice
      variations {
        _id
        title
        price
      }
      comboItems {
        foodId
        variationId
        title
        quantity
        image
        isOutOfStock
      }
    }
  }
`;

export const GET_MENU_FOR_PICKER = gql`
  query MenuForPicker($id: String!) {
    restaurant(id: $id) {
      _id
      categories {
        _id
        title
        foods {
          _id
          title
          image
          isCombo
          variations {
            _id
            title
            price
          }
        }
      }
    }
  }
`;

export const GET_PENDING_STORE_DOCUMENTS = gql`
  query PendingStoreDocuments($page: Int, $limit: Int) {
    pendingStoreDocuments(page: $page, limit: $limit) {
      total
      documents {
        _id
        restaurantId
        storeName
        kind
        number
        fileUrl
        holderName
        ifsc
        bankName
        issueDate
      fileName
      fileSize
      createdAt
      expiryDate
        status
        createdAt
      }
    }
  }
`;
