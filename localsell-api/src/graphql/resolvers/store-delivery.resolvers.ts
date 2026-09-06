import { IResolvers } from '@graphql-tools/utils';
import { Order, StoreDeliveryAgent } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { notFoundError, userInputError } from '../../utils/errors';
import { publishOrderUpdate } from './order.resolvers';

/** The store must exist and be owned by the caller (admins pass through). */
async function assertOwnsStore(context: GraphQLContext, restaurantId: string) {
  const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw notFoundError('Store not found');
  if (currentUser.userType === 'VENDOR' && restaurant.ownerId !== currentUser.id) {
    throw notFoundError('Store not found');
  }
  return { currentUser, restaurant };
}

function shape(agent: StoreDeliveryAgent) {
  return {
    _id: agent.id,
    restaurantId: agent.restaurantId,
    name: agent.name,
    phone: agent.phone,
    isActive: agent.isActive,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
  };
}

export const storeDeliveryResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    storeDeliveryAgents: async (
      _parent,
      args: { storeId: string; includeInactive?: boolean },
      context,
    ) => {
      await assertOwnsStore(context, args.storeId);
      const agents = await prisma.storeDeliveryAgent.findMany({
        where: {
          restaurantId: args.storeId,
          ...(args.includeInactive ? {} : { isActive: true }),
        },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      });
      return agents.map(shape);
    },
  },

  Mutation: {
    createStoreDeliveryAgent: async (
      _parent,
      args: { storeId: string; name: string; phone?: string },
      context,
    ) => {
      await assertOwnsStore(context, args.storeId);
      const name = args.name.trim();
      if (!name) throw userInputError('A name is required');
      const agent = await prisma.storeDeliveryAgent.create({
        data: { restaurantId: args.storeId, name, phone: args.phone?.trim() || null },
      });
      return shape(agent);
    },

    updateStoreDeliveryAgent: async (
      _parent,
      args: { id: string; name?: string; phone?: string; isActive?: boolean },
      context,
    ) => {
      const existing = await prisma.storeDeliveryAgent.findUnique({ where: { id: args.id } });
      if (!existing) throw notFoundError('Delivery person not found');
      await assertOwnsStore(context, existing.restaurantId);
      const agent = await prisma.storeDeliveryAgent.update({
        where: { id: args.id },
        data: {
          ...(args.name !== undefined ? { name: args.name.trim() } : {}),
          ...(args.phone !== undefined ? { phone: args.phone?.trim() || null } : {}),
          ...(args.isActive !== undefined ? { isActive: args.isActive } : {}),
        },
      });
      return shape(agent);
    },

    deleteStoreDeliveryAgent: async (_parent, args: { id: string }, context) => {
      const existing = await prisma.storeDeliveryAgent.findUnique({ where: { id: args.id } });
      if (!existing) throw notFoundError('Delivery person not found');
      await assertOwnsStore(context, existing.restaurantId);
      // Orders keep a historical reference; if any exist, deactivate instead of
      // hard-deleting so the earnings / report history stays intact.
      const orderCount = await prisma.order.count({ where: { storeDeliveryAgentId: args.id } });
      if (orderCount > 0) {
        await prisma.storeDeliveryAgent.update({ where: { id: args.id }, data: { isActive: false } });
      } else {
        await prisma.storeDeliveryAgent.delete({ where: { id: args.id } });
      }
      return true;
    },

    assignStoreDeliveryAgent: async (
      _parent,
      args: { orderId: string; agentId?: string | null },
      context,
    ) => {
      const order = await prisma.order.findUnique({ where: { id: args.orderId } });
      if (!order) throw notFoundError('Order not found');
      const { restaurant } = await assertOwnsStore(context, order.restaurantId);

      if (order.isPickedUp) {
        throw userInputError('This is a pickup order — there is nothing to dispatch.');
      }
      if (['PICKED', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.orderStatus)) {
        throw userInputError('This order can no longer be reassigned.');
      }

      let data: Partial<Order>;
      if (args.agentId) {
        const agent = await prisma.storeDeliveryAgent.findUnique({ where: { id: args.agentId } });
        if (!agent || agent.restaurantId !== restaurant.id) throw userInputError('Delivery person not found');
        if (!agent.isActive) throw userInputError('That delivery person is inactive.');
        data = { storeDeliveryAgentId: agent.id, deliveryMode: 'SELF', riderId: null };
      } else {
        // Hand back to the LocalSell fleet. The store's deliveryProvider is a
        // default for new orders, not a per-order lock — an explicit tap here
        // always wins.
        data = { storeDeliveryAgentId: null, deliveryMode: 'PLATFORM' };
      }

      const updated = await prisma.order.update({ where: { id: order.id }, data });
      await publishOrderUpdate(updated);
      return updated;
    },
  },

  Order: {
    deliveryMode: (parent: Order) => parent.deliveryMode ?? 'PLATFORM',
    storeDeliveryAgent: (parent: Order) =>
      parent.storeDeliveryAgentId
        ? prisma.storeDeliveryAgent.findUnique({ where: { id: parent.storeDeliveryAgentId } })
        : null,
  },

  StoreDeliveryAgent: {
    _id: (parent: StoreDeliveryAgent & { _id?: string }) => parent._id ?? parent.id,
    createdAt: (parent: { createdAt: Date | string }) =>
      parent.createdAt instanceof Date ? parent.createdAt.toISOString() : parent.createdAt,
    updatedAt: (parent: { updatedAt: Date | string }) =>
      parent.updatedAt instanceof Date ? parent.updatedAt.toISOString() : parent.updatedAt,
  },
};
