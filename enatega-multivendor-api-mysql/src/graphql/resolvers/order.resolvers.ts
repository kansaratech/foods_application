import { IResolvers } from '@graphql-tools/utils';
import { Order, OrderItem, OrderItemAddon, OrderItemAddonOption, OrderStatus } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireAuth, requireRole } from '../../middleware/auth';
import { buildOrderItems, generateDisplayOrderId, OrderItemInput } from '../../services/order.service';
import { notFoundError, userInputError } from '../../utils/errors';
import { pubsub, TOPICS } from '../../utils/pubsub';

const ACTIVE_STATUSES: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PICKED', 'ASSIGNED'];
const PAST_STATUSES: OrderStatus[] = ['DELIVERED', 'COMPLETED', 'CANCELLED'];
const ORDER_STATUS_VALUES: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'PICKED',
  'ASSIGNED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
];

interface PlaceOrderArgs {
  restaurant: string;
  orderInput: OrderItemInput[];
  paymentMethod: string;
  couponCode?: string;
  tipping: number;
  taxationAmount: number;
  address: { _id?: string; label?: string; deliveryAddress?: string; details?: string; longitude?: string; latitude?: string };
  orderDate: string;
  isPickedUp: boolean;
  deliveryCharges: number;
  instructions?: string;
}

async function publishOrderUpdate(order: Order) {
  await pubsub.publish(TOPICS.ORDER_STATUS_CHANGED(order.userId), {
    orderStatusChanged: { userId: order.userId, origin: 'order_service', order },
  });
  await pubsub.publish(TOPICS.SUBSCRIPTION_ORDER(order.id), { subscriptionOrder: order });
}

async function applyOrderStatusUpdate(context: GraphQLContext, id: string, statusInput: string): Promise<Order> {
  const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
  const status = statusInput.toUpperCase() as OrderStatus;
  if (!ORDER_STATUS_VALUES.includes(status)) throw userInputError(`Invalid order status: ${statusInput}`);

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw notFoundError('Order not found');
  if (currentUser.userType === 'VENDOR') {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: order.restaurantId } });
    if (!restaurant || restaurant.ownerId !== currentUser.id) throw notFoundError('Order not found');
  }

  const timestampField: Partial<Record<OrderStatus, string>> = {
    ACCEPTED: 'acceptedAt',
    PICKED: 'pickedAt',
    DELIVERED: 'deliveredAt',
    CANCELLED: 'cancelledAt',
  };
  const field = timestampField[status];

  const updated = await prisma.order.update({
    where: { id },
    data: {
      orderStatus: status,
      status: status === 'CANCELLED' ? 'CANCELLED' : status === 'DELIVERED' || status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
      ...(field ? { [field]: new Date() } : {}),
    },
  });
  await publishOrderUpdate(updated);
  return updated;
}

async function resolveOrderAddress(userId: string, input: PlaceOrderArgs['address']): Promise<string> {
  if (input._id) {
    const existing = await prisma.address.findFirst({ where: { id: input._id, userId } });
    if (!existing) throw userInputError('Address not found');
    return existing.id;
  }
  const created = await prisma.address.create({
    data: {
      userId,
      label: input.label,
      deliveryAddress: input.deliveryAddress,
      details: input.details,
      latitude: input.latitude ? Number(input.latitude) : null,
      longitude: input.longitude ? Number(input.longitude) : null,
    },
  });
  return created.id;
}

export const orderResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    order: async (_parent, args: { id: string }, context) => {
      const currentUser = requireAuth(context);
      const order = await prisma.order.findUnique({ where: { id: args.id } });
      if (!order) return null;
      const isOwner = order.userId === currentUser.id || order.riderId === currentUser.id;
      const isStaff = currentUser.userType === 'ADMIN' || currentUser.userType === 'VENDOR';
      if (!isOwner && !isStaff) throw notFoundError('Order not found');
      return order;
    },
    orders: (_parent, args: { offset?: number }, context) => {
      const currentUser = requireAuth(context);
      return prisma.order.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: 'desc' },
        skip: args.offset ?? 0,
      });
    },
    getUsersActiveOrders: (_parent, args: { page?: number; limit?: number; offset?: number }, context) => {
      const currentUser = requireAuth(context);
      const limit = args.limit ?? 20;
      return prisma.order.findMany({
        where: { userId: currentUser.id, orderStatus: { in: ACTIVE_STATUSES } },
        orderBy: { createdAt: 'desc' },
        skip: args.offset ?? 0,
        take: limit,
      });
    },
    getUsersPastOrders: (_parent, args: { page?: number; limit?: number; offset?: number }, context) => {
      const currentUser = requireAuth(context);
      const limit = args.limit ?? 20;
      return prisma.order.findMany({
        where: { userId: currentUser.id, orderStatus: { in: PAST_STATUSES } },
        orderBy: { createdAt: 'desc' },
        skip: args.offset ?? 0,
        take: limit,
      });
    },

    allOrders: (_parent, args: { page?: number }, context) => {
      requireRole(context, ['ADMIN']);
      const limit = 20;
      const page = args.page ?? 1;
      return prisma.order.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit });
    },
    getActiveOrders: async (
      _parent,
      args: { restaurantId?: string; page?: number; rowsPerPage?: number; search?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const limit = args.rowsPerPage ?? 20;
      const page = args.page ?? 1;
      const where = {
        orderStatus: { in: ACTIVE_STATUSES },
        ...(args.restaurantId ? { restaurantId: args.restaurantId } : {}),
        ...(currentUser.userType === 'VENDOR' ? { restaurant: { ownerId: currentUser.id } } : {}),
      };
      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        prisma.order.count({ where }),
      ]);
      return { orders, totalCount };
    },
    ordersByRestId: async (
      _parent,
      args: { restaurant: string; page?: number; rows?: number; search?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      if (currentUser.userType === 'VENDOR') {
        const restaurant = await prisma.restaurant.findUnique({ where: { id: args.restaurant } });
        if (!restaurant || restaurant.ownerId !== currentUser.id) throw notFoundError('Restaurant not found');
      }
      const limit = args.rows ?? 20;
      const page = args.page ?? 1;
      const where = { restaurantId: args.restaurant };
      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        prisma.order.count({ where }),
      ]);
      return { orders, totalCount };
    },
  },

  Mutation: {
    placeOrder: async (_parent, args: PlaceOrderArgs, context) => {
      const currentUser = requireAuth(context);
      const restaurant = await prisma.restaurant.findUnique({ where: { id: args.restaurant } });
      if (!restaurant || !restaurant.isActive) throw userInputError('Restaurant not found or unavailable');

      const { itemsData, itemsTotal } = await buildOrderItems(args.restaurant, args.orderInput);
      if (itemsTotal < restaurant.minimumOrder) {
        throw userInputError(`Order amount is below the restaurant's minimum order of ${restaurant.minimumOrder}`);
      }

      const addressId = await resolveOrderAddress(currentUser.id, args.address);
      const orderAmount = itemsTotal + args.deliveryCharges + args.tipping + args.taxationAmount;

      const order = await prisma.order.create({
        data: {
          orderId: generateDisplayOrderId(),
          userId: currentUser.id,
          restaurantId: args.restaurant,
          addressId,
          paymentMethod: args.paymentMethod,
          tipping: args.tipping,
          taxationAmount: args.taxationAmount,
          deliveryCharges: args.deliveryCharges,
          orderAmount,
          instructions: args.instructions,
          isPickedUp: args.isPickedUp,
          orderDate: new Date(args.orderDate),
          items: { create: itemsData },
        },
      });

      await publishOrderUpdate(order);
      return order;
    },

    abortOrder: async (_parent, args: { id: string }, context) => {
      const currentUser = requireAuth(context);
      const order = await prisma.order.findUnique({ where: { id: args.id } });
      if (!order || order.userId !== currentUser.id) throw notFoundError('Order not found');
      if (order.orderStatus !== 'PENDING') {
        throw userInputError('Only pending orders can be cancelled');
      }
      const updated = await prisma.order.update({
        where: { id: args.id },
        data: { orderStatus: 'CANCELLED', status: 'CANCELLED', cancelledAt: new Date() },
      });
      await publishOrderUpdate(updated);
      return updated;
    },

    updateOrderStatus: (_parent, args: { id: string; status: string }, context) =>
      applyOrderStatusUpdate(context, args.id, args.status),

    updateStatus: (_parent, args: { id: string; orderStatus: string }, context) =>
      applyOrderStatusUpdate(context, args.id, args.orderStatus),

    assignRider: async (_parent, args: { id: string; riderId: string }, context) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      const rider = await prisma.user.findUnique({ where: { id: args.riderId } });
      if (!rider || rider.userType !== 'RIDER') throw userInputError('Rider not found');

      const updated = await prisma.order.update({
        where: { id: args.id },
        data: { riderId: args.riderId, orderStatus: 'ASSIGNED' },
      });
      await publishOrderUpdate(updated);
      return updated;
    },
  },

  Order: {
    _id: (parent: Order) => parent.id,
    restaurant: (parent: Order) => prisma.restaurant.findUnique({ where: { id: parent.restaurantId } }),
    deliveryAddress: (parent: Order) =>
      parent.addressId ? prisma.address.findUnique({ where: { id: parent.addressId } }) : null,
    user: (parent: Order) => prisma.user.findUnique({ where: { id: parent.userId } }),
    rider: (parent: Order) => (parent.riderId ? prisma.user.findUnique({ where: { id: parent.riderId } }) : null),
    items: (parent: Order) => prisma.orderItem.findMany({ where: { orderId: parent.id } }),
    orderDate: (parent: Order) => parent.orderDate?.toISOString(),
    createdAt: (parent: Order) => parent.createdAt?.toISOString(),
    updatedAt: (parent: Order) => parent.updatedAt?.toISOString(),
  },
  OrderItem: {
    _id: (parent: OrderItem) => parent.id,
    food: (parent: OrderItem) => parent.foodId,
    variation: (parent: OrderItem) =>
      parent.variationId ? prisma.variation.findUnique({ where: { id: parent.variationId } }) : null,
    addons: (parent: OrderItem) => prisma.orderItemAddon.findMany({ where: { orderItemId: parent.id } }),
  },
  OrderItemAddon: {
    _id: (parent: OrderItemAddon) => parent.id,
    options: (parent: OrderItemAddon) =>
      prisma.orderItemAddonOption.findMany({ where: { orderItemAddonId: parent.id } }),
  },
  OrderItemAddonOption: {
    _id: (parent: OrderItemAddonOption) => parent.id,
  },
};
