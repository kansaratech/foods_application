import { gql } from "@apollo/client";

// Lightweight poll target for the Cashfree return page — just enough to know
// whether the webhook has flipped paymentStatus yet, without the full
// tracking payload ORDER_TRACKING pulls (items/restaurant/address/etc).
export const ORDER_PAYMENT_STATUS = gql`
  query OrderPaymentStatus($orderDetailsId: String!) {
    orderDetails(id: $orderDetailsId) {
      _id
      orderId
      paymentMethod
      paymentStatus
      orderStatus
    }
  }
`;

export const ORDER_TRACKING = gql`
  query OrderDetails($orderDetailsId: String!) {
    orderDetails(id: $orderDetailsId) {
      _id
      orderId
      restaurant {
        _id
        name
        image
        slug
        address
        location {
          coordinates
          __typename
        }
        __typename
      }
      deliveryAddress {
        location {
          coordinates
          __typename
        }
        deliveryAddress
        __typename
      }
      items {
        _id
        title
        food
        description
        quantity
        image
        price
        variation {
          _id
          title
          price
          discounted
          __typename
        }
        addons {
          _id
          options {
            _id
            title
            description
            price
            quantity
            __typename
          }
          title
          description
          quantityMinimum
          quantityMaximum
          __typename
        }
        __typename
      }
      user {
        _id
        name
        phone
        __typename
      }
      rider {
        _id
      }
      paymentMethod
      paymentStatus
      paidAmount
      refundStatus
      refundedAmount
      refundedAt
      refundError
      orderAmount
      discountAmount
      orderStatus
      deliveryCharges
      tipping
      taxationAmount
      orderDate
      expectedTime
      isPickedUp
      deliveryOtp
      deliveryConfirmedBy
      createdAt
      cancelledAt
      deliveredAt
      acceptedAt
      pickedAt
      instructions
      reason
      cancelledByType
      cancelledByName
      __typename
    }
  }
`;
