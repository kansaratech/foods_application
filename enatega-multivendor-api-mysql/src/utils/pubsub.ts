import { PubSub } from 'graphql-subscriptions';

export const pubsub = new PubSub();

export const TOPICS = {
  ORDER_STATUS_CHANGED: (userId: string) => `ORDER_STATUS_CHANGED.${userId}`,
  SUBSCRIPTION_ORDER: (orderId: string) => `SUBSCRIPTION_ORDER.${orderId}`,
};
