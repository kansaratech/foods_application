import { gql } from "@apollo/client";

export const GET_ORDERS = gql`
  query Orders {
    restaurantOrders {
      _id
      orderId
      id
      restaurant {
        _id

        name
        image
        address
        location {
          coordinates
        }
      }
      deliveryAddress {
        location {
          coordinates
        }
        deliveryAddress
        details
        label
      }
      items {
        _id
        id
        title
        description
        image
        quantity
        specialInstructions

        variation {
          _id
          id
          title
          price
          discounted
        }
        addons {
          _id
          id
          options {
            _id
            id
            title
            description
            price
          }
          description
          title
          quantityMinimum
          quantityMaximum
        }
        specialInstructions
        isActive
        createdAt
        updatedAt
      }
      user {
        _id
        name
        phone
        email
      }
      paymentMethod
      paidAmount
      orderAmount
      orderStatus
      tipping
      taxationAmount
      status
      paymentStatus
      reason
      isActive
      createdAt
      orderDate
      pickedAt
      deliveryCharges
      isPickedUp
      preparationTime
      acceptedAt
      isRinged
      instructions
      deliveryMode
      storeDeliveryAgent {
        _id
        name
        phone
        isActive
      }
      rider {
        _id
        name
        username
        phone
        available
      }
      discountAmount
    }
  }
`;

export const ORDERS_BY_REST_ID = gql`
  query OrdersByRestId(
    $restaurant: String!
    $page: Int
    $rows: Int
    $search: String
    $orderStatus: [String]
    $deliveryMode: [String]
    $starting_date: String
    $ending_date: String
  ) {
    ordersByRestId(
      restaurant: $restaurant
      page: $page
      rows: $rows
      search: $search
      orderStatus: $orderStatus
      deliveryMode: $deliveryMode
      starting_date: $starting_date
      ending_date: $ending_date
    ) {
      totalCount
      currentPage
      totalPages
      prevPage
      nextPage
      orders {
        _id
        orderId
        orderStatus
        paymentMethod
        paymentStatus
        orderAmount
        deliveryCharges
        tipping
        taxationAmount
        discountAmount
        isPickedUp
        deliveryMode
        reason
        createdAt
        orderDate
        deliveredAt
        cancelledAt
        storeDeliveryAgent {
          _id
          name
          phone
        }
        user {
          _id
          name
          phone
        }
        rider {
          _id
          name
        }
        items {
          _id
          title
          quantity
        }
      }
    }
  }
`;
