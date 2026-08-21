import { PubSub } from 'graphql-subscriptions';

export const pubsub = new PubSub();

export const TOPICS = {
  ORDER_STATUS_CHANGED: (userId: string) => `ORDER_STATUS_CHANGED.${userId}`,
  SUBSCRIPTION_ORDER: (orderId: string) => `SUBSCRIPTION_ORDER.${orderId}`,
  SUBSCRIBE_PLACE_ORDER: (restaurantId: string) => `SUBSCRIBE_PLACE_ORDER.${restaurantId}`,
  SUBSCRIPTION_DISPATCHER: 'SUBSCRIPTION_DISPATCHER',
  SUBSCRIPTION_ZONE_ORDERS: (zoneId: string) => `SUBSCRIPTION_ZONE_ORDERS.${zoneId}`,
  SUBSCRIPTION_ASSIGN_RIDER: (riderId: string) => `SUBSCRIPTION_ASSIGN_RIDER.${riderId}`,
  SUBSCRIPTION_RIDER_LOCATION: (riderId: string) => `SUBSCRIPTION_RIDER_LOCATION.${riderId}`,
  SUBSCRIPTION_NEW_MESSAGE: (orderId: string) => `SUBSCRIPTION_NEW_MESSAGE.${orderId}`,
};
