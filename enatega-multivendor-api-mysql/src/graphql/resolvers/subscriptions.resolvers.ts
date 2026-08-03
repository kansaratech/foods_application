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
  },
};
