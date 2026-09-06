import { gql } from "@apollo/client";

export const UPDATE_DELIVERY_OPTIONS = gql`
  mutation UpdateDeliveryOptions(
    $restId: String!
    $pickup: Boolean!
    $delivery: Boolean!
    $deliveryProvider: String
  ) {
    updateDeliveryOptions(
      restId: $restId
      pickup: $pickup
      delivery: $delivery
      deliveryProvider: $deliveryProvider
    ) {
      deliveryOptions {
        pickup
        delivery
        deliveryProvider
      }
    }
  }
`;

export const CREATE_STORE_DELIVERY_AGENT = gql`
  mutation CreateStoreDeliveryAgent($storeId: ID!, $name: String!, $phone: String) {
    createStoreDeliveryAgent(storeId: $storeId, name: $name, phone: $phone) {
      _id
      name
      phone
      isActive
    }
  }
`;

export const UPDATE_STORE_DELIVERY_AGENT = gql`
  mutation UpdateStoreDeliveryAgent(
    $id: ID!
    $name: String
    $phone: String
    $isActive: Boolean
  ) {
    updateStoreDeliveryAgent(id: $id, name: $name, phone: $phone, isActive: $isActive) {
      _id
      name
      phone
      isActive
    }
  }
`;

export const DELETE_STORE_DELIVERY_AGENT = gql`
  mutation DeleteStoreDeliveryAgent($id: ID!) {
    deleteStoreDeliveryAgent(id: $id)
  }
`;

export const ASSIGN_STORE_DELIVERY_AGENT = gql`
  mutation AssignStoreDeliveryAgent($orderId: ID!, $agentId: ID) {
    assignStoreDeliveryAgent(orderId: $orderId, agentId: $agentId) {
      _id
      orderStatus
      deliveryMode
      isPickedUp
      storeDeliveryAgent {
        _id
        name
        phone
      }
    }
  }
`;

export const MARK_ORDER_DELIVERED = gql`
  mutation MarkOrderDelivered($id: String!, $orderStatus: String!) {
    updateStatus(id: $id, orderStatus: $orderStatus) {
      _id
      orderStatus
    }
  }
`;
