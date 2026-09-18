import { gql } from "@apollo/client";

export const ACCEPT_ORDER = gql`
  mutation AcceptOrder($_id: String!, $time: String) {
    acceptOrder(_id: $_id, time: $time) {
      _id
      orderStatus
      preparationTime
    }
  }
`;

export const CANCEL_ORDER = gql`
  mutation CancelOrder($_id: String!, $reason: String!) {
    cancelOrder(_id: $_id, reason: $reason) {
      _id
      orderStatus
    }
  }
`;

export const MUTATE_ORDER_RING = gql`
  mutation muteRing($orderId: String) {
    muteRing(orderId: $orderId)
  }
`;

export const PICK_UP_ORDER = gql`
  mutation OrderPickedUp($_id: String!) {
    orderPickedUp(_id: $_id) {
      _id
      orderStatus
    }
  }
`;

// A customer self-pickup order has no rider/courier leg — "picked up" IS
// delivered. Marking it DELIVERED here is what moves it out of Processing
// and into History (unlike PICK_UP_ORDER, which only sets the in-transit
// "PICKED" status that a fleet/self-delivery order passes through).
export const MARK_PICKUP_COLLECTED = gql`
  mutation MarkPickupCollected($id: String!) {
    updateOrderStatus(id: $id, status: "DELIVERED") {
      _id
      orderStatus
    }
  }
`;
