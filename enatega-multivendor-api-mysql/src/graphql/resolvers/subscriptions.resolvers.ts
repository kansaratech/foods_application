import { IResolvers } from '@graphql-tools/utils';
import { GraphQLContext } from '../../context';
import { pubsub, TOPICS } from '../../utils/pubsub';

export const subscriptionResolvers: IResolvers<unknown, GraphQLContext> = {
  Subscription: {
    orderStatusChanged: {
      subscribe: (_parent, args: { userId: string }) =>
        pubsub.asyncIterableIterator(TOPICS.ORDER_STATUS_CHANGED(args.userId)),
    },
    subscriptionOrder: {
      subscribe: (_parent, args: { id: string }) => pubsub.asyncIterableIterator(TOPICS.SUBSCRIPTION_ORDER(args.id)),
    },
    subscribePlaceOrder: {
      subscribe: (_parent, args: { restaurant: string }) =>
        pubsub.asyncIterableIterator(TOPICS.SUBSCRIBE_PLACE_ORDER(args.restaurant)),
    },
    subscriptionDispatcher: {
      subscribe: () => pubsub.asyncIterableIterator(TOPICS.SUBSCRIPTION_DISPATCHER),
    },
    subscriptionAssignRider: {
      subscribe: (_parent, args: { riderId: string }) =>
        pubsub.asyncIterableIterator(TOPICS.SUBSCRIPTION_ASSIGN_RIDER(args.riderId)),
    },
    subscriptionZoneOrders: {
      subscribe: (_parent, args: { zoneId: string }) =>
        pubsub.asyncIterableIterator(TOPICS.SUBSCRIPTION_ZONE_ORDERS(args.zoneId)),
    },
  },
};
