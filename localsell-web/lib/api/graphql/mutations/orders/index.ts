import { gql } from "@apollo/client";

export const PLACE_ORDER = gql`
  mutation PlaceOrder(
    $restaurant: String!
    $orderInput: [OrderItemInput!]!
    $paymentMethod: String!
    $couponCode: String
    $tipping: Float!
    $taxationAmount: Float!
    $address: AddressInput!
    $orderDate: String!
    $isPickedUp: Boolean!
    $deliveryCharges: Float!
    $instructions: String
    $recipientPhone: String
  ) {
    placeOrder(
      restaurant: $restaurant
      orderInput: $orderInput
      paymentMethod: $paymentMethod
      couponCode: $couponCode
      tipping: $tipping
      taxationAmount: $taxationAmount
      address: $address
      orderDate: $orderDate
      isPickedUp: $isPickedUp
      deliveryCharges: $deliveryCharges
      instructions: $instructions
      recipientPhone: $recipientPhone
    ) {
      _id
      orderId
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
      }
      items {
        _id
        title
        food
        description
        quantity
        price
        variation {
          _id
          title
          price
          discounted
        }
        addons {
          _id
          options {
            _id
            title
            description
            price
            quantity
          }
          title
          description
          quantityMinimum
          quantityMaximum
        }
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
      paymentMethod
      paidAmount
      orderAmount
      orderStatus
      orderDate
      expectedTime
      isPickedUp
      deliveryCharges
      tipping
      taxationAmount
      createdAt
    }
  }
`;

export const ADD_REVIEW_ORDER = gql`
  mutation ReviewOrder(
    $order: String!
    $rating: Int!
    $description: String
    $comments: String
  ) {
    reviewOrder(
      reviewInput: {
        order: $order
        rating: $rating
        description: $description
        comments: $comments
      }
    ) {
      _id
      orderId
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
      }
      items {
        _id
        title
        food
        description
        quantity
        price
        variation {
          _id
          title
          price
          discounted
        }
        addons {
          _id
          options {
            _id
            title
            description
            price
            quantity
          }
          title
          description
          quantityMinimum
          quantityMaximum
        }
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
      review {
        _id
        rating
        description
      }
      paymentMethod
      paidAmount
      orderAmount
      orderStatus
      tipping
      taxationAmount
      createdAt
      orderDate
      expectedTime
      isPickedUp
      deliveryCharges
      acceptedAt
      pickedAt
      deliveredAt
      cancelledAt
    }
  }
`;

export const MODIFY_ORDER = gql`
  mutation ModifyOrder($id: ID!, $isPickedUp: Boolean, $paymentMethod: String) {
    modifyOrder(id: $id, isPickedUp: $isPickedUp, paymentMethod: $paymentMethod) {
      _id
      orderStatus
      isPickedUp
      paymentMethod
      deliveryCharges
      orderAmount
    }
  }
`;

export const CREATE_CASHFREE_PAYMENT_SESSION = gql`
  mutation CreateCashfreePaymentSession($orderId: ID!) {
    createCashfreePaymentSession(orderId: $orderId) {
      success
      message
      paymentSessionId
      cfOrderId
    }
  }
`;

export const RECHECK_CASHFREE_PAYMENT = gql`
  mutation RecheckCashfreePayment($orderId: ID!) {
    recheckCashfreePayment(orderId: $orderId) {
      success
      message
      paymentStatus
    }
  }
`;

export const ABORT_ORDER = gql`
  mutation AbortOrder($id: String!) {
    abortOrder(id: $id) {
      _id
      orderId
      orderStatus
      cancelledAt
      restaurant {
        _id
        name
      }
      user {
        _id
        name
      }
      rider {
        _id
        name
      }
    }
  }
`;
