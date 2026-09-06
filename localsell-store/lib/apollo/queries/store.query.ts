import { gql } from "@apollo/client";

export const STORE_BY_ID = gql`
  query Restaurant($id: String) {
    restaurant(id: $id) {
      location {
        coordinates
      }
      totalWalletAmount
      withdrawnWalletAmount
      currentWalletAmount
      bussinessDetails {
        bankName
        accountNumber
        accountName
        accountCode
      }
    }
  }
`;

export const STORE_EARNINGS = gql`
  query StoreEarnings {
    earnings {
      data {
        grandTotalEarnings {
          storeTotal
        }
        earnings {
          storeEarnings {
            totalEarnings
          }
        }
      }
    }
  }
`;

export const STORE_TRANSACTIONS_HISTORY = gql`
  query TransactionHistory($pagination: MoneyPaginationInput) {
    transactionHistory(pagination: $pagination) {
      data {
        _id
        transactionId
        status
        amountTransferred
        amountCurrency
        userType
        createdAt
      }
      pagination {
        total
      }
    }
  }
`;

export const STORE_CURRENT_WITHDRAW_REQUEST = gql`
  query StoreCurrentWithdrawRequest($storeId: String) {
    storeCurrentWithdrawRequest(storeId: $storeId) {
      _id
      requestAmount
      status
      createdAt
    }
  }
`;

export const STORE_PROFILE = gql`
  query Restaurant($restaurantId: String!) {
    restaurant(id: $restaurantId) {
      _id
      unique_restaurant_id
      orderId
      orderPrefix
      name
      image
      logo
      address
      username
      minimumOrder
      isActive
      isAvailable
      slug
      commissionRate
      tax
      notificationToken
      enableNotification
      shopType
      phone
      hasBusinessDetails
      pickup
      delivery
      deliveryProvider
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

export const STORE_DOCUMENTS = gql`
  query StoreDocuments($restaurantId: ID!) {
    storeDocuments(restaurantId: $restaurantId) {
      _id
      kind
      number
      fileUrl
      holderName
      ifsc
      bankName
      expiryDate
      status
      reviewNote
    }
  }
`;

export const GET_RESTAURANT_BY_ID = gql`
  query Restaurant($id: String) {
    restaurant(id: $id) {
      _id
      orderId
      orderPrefix
      name
      image
      address
      location {
        coordinates
      }
      deliveryTime
      username
      isAvailable
      notificationToken
      enableNotification
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
