import { IResolvers } from '@graphql-tools/utils';
import { OrderChatMessage } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireAuth } from '../../middleware/auth';
import { forbiddenError, notFoundError } from '../../utils/errors';
import { pubsub, TOPICS } from '../../utils/pubsub';

async function assertOrderChatAccess(context: GraphQLContext, order: { userId: string; riderId: string | null }) {
  const user = requireAuth(context);
  if (user.userType === 'ADMIN') return user;
  if (user.id === order.userId) return user;
  if (order.riderId && user.id === order.riderId) return user;
  throw forbiddenError();
}

export const chatResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    chat: async (_parent, args: { order: string }, context) => {
      const order = await prisma.order.findUnique({ where: { id: args.order } });
      if (!order) throw notFoundError('Order not found');
      await assertOrderChatAccess(context, order);
      return prisma.orderChatMessage.findMany({ where: { orderId: order.id }, orderBy: { createdAt: 'asc' } });
    },
  },

  Mutation: {
    sendChatMessage: async (
      _parent,
      args: { orderId: string; message: { message?: string; image?: string } },
      context,
    ) => {
      const currentUser = requireAuth(context);
      const order = await prisma.order.findUnique({ where: { id: args.orderId } });
      if (!order) throw notFoundError('Order not found');
      await assertOrderChatAccess(context, order);

      const created = await prisma.orderChatMessage.create({
        data: {
          orderId: order.id,
          senderId: currentUser.id,
          message: args.message.message,
          image: args.message.image,
        },
      });
      const payload = {
        id: created.id,
        message: created.message,
        image: created.image,
        createdAt: created.createdAt.toISOString(),
        user: { id: currentUser.id, name: currentUser.name },
      };
      await pubsub.publish(TOPICS.SUBSCRIPTION_NEW_MESSAGE(order.id), { subscriptionNewMessage: payload });
      return { success: true, message: 'Message sent', data: payload };
    },
  },

  Subscription: {
    subscriptionNewMessage: {
      subscribe: (_parent, args: { order: string }) =>
        pubsub.asyncIterableIterator(TOPICS.SUBSCRIPTION_NEW_MESSAGE(args.order)),
    },
  },

  ChatMessage: {
    createdAt: (parent: OrderChatMessage | { createdAt: string }) =>
      typeof parent.createdAt === 'string' ? parent.createdAt : parent.createdAt?.toISOString() ?? null,
    user: (parent: OrderChatMessage & { user?: { id: string; name: string | null } }) => {
      if (parent.user) return parent.user;
      return prisma.user.findUnique({ where: { id: parent.senderId } });
    },
  },
};
