import { gql } from "@apollo/client";

export const SUBSCRIPTION_NEW_MESSAGE = gql`
  subscription SubscriptionNewMessage($order: ID!) {
    subscriptionNewMessage(order: $order) {
      id
      message
      image
      user {
        id
        name
      }
      createdAt
    }
  }
`;

// NOTE: subscriptionZoneOrders has no backend implementation yet (there's no
// restaurant-to-zone geo mapping in the schema to key it off). Riders still
// see zone-wide unclaimed orders via the RIDER_ORDERS polling query - this
// subscription would only add instant push on top of that. Left unused until
// zone matching is designed.
export const SUBSCRIPTION_ZONE_ORDERS = gql`
  subscription SubscriptionZoneOrders($zoneId: String!) {
    subscriptionZoneOrders(zoneId: $zoneId) {
      zoneId
      origin
      order {
        _id
        createdAt
        acceptedAt
        expectedTime
        pickedAt
        isPickedUp
        deliveredAt
        deliveryCharges
        orderId
        restaurant {
          _id
          name
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
          label
          details
        }
        items {
          _id
          title
          food
          description
          quantity
          variation {
            _id
            title
            price
          }
          addons {
            _id
            options {
              _id
              title
              price
            }
            title
            description
            quantityMinimum
            quantityMaximum
          }
          createdAt
        }
        user {
          _id
          name
          phone
        }
        paymentMethod
        paidAmount
        orderAmount
        paymentStatus
        orderStatus
        tipping
        taxationAmount
        rider {
          _id
          name
          username
        }
      }
    }
  }
`;

export const SUBSCRIPTION_ASSIGNED_RIDER = gql`
  subscription SubscriptionAssignRider($riderId: String!) {
    subscriptionAssignRider(riderId: $riderId) {
      order {
        _id
        orderId
        createdAt
        acceptedAt
        pickedAt
        isPickedUp
        deliveredAt
        expectedTime
        deliveryCharges
        restaurant {
          _id
          name
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
          label
          details
        }
        items {
          _id
          title
          image
          food
          description
          quantity
          variation {
            _id
            title
            price
          }
          addons {
            _id
            options {
              _id
              title
              price
            }
            title
            description
            quantityMinimum
            quantityMaximum
          }
          createdAt
        }
        user {
          _id
          name
          phone
        }
        paymentMethod
        paidAmount
        orderAmount
        paymentStatus
        orderStatus
        tipping
        taxationAmount
        rider {
          _id
          name
          username
        }
      }
      origin
    }
  }
`;

export const SUBSCRIPTION_ORDERS = gql`
  subscription SubscriptionOrder($id: String!) {
    subscriptionOrder(id: $id) {
      _id
      orderStatus
      rider {
        _id
      }
    }
  }
`;
