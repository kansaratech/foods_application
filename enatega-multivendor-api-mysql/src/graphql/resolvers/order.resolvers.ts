import { IResolvers } from '@graphql-tools/utils';
import { Order, OrderItem, OrderItemAddon, OrderItemAddonOption, OrderStatus } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireAuth, requireRole } from '../../middleware/auth';
import { buildOrderItems, generateDisplayOrderId, OrderItemInput } from '../../services/order.service';
import { notFoundError, userInputError } from '../../utils/errors';
import { distanceKm, pointInPolygon } from '../../utils/geo';
import { pubsub, TOPICS } from '../../utils/pubsub';
import { recordOrderCommission, recordRiderCash } from '../../utils/commission';

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
  await pubsub.publish(TOPICS.SUBSCRIPTION_DISPATCHER, { subscriptionDispatcher: order });
  await publishZoneOrder(order);
}

async function publishRiderAssigned(order: Order) {
  if (!order.riderId) return;
  await pubsub.publish(TOPICS.SUBSCRIPTION_ASSIGN_RIDER(order.riderId), {
    subscriptionAssignRider: { origin: 'order_service', order },
  });
}

// Pushes the order to riders subscribed to whichever zone(s) the restaurant's
// location falls inside, so "New Orders" updates live instead of waiting on
// the RIDER_ORDERS poll. 'new' when it first becomes claimable (ACCEPTED with
// no rider yet); 'update' for any later change riders already see should stay
// in sync with (claimed, picked, delivered, etc).
async function publishZoneOrder(order: Order) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: order.restaurantId } });
  if (restaurant?.latitude == null || restaurant?.longitude == null) return;

  const zones = await prisma.zone.findMany({ where: { isActive: true } });
  const point: [number, number] = [restaurant.longitude, restaurant.latitude];
  const origin = order.orderStatus === 'ACCEPTED' && !order.riderId ? 'new' : 'update';

  for (const zone of zones) {
    const ring = (zone.boundary as unknown as [number, number][][] | null)?.[0];
    if (ring && pointInPolygon(point, ring)) {
      await pubsub.publish(TOPICS.SUBSCRIPTION_ZONE_ORDERS(zone.id), {
        subscriptionZoneOrders: { zoneId: zone.id, origin, order },
      });
    }
  }
}

async function applyOrderStatusUpdate(
  context: GraphQLContext,
  id: string,
  statusInput: string,
  allowedRoles: Array<'ADMIN' | 'VENDOR' | 'RIDER'> = ['ADMIN', 'VENDOR'],
): Promise<Order> {
  const currentUser = requireRole(context, allowedRoles);
  const status = statusInput.toUpperCase() as OrderStatus;
  if (!ORDER_STATUS_VALUES.includes(status)) throw userInputError(`Invalid order status: ${statusInput}`);

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw notFoundError('Order not found');
  const restaurant = await prisma.restaurant.findUnique({ where: { id: order.restaurantId } });
  if (!restaurant) throw notFoundError('Order not found');
  if (currentUser.userType === 'VENDOR' && restaurant.ownerId !== currentUser.id) {
    throw notFoundError('Order not found');
  }
  if (currentUser.userType === 'RIDER' && order.riderId !== currentUser.id) {
    throw notFoundError('Order not found');
  }

  const timestampField: Partial<Record<OrderStatus, string>> = {
    ACCEPTED: 'acceptedAt',
    PICKED: 'pickedAt',
    DELIVERED: 'deliveredAt',
    CANCELLED: 'cancelledAt',
  };
  const field = timestampField[status];
  // Cash-on-delivery orders are settled the moment the rider hands them over -
  // there's no separate "collect payment" step in this app.
  const isCodSettledOnDelivery = status === 'DELIVERED' && order.paymentMethod === 'COD';

  const updated = await prisma.order.update({
    where: { id },
    data: {
      orderStatus: status,
      status: status === 'CANCELLED' ? 'CANCELLED' : status === 'DELIVERED' || status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
      ...(field ? { [field]: new Date() } : {}),
      ...(isCodSettledOnDelivery ? { paymentStatus: 'PAID', paidAmount: order.orderAmount } : {}),
    },
  });

  // Credit store and rider wallets once, the moment the order lands as
  // DELIVERED. Split matches the `earnings` report: commission (on the food
  // subtotal, at the restaurant's own commissionRate) stays with the
  // platform; the rest of the food subtotal goes to the store; the full
  // delivery fee + tip goes to the rider.
  if (status === 'DELIVERED' && order.orderStatus !== 'DELIVERED') {
    const foodAmount = order.orderAmount - order.deliveryCharges - order.tipping - order.taxationAmount;
    const storeEarning = foodAmount - foodAmount * (restaurant.commissionRate / 100);
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        currentWalletAmount: { increment: storeEarning },
        totalWalletAmount: { increment: storeEarning },
      },
    });
    if (order.riderId) {
      const riderEarning = order.deliveryCharges + order.tipping;
      await prisma.riderProfile.update({
        where: { userId: order.riderId },
        data: {
          currentWalletAmount: { increment: riderEarning },
          totalWalletAmount: { increment: riderEarning },
        },
      });
    }

    // Accrue the platform's commission for this order into the billing ledger.
    // The platform invoices the vendor per period; it does not touch order cash
    // (COD). Idempotent on the order id.
    await recordOrderCommission({ ...order, deliveredAt: updated.deliveredAt });
    // Track the COD cash the rider is now holding on the platform's behalf.
    await recordRiderCash({ ...order, deliveredAt: updated.deliveredAt });
  }

  await publishOrderUpdate(updated);
  return updated;
}

function computeDateRange(
  dateKeyword?: string,
  starting_date?: string,
  ending_date?: string,
): { gte: Date; lte: Date } | undefined {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (dateKeyword) {
    case 'Today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { gte: start, lte: endOfToday };
    }
    case 'Week': {
      const dayOfWeek = now.getDay();
      const daysSinceMonday = (dayOfWeek + 6) % 7;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
      return { gte: start, lte: endOfToday };
    }
    case 'Month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { gte: start, lte: endOfToday };
    }
    case 'Year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { gte: start, lte: endOfToday };
    }
    case 'Custom': {
      if (!starting_date || !ending_date) return undefined;
      const start = new Date(starting_date);
      const end = new Date(ending_date);
      end.setHours(23, 59, 59, 999);
      return { gte: start, lte: end };
    }
    default:
      return undefined;
  }
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
    // Same lookup as `order` - the customer web app's order-tracking screen
    // calls this name specifically.
    orderDetails: async (_parent, args: { id: string }, context) => {
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
    // "My deliveries" plus unclaimed orders the rider could pick up - the app's
    // New/Processing/Delivered tabs all filter this single list client-side.
    riderOrders: (_parent, _args, context) => {
      const currentUser = requireRole(context, ['RIDER']);
      return prisma.order.findMany({
        where: {
          OR: [{ riderId: currentUser.id }, { riderId: null, orderStatus: 'ACCEPTED' }],
        },
        orderBy: { createdAt: 'desc' },
      });
    },
    getActiveOrders: async (
      _parent,
      args: { restaurantId?: string; page?: number; rowsPerPage?: number; actions?: string[]; search?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const limit = args.rowsPerPage ?? 20;
      const page = args.page ?? 1;
      const requestedStatuses = args.actions
        ?.map((a) => a.toUpperCase() as OrderStatus)
        .filter((a) => ACTIVE_STATUSES.includes(a));
      const where = {
        orderStatus: { in: requestedStatuses?.length ? requestedStatuses : ACTIVE_STATUSES },
        ...(args.restaurantId ? { restaurantId: args.restaurantId } : {}),
        ...(currentUser.userType === 'VENDOR' ? { restaurant: { ownerId: currentUser.id } } : {}),
      };
      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        prisma.order.count({ where }),
      ]);
      const totalPages = Math.max(1, Math.ceil(totalCount / limit));
      return {
        orders,
        totalCount,
        currentPage: page,
        totalPages,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPages ? page + 1 : null,
      };
    },
    ordersByRestId: async (
      _parent,
      args: { restaurant: string; page?: number; rows?: number; search?: string; orderStatus?: string[] },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      if (currentUser.userType === 'VENDOR') {
        const restaurant = await prisma.restaurant.findUnique({ where: { id: args.restaurant } });
        if (!restaurant || restaurant.ownerId !== currentUser.id) throw notFoundError('Restaurant not found');
      }
      const limit = args.rows ?? 20;
      const page = args.page ?? 1;
      const requestedStatuses = args.orderStatus
        ?.map((s) => s.toUpperCase() as OrderStatus)
        .filter((s) => ORDER_STATUS_VALUES.includes(s));
      const where = {
        restaurantId: args.restaurant,
        ...(requestedStatuses?.length ? { orderStatus: { in: requestedStatuses } } : {}),
      };
      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        prisma.order.count({ where }),
      ]);
      const totalPages = Math.max(1, Math.ceil(totalCount / limit));
      return {
        orders,
        totalCount,
        currentPage: page,
        totalPages,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPages ? page + 1 : null,
      };
    },

    allOrdersPaginated: async (
      _parent,
      args: {
        page?: number;
        rows?: number;
        dateKeyword?: string;
        starting_date?: string;
        ending_date?: string;
        orderStatus?: string[];
        search?: string;
        restaurantId?: string;
        riderId?: string;
      },
      context,
    ) => {
      requireRole(context, ['ADMIN']);
      const limit = args.rows ?? 20;
      const page = args.page ?? 1;
      const requestedStatuses = args.orderStatus
        ?.map((s) => s.toUpperCase() as OrderStatus)
        .filter((s) => ORDER_STATUS_VALUES.includes(s));
      const dateRange = computeDateRange(args.dateKeyword, args.starting_date, args.ending_date);

      const where = {
        ...(requestedStatuses?.length ? { orderStatus: { in: requestedStatuses } } : {}),
        ...(args.restaurantId ? { restaurantId: args.restaurantId } : {}),
        ...(args.riderId ? { riderId: args.riderId } : {}),
        ...(dateRange ? { createdAt: dateRange } : {}),
        ...(args.search ? { orderId: { contains: args.search } } : {}),
      };

      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        prisma.order.count({ where }),
      ]);
      const totalPages = Math.max(1, Math.ceil(totalCount / limit));
      return {
        orders,
        totalCount,
        currentPage: page,
        totalPages,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPages ? page + 1 : null,
      };
    },

    // Store-app dashboard: the store owns exactly one restaurant per login, so
    // this resolves to their single restaurant's currently-active orders.
    restaurantOrders: async (_parent, _args, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const restaurants = await prisma.restaurant.findMany({ where: { ownerId: currentUser.id } });
      if (restaurants.length === 0) return [];
      if (restaurants.length > 1) {
        throw userInputError('You own multiple stores - this view only supports a single store per login');
      }
      return prisma.order.findMany({
        where: { restaurantId: restaurants[0].id, orderStatus: { in: ACTIVE_STATUSES } },
        orderBy: { createdAt: 'desc' },
      });
    },

    orderFilterOptions: async (_parent, _args, context) => {
      requireRole(context, ['ADMIN']);
      const [restaurants, riders] = await Promise.all([
        prisma.restaurant.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        prisma.user.findMany({
          where: { userType: 'RIDER' },
          select: { id: true, name: true, username: true, phone: true },
          orderBy: { name: 'asc' },
        }),
      ]);
      return {
        restaurants: restaurants.map((r) => ({ _id: r.id, name: r.name })),
        riders: riders.map((r) => ({ _id: r.id, name: r.name, username: r.username, phone: r.phone })),
      };
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

      // Delivery-area enforcement: a delivery order must land within the store's
      // delivery radius (its own `deliveryDistance`, else a 60 km fallback).
      // Pickup orders skip this. Only enforced when both ends have coordinates.
      if (!args.isPickedUp && restaurant.latitude != null && restaurant.longitude != null) {
        const deliveryAddress = await prisma.address.findUnique({ where: { id: addressId } });
        if (deliveryAddress?.latitude != null && deliveryAddress?.longitude != null) {
          const reachKm =
            restaurant.deliveryDistance && restaurant.deliveryDistance > 0 ? restaurant.deliveryDistance : 60;
          const dist = distanceKm(
            deliveryAddress.latitude,
            deliveryAddress.longitude,
            restaurant.latitude,
            restaurant.longitude,
          );
          if (dist > reachKm) {
            throw userInputError(
              `This address is outside ${restaurant.name}'s delivery area (${dist.toFixed(1)} km away, limit ${reachKm} km).`,
            );
          }
        }
      }

      let discountAmount = 0;
      if (args.couponCode) {
        const now = new Date();
        const coupon = await prisma.coupon.findFirst({
          where: {
            title: args.couponCode,
            enabled: true,
            OR: [{ restaurantId: null }, { restaurantId: args.restaurant }],
          },
        });
        const isWithinWindow =
          coupon && (coupon.lifeTimeActive || ((!coupon.startDate || now >= coupon.startDate) && (!coupon.endDate || now <= coupon.endDate)));
        if (coupon && isWithinWindow) {
          discountAmount = Math.min(itemsTotal, itemsTotal * (coupon.discount / 100));
        }
      }

      const orderAmount = itemsTotal - discountAmount + args.deliveryCharges + args.tipping + args.taxationAmount;

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
          discountAmount,
          orderAmount,
          instructions: args.instructions,
          isPickedUp: args.isPickedUp,
          orderDate: new Date(args.orderDate),
          items: { create: itemsData },
        },
      });

      await publishOrderUpdate(order);
      await pubsub.publish(TOPICS.SUBSCRIBE_PLACE_ORDER(order.restaurantId), {
        subscribePlaceOrder: { userId: order.userId, origin: 'order_service', order },
      });
      await prisma.webNotification.create({
        data: { userId: restaurant.ownerId, body: `New order #${order.orderId} received`, navigateTo: '/orders' },
      });
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
        data: { riderId: args.riderId, orderStatus: 'ASSIGNED', assignedAt: new Date() },
      });
      await publishOrderUpdate(updated);
      await publishRiderAssigned(updated);
      return updated;
    },

    // Rider claims an unassigned order for themselves (as opposed to
    // `assignRider`, where ADMIN/VENDOR assigns a specific rider).
    assignOrder: async (_parent, args: { id: string }, context) => {
      const currentUser = requireRole(context, ['RIDER']);
      const order = await prisma.order.findUnique({ where: { id: args.id } });
      if (!order) throw notFoundError('Order not found');
      if (order.riderId && order.riderId !== currentUser.id) {
        throw userInputError('Order already assigned to another rider');
      }

      const updated = await prisma.order.update({
        where: { id: args.id },
        data: { riderId: currentUser.id, orderStatus: 'ASSIGNED', assignedAt: new Date() },
      });
      await publishOrderUpdate(updated);
      await publishRiderAssigned(updated);
      return updated;
    },

    updateOrderStatusRider: (_parent, args: { id: string; status: string }, context) =>
      applyOrderStatusUpdate(context, args.id, args.status, ['RIDER']),

    // Store-app order actions: the store owns exactly one restaurant per login,
    // so these resolve the caller's restaurant the same way resolveVendorRestaurant does.
    acceptOrder: async (_parent, args: { _id: string; time?: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const order = await prisma.order.findUnique({ where: { id: args._id } });
      if (!order) throw notFoundError('Order not found');
      const restaurant = await prisma.restaurant.findUnique({ where: { id: order.restaurantId } });
      if (!restaurant || (currentUser.userType === 'VENDOR' && restaurant.ownerId !== currentUser.id)) {
        throw notFoundError('Order not found');
      }
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { orderStatus: 'ACCEPTED', status: 'ACTIVE', acceptedAt: new Date(), preparationTime: args.time },
      });
      await publishOrderUpdate(updated);
      return updated;
    },

    cancelOrder: async (_parent, args: { _id: string; reason: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const order = await prisma.order.findUnique({ where: { id: args._id } });
      if (!order) throw notFoundError('Order not found');
      const restaurant = await prisma.restaurant.findUnique({ where: { id: order.restaurantId } });
      if (!restaurant || (currentUser.userType === 'VENDOR' && restaurant.ownerId !== currentUser.id)) {
        throw notFoundError('Order not found');
      }
      if (PAST_STATUSES.includes(order.orderStatus)) {
        throw userInputError('This order can no longer be cancelled');
      }
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { orderStatus: 'CANCELLED', status: 'CANCELLED', cancelledAt: new Date(), reason: args.reason },
      });
      await publishOrderUpdate(updated);
      return updated;
    },

    muteRing: async (_parent, args: { orderId?: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      if (!args.orderId) return true;
      const order = await prisma.order.findUnique({ where: { id: args.orderId } });
      if (!order) throw notFoundError('Order not found');
      const restaurant = await prisma.restaurant.findUnique({ where: { id: order.restaurantId } });
      if (!restaurant || (currentUser.userType === 'VENDOR' && restaurant.ownerId !== currentUser.id)) {
        throw notFoundError('Order not found');
      }
      await prisma.order.update({ where: { id: order.id }, data: { isRinged: true } });
      return true;
    },

    orderPickedUp: (_parent, args: { _id: string }, context) =>
      applyOrderStatusUpdate(context, args._id, 'PICKED', ['ADMIN', 'VENDOR', 'RIDER']),
  },

  Order: {
    _id: (parent: Order) => parent.id,
    id: (parent: Order) => parent.id,
    restaurant: (parent: Order) => prisma.restaurant.findUnique({ where: { id: parent.restaurantId } }),
    deliveryAddress: (parent: Order) =>
      parent.addressId ? prisma.address.findUnique({ where: { id: parent.addressId } }) : null,
    user: (parent: Order) => prisma.user.findUnique({ where: { id: parent.userId } }),
    rider: (parent: Order) => (parent.riderId ? prisma.user.findUnique({ where: { id: parent.riderId } }) : null),
    items: (parent: Order) => prisma.orderItem.findMany({ where: { orderId: parent.id } }),
    orderDate: (parent: Order) => parent.orderDate?.toISOString(),
    createdAt: (parent: Order) => parent.createdAt?.toISOString(),
    updatedAt: (parent: Order) => parent.updatedAt?.toISOString(),
    expectedTime: (parent: Order) => parent.expectedTime?.toISOString() ?? null,
    acceptedAt: (parent: Order) => parent.acceptedAt?.toISOString() ?? null,
    pickedAt: (parent: Order) => parent.pickedAt?.toISOString() ?? null,
    deliveredAt: (parent: Order) => parent.deliveredAt?.toISOString() ?? null,
    cancelledAt: (parent: Order) => parent.cancelledAt?.toISOString() ?? null,
    assignedAt: (parent: Order) => parent.assignedAt?.toISOString() ?? null,
    // "Completion" has no separate milestone from delivery in this schema - it's the same moment.
    completionTime: (parent: Order) => parent.deliveredAt?.toISOString() ?? null,
    // There is no soft-delete concept for orders in this schema (no `isActive` column on Order) -
    // every persisted order returned from a query is, by definition, an active/live order record.
    isActive: () => true,
  },
  OrderRestaurantLite: {
    _id: (parent: { id: string }) => parent.id,
    location: (parent: { latitude?: number | null; longitude?: number | null }) =>
      parent.latitude != null && parent.longitude != null
        ? { coordinates: [parent.longitude, parent.latitude] }
        : null,
    shopType: async (parent: { shopTypeId?: string | null }) => {
      if (!parent.shopTypeId) return null;
      const shopType = await prisma.shopType.findUnique({ where: { id: parent.shopTypeId } });
      return shopType?.slug ?? null;
    },
  },
  OrderUserLite: {
    available: async (parent: { id?: string }) => {
      if (!parent?.id) return null;
      const profile = await prisma.riderProfile.findUnique({ where: { userId: parent.id } });
      return profile?.available ?? null;
    },
  },
  OrderItem: {
    _id: (parent: OrderItem) => parent.id,
    id: (parent: OrderItem) => parent.id,
    isActive: () => true,
    food: (parent: OrderItem) => parent.foodId,
    variation: (parent: OrderItem) =>
      parent.variationId ? prisma.variation.findUnique({ where: { id: parent.variationId } }) : null,
    addons: (parent: OrderItem) => prisma.orderItemAddon.findMany({ where: { orderItemId: parent.id } }),
    // OrderItem doesn't store a menu snapshot; fall back to the live Food record for display metadata.
    description: async (parent: OrderItem) => (await prisma.food.findUnique({ where: { id: parent.foodId } }))?.description ?? null,
    image: async (parent: OrderItem) => (await prisma.food.findUnique({ where: { id: parent.foodId } }))?.image ?? null,
    // Order items are created atomically with their order and never updated afterwards, so the
    // parent order's timestamps are an accurate stand-in (there's no dedicated column on OrderItem).
    createdAt: async (parent: OrderItem) =>
      (await prisma.order.findUnique({ where: { id: parent.orderId } }))?.createdAt?.toISOString() ?? null,
    updatedAt: async (parent: OrderItem) =>
      (await prisma.order.findUnique({ where: { id: parent.orderId } }))?.updatedAt?.toISOString() ?? null,
  },
  OrderItemAddon: {
    _id: (parent: OrderItemAddon) => parent.id,
    id: (parent: OrderItemAddon) => parent.id,
    options: (parent: OrderItemAddon) =>
      prisma.orderItemAddonOption.findMany({ where: { orderItemAddonId: parent.id } }),
    description: async (parent: OrderItemAddon) => (await prisma.addon.findUnique({ where: { id: parent.addonId } }))?.description ?? null,
    quantityMinimum: async (parent: OrderItemAddon) =>
      (await prisma.addon.findUnique({ where: { id: parent.addonId } }))?.quantityMinimum ?? null,
    quantityMaximum: async (parent: OrderItemAddon) =>
      (await prisma.addon.findUnique({ where: { id: parent.addonId } }))?.quantityMaximum ?? null,
  },
  OrderItemAddonOption: {
    _id: (parent: OrderItemAddonOption) => parent.id,
    id: (parent: OrderItemAddonOption) => parent.id,
    description: async (parent: OrderItemAddonOption) =>
      (await prisma.option.findUnique({ where: { id: parent.optionId } }))?.description ?? null,
  },
};
