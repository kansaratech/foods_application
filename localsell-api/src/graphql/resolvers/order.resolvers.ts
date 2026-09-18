import { IResolvers } from '@graphql-tools/utils';
import { Order, OrderItem, OrderItemAddon, OrderItemAddonOption, OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireAuth, requireRole } from '../../middleware/auth';
import { buildOrderItems, generateDisplayOrderId, OrderItemInput } from '../../services/order.service';
import { computeDeliveryFee, computeGst } from '../../services/pricing.service';
import { notifyOrderEvent } from '../../services/order-notify';
import { attemptCashfreeRefund, refundOrderIfEligible } from '../../services/refund.service';
import { notFoundError, userInputError } from '../../utils/errors';
import { distanceKm, pointInPolygon } from '../../utils/geo';
import { pubsub, TOPICS } from '../../utils/pubsub';
import { recordOrderCommission, recordRiderCash, recordVendorPayable, resolveCommissionRate, riderOutstandingCash } from '../../utils/commission';
import { assertRiderNotRejected } from './rider-docs.resolvers';
import { assertRiderApproved } from './rider.resolvers';
import { hasPriorOrder } from './coupon.resolvers';
import { isValidIndianMobile, normalizeIndianPhone } from '../../utils/phone';
import { recordAudit } from '../../utils/audit';

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
  recipientPhone?: string;
}

export async function publishOrderUpdate(order: Order) {
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

/**
 * Blocks a rider from picking up another COD order once the cash they are
 * carrying (undeposited) plus this order would exceed `Configuration.riderCashLimit`.
 * No-op for non-COD orders. (Swiggy/Zomato-style cash limit.)
 */
/**
 * Every order's address must sit inside the store's delivery radius.
 * Returns the computed distance (km) so the caller can reuse it for a
 * distance-based delivery fee. Missing or invalid coordinates are rejected.
 */
async function assertAddressInDeliveryArea(restaurantId: string, addressId: string | null, pickup = false): Promise<number> {
  if (!addressId) throw userInputError('Please select an address to check service availability.');
  const [restaurant, addr] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId } }),
    prisma.address.findUnique({ where: { id: addressId } }),
  ]);
  return assertCoordinatesInServiceArea(restaurant, addr?.latitude, addr?.longitude, pickup);
}

function assertCoordinatesInServiceArea(
  restaurant: { name: string; latitude: number | null; longitude: number | null; deliveryDistance: number | null } | null,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  pickup: boolean,
): number {
  if (!restaurant || restaurant.latitude == null || restaurant.longitude == null ||
      latitude == null || longitude == null ||
      ![latitude, longitude, restaurant.latitude, restaurant.longitude].every(Number.isFinite) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180 ||
      Math.abs(restaurant.latitude) > 90 || Math.abs(restaurant.longitude) > 180) {
    throw userInputError('Unable to verify the selected address. Please select a valid nearby address to continue.');
  }
  const reachKm = restaurant.deliveryDistance && restaurant.deliveryDistance > 0 ? restaurant.deliveryDistance : 60;
  const dist = distanceKm(latitude, longitude, restaurant.latitude, restaurant.longitude);
  if (dist > reachKm) {
    throw userInputError(pickup
      ? "Your selected address is outside this store's pickup service area. Please select a nearby address to continue."
      : `This address is outside ${restaurant.name}'s delivery area (${dist.toFixed(1)} km away, limit ${reachKm} km).`);
  }
  return dist;
}

async function assertRiderUnderCashLimit(riderId: string, orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentMethod !== 'COD') return;
  const config = await prisma.configuration.findFirst();
  const limit = config?.riderCashLimit ?? 3000;
  if (limit <= 0) return;
  const held = await riderOutstandingCash(riderId);
  if (held + order.orderAmount > limit) {
    throw userInputError(
      `You're carrying ₹${held.toFixed(0)} in undeposited COD cash. Deposit some before taking more cash orders (limit ₹${limit.toFixed(0)}).`,
    );
  }
}

// Pushes the order to riders subscribed to whichever zone(s) the restaurant's
// location falls inside, so "New Orders" updates live instead of waiting on
// the RIDER_ORDERS poll. 'new' when it first becomes claimable (ACCEPTED with
// no rider yet); 'update' for any later change riders already see should stay
// in sync with (claimed, picked, delivered, etc).
async function publishZoneOrder(order: Order) {
  // Pickup and store-self-delivery orders never go to the rider fleet.
  if (order.deliveryMode && order.deliveryMode !== 'PLATFORM') return;
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

/** A fresh 4-digit proof-of-delivery code. */
function makeDeliveryOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * The one place the DELIVERED transition happens: flips status + timestamps,
 * settles COD, credits the store + rider wallets once, records the commission
 * ledger and the rider's COD cash. Idempotent on an already-DELIVERED order.
 * `confirmedBy` records how the hand-over was proven (OTP | MANUAL).
 */
async function finalizeDelivery(
  order: Order,
  restaurant: { id: string; commissionRate: number },
  confirmedBy: 'OTP' | 'MANUAL',
): Promise<Order> {
  const {updated,changed} = await prisma.$transaction(async(tx)=>{
  const claimed = await tx.order.updateMany({
    where: { id: order.id, orderStatus: { not: 'DELIVERED' } },
    data: {
      orderStatus: 'DELIVERED',
      status: 'COMPLETED',
      deliveredAt: order.deliveredAt ?? new Date(),
      deliveryConfirmedBy: order.deliveryConfirmedBy ?? confirmedBy,
      deliveryOtp: null,
      ...(order.paymentMethod === 'COD' ? { paymentStatus: 'PAID', paidAmount: order.orderAmount } : {}),
    },
  });

  const updated = await tx.order.findUniqueOrThrow({where:{id:order.id}});
  if (claimed.count) {
    const config = await tx.configuration.findFirst();
    const rate = resolveCommissionRate(restaurant.commissionRate, config?.defaultCommissionRate);
    const foodAmount = order.orderAmount - order.deliveryCharges - order.tipping - order.taxationAmount;
    const commission = Math.round(foodAmount * (rate / 100) * 100) / 100;
    const selfDelivered = order.deliveryMode === 'SELF';
    const storeEarning =
      foodAmount - commission + order.taxationAmount +
      (selfDelivered ? order.deliveryCharges + order.tipping : 0);
    await tx.restaurant.update({
      where: { id: restaurant.id },
      data: {
        // Store-managed orders are already paid directly to the store: no platform payable.
        ...(order.deliveryMode === 'PLATFORM' ? { currentWalletAmount: { increment: storeEarning } } : {}),
        totalWalletAmount: { increment: storeEarning },
      },
    });
    if (order.riderId && order.deliveryMode === 'PLATFORM') {
      const riderEarning = order.deliveryCharges + order.tipping;
      await tx.riderProfile.update({
        where: { userId: order.riderId },
        data: {
          currentWalletAmount: { increment: riderEarning },
          totalWalletAmount: { increment: riderEarning },
        },
      });
    }
    await recordOrderCommission({ ...order, deliveredAt: updated.deliveredAt }, tx);
    if (order.paymentMethod === 'CASHFREE') {
      await recordVendorPayable({ ...order, deliveredAt: updated.deliveredAt }, commission, tx);
    }
    if (order.deliveryMode === 'PLATFORM') await recordRiderCash({ ...order, deliveredAt: updated.deliveredAt }, tx);
  }

    return {updated,changed:claimed.count>0};
  });

  await publishOrderUpdate(updated);
  if (changed) notifyOrderEvent(updated.id, 'DELIVERED');
  return updated;
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
  // Cancelling always needs a reason and an attributed actor — force every
  // caller through cancelOrder, which captures both, instead of letting this
  // generic status setter silently cancel an order with neither.
  if (status === 'CANCELLED') {
    throw userInputError('Use cancelOrder to cancel an order — a reason is required.');
  }

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

  // Proof of delivery: a delivery order (not pickup) can only be closed by
  // whoever delivered it via `confirmDelivery` with the customer's code.
  // An admin may still force it through — logged as a MANUAL confirmation.
  if (status === 'DELIVERED' && order.orderStatus !== 'DELIVERED') {
    if (!order.isPickedUp && currentUser.userType !== 'ADMIN') {
      throw userInputError("Enter the customer's delivery code to complete this order.");
    }
    return finalizeDelivery(order, restaurant, currentUser.userType === 'ADMIN' ? 'MANUAL' : 'OTP');
  }

  const timestampField: Partial<Record<OrderStatus, string>> = {
    ACCEPTED: 'acceptedAt',
    PICKED: 'pickedAt',
    DELIVERED: 'deliveredAt',
  };
  const field = timestampField[status];

  const updated = await prisma.order.update({
    where: { id },
    data: {
      orderStatus: status,
      status: status === 'DELIVERED' || status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
      ...(field ? { [field]: new Date() } : {}),
    },
  });

  await publishOrderUpdate(updated);
  if (status === 'PICKED' && order.orderStatus !== 'PICKED') notifyOrderEvent(updated.id, 'OUT_FOR_DELIVERY');
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

/**
 * A createdAt range from either an explicit start/end pair (no keyword needed —
 * an open-ended start is fine) or, failing that, a dateKeyword bucket.
 */
function resolveCreatedAtRange(
  dateKeyword?: string,
  starting_date?: string,
  ending_date?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (starting_date || ending_date) {
    const range: { gte?: Date; lte?: Date } = {};
    if (starting_date) range.gte = new Date(starting_date);
    if (ending_date) {
      const end = new Date(ending_date);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    return range;
  }
  return computeDateRange(dateKeyword, starting_date, ending_date);
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
          OR: [
            { riderId: currentUser.id },
            { riderId: null, orderStatus: 'ACCEPTED', deliveryMode: 'PLATFORM' },
          ],
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
      args: {
        restaurant: string;
        page?: number;
        rows?: number;
        search?: string;
        orderStatus?: string[];
        deliveryMode?: string[];
        starting_date?: string;
        ending_date?: string;
        dateKeyword?: string;
      },
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
      const requestedModes = args.deliveryMode
        ?.map((m) => m.toUpperCase())
        .filter((m) => ['PICKUP', 'SELF', 'PLATFORM'].includes(m));
      const dateRange = resolveCreatedAtRange(args.dateKeyword, args.starting_date, args.ending_date);
      const where = {
        restaurantId: args.restaurant,
        ...(requestedStatuses?.length ? { orderStatus: { in: requestedStatuses } } : {}),
        ...(requestedModes?.length ? { deliveryMode: { in: requestedModes } } : {}),
        ...(dateRange ? { createdAt: dateRange } : {}),
        ...(args.search
          ? { OR: [{ orderId: { contains: args.search } }, { user: { name: { contains: args.search } } }] }
          : {}),
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

    orderManagementSummary: async (_parent, _args, context) => {
      requireRole(context, ['ADMIN']);
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const [total, pending, inProgress, deliveredToday] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { orderStatus: 'PENDING' } }),
        prisma.order.count({ where: { orderStatus: { in: ['ACCEPTED', 'ASSIGNED', 'PICKED'] } } }),
        prisma.order.count({ where: { orderStatus: { in: ['DELIVERED', 'COMPLETED'] }, deliveredAt: { gte: start, lt: end } } }),
      ]);
      return { total, pending, inProgress, deliveredToday };
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
        deliveryMode?: string[];
        paymentMethod?: string[];
        paymentStatus?: string[];
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
      const requestedModes = args.deliveryMode
        ?.map((m) => m.toUpperCase())
        .filter((m) => ['PICKUP', 'SELF', 'PLATFORM'].includes(m));
      const requestedPaymentMethods = args.paymentMethod
        ?.map((m) => m.toUpperCase())
        .filter((m) => ['COD', 'CASHFREE'].includes(m));
      const requestedPaymentStatuses = args.paymentStatus
        ?.map((s) => s.toUpperCase())
        .filter((s) => ['PENDING', 'PAID', 'FAILED'].includes(s));
      const dateRange = computeDateRange(args.dateKeyword, args.starting_date, args.ending_date);

      const where = {
        ...(requestedStatuses?.length ? { orderStatus: { in: requestedStatuses } } : {}),
        ...(requestedModes?.length ? { deliveryMode: { in: requestedModes } } : {}),
        ...(requestedPaymentMethods?.length ? { paymentMethod: { in: requestedPaymentMethods } } : {}),
        ...(requestedPaymentStatuses?.length ? { paymentStatus: { in: requestedPaymentStatuses as PaymentStatus[] } } : {}),
        ...(args.restaurantId ? { restaurantId: args.restaurantId } : {}),
        ...(args.riderId ? { riderId: args.riderId } : {}),
        ...(dateRange ? { createdAt: dateRange } : {}),
        ...(args.search ? { OR: [{ orderId: { contains: args.search } }, { user: { name: { contains: args.search } } }, { user: { phone: { contains: args.search } } }] } : {}),
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

    ordersByUser: async (_parent, args: { userId: string; page?: number; limit?: number }, context) => {
      requireRole(context, ['ADMIN']);
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where = { userId: args.userId };

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

    // Store-app dashboard: the currently-active orders for one outlet. The store
    // app passes the restaurantId it logged into (#59 lets one vendor run several
    // outlets on one login); if it's omitted we fall back to the owner's single
    // store so older app builds keep working.
    restaurantOrders: async (_parent, args: { restaurantId?: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);

      let restaurantId = args.restaurantId;
      if (restaurantId) {
        const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
        if (!restaurant || (currentUser.userType === 'VENDOR' && restaurant.ownerId !== currentUser.id)) {
          throw notFoundError('Restaurant not found');
        }
      } else {
        const restaurants = await prisma.restaurant.findMany({ where: { ownerId: currentUser.id } });
        if (restaurants.length === 0) return [];
        if (restaurants.length > 1) {
          throw userInputError('You own multiple stores - update the app so it sends the store you signed into');
        }
        restaurantId = restaurants[0].id;
      }

      return prisma.order.findMany({
        where: {
          restaurantId,
          orderStatus: { in: ACTIVE_STATUSES },
          // A CASHFREE order the customer hasn't actually paid for yet (still
          // checking out, abandoned, or failed) must stay invisible to the
          // store — see the matching gate in placeOrder.
          NOT: { paymentMethod: 'CASHFREE', paymentStatus: { in: ['PENDING', 'FAILED'] } },
        },
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

    // Runs the exact same buildOrderItems → computeGst/computeDeliveryFee
    // pipeline placeOrder uses, without writing anything — so the bill
    // breakdown a customer sees before paying always matches what placeOrder
    // will actually charge. Doesn't create an Address row for a not-yet-saved
    // address (unlike resolveOrderAddress) since this may be called on every
    // cart/address edit.
    orderPricePreview: async (
      _parent,
      args: {
        restaurant: string;
        orderInput: OrderItemInput[];
        couponCode?: string;
        isPickedUp: boolean;
        address?: PlaceOrderArgs['address'];
      },
      context,
    ) => {
      const currentUser = requireAuth(context);
      const restaurant = await prisma.restaurant.findUnique({ where: { id: args.restaurant } });
      if (!restaurant) throw userInputError('Restaurant not found or unavailable');

      const { itemsTotal, lines } = await buildOrderItems(args.restaurant, args.orderInput, restaurant.tax);

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
        if (coupon && isWithinWindow && !(coupon.firstOrderOnly && (await hasPriorOrder(currentUser.id)))) {
          discountAmount = Math.min(itemsTotal, itemsTotal * (coupon.discount / 100));
        }
      }

      const gst = computeGst(lines, itemsTotal, discountAmount, restaurant.gstRegistrationType);

      let lat: number | null = null;
      let lng: number | null = null;
      if (args.address?._id) {
        const existing = await prisma.address.findFirst({ where: { id: args.address._id, userId: currentUser.id } });
        lat = existing?.latitude ?? null;
        lng = existing?.longitude ?? null;
      } else if (args.address?.latitude?.trim() && args.address?.longitude?.trim()) {
        lat = Number(args.address.latitude);
        lng = Number(args.address.longitude);
      }
      const distance = assertCoordinatesInServiceArea(restaurant, lat, lng, args.isPickedUp);
      let deliveryCharges = 0;
      if (!args.isPickedUp) {
        const config = await prisma.configuration.findFirst();
        deliveryCharges = computeDeliveryFee(
          { costType: config?.costType, deliveryRate: config?.deliveryRate },
          distance ?? 0,
          {
            deliveryFee: restaurant.deliveryFee,
            minDeliveryFee: restaurant.minDeliveryFee,
            deliveryFeeType: restaurant.deliveryFeeType,
          },
        );
      }

      return {
        itemsTotal,
        discountAmount,
        deliveryCharges,
        gstMode: gst.gstMode,
        cgst: gst.cgst,
        sgst: gst.sgst,
        taxationAmount: gst.taxationAmount,
        orderAmount: itemsTotal - discountAmount + deliveryCharges + gst.taxationAmount,
      };
    },
  },

  Mutation: {
    placeOrder: async (_parent, args: PlaceOrderArgs, context) => {
      const currentUser = requireAuth(context);
      // COD and CASHFREE (Cashfree Payment Gateway) are the only payment
      // methods actually wired up end-to-end. Stripe/PayPal are half-built
      // and never got a working checkout-session/webhook on this server, so
      // still reject anything else here — modifyOrder mirrors this check.
      if (args.paymentMethod !== 'COD' && args.paymentMethod !== 'CASHFREE') {
        throw userInputError('Unsupported payment method — choose Cash on Delivery or online payment.');
      }
      const restaurant = await prisma.restaurant.findUnique({ where: { id: args.restaurant } });
      if (!restaurant || !restaurant.isActive) throw userInputError('Restaurant not found or unavailable');
      if (restaurant.approvalStatus && restaurant.approvalStatus !== 'APPROVED') {
        throw userInputError('This store is not currently accepting orders');
      }

      if (args.recipientPhone && !isValidIndianMobile(args.recipientPhone)) {
        throw userInputError('Recipient phone must be a valid 10-digit Indian mobile number');
      }

      const { itemsData, itemsTotal, lines } = await buildOrderItems(args.restaurant, args.orderInput, restaurant.tax);
      if (itemsTotal < restaurant.minimumOrder) {
        throw userInputError(`Order amount is below the restaurant's minimum order of ${restaurant.minimumOrder}`);
      }

      const addressId = await resolveOrderAddress(currentUser.id, args.address);

      // Both delivery and pickup must be within the store's service radius.
      // The distance is reused below for the delivery fee instead of recomputing it.
      const distance = await assertAddressInDeliveryArea(args.restaurant, addressId, args.isPickedUp);

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
          // Re-checked here (not just at the checkout-time preview) so a
          // client can't skip verification and place the order directly.
          if (coupon.firstOrderOnly && (await hasPriorOrder(currentUser.id))) {
            throw userInputError('This coupon is valid for first-time orders only');
          }
          discountAmount = Math.min(itemsTotal, itemsTotal * (coupon.discount / 100));
        }
      }

      // Tax and delivery fee are computed here, server-side, from data the
      // client can't influence — `args.taxationAmount`/`args.deliveryCharges`
      // are accepted (older client builds still send them) but never trusted;
      // a tampered client can no longer place an order at a lower charge.
      const gst = computeGst(lines, itemsTotal, discountAmount, restaurant.gstRegistrationType);
      let deliveryCharges = 0;
      if (!args.isPickedUp) {
        const config = await prisma.configuration.findFirst();
        deliveryCharges = computeDeliveryFee(
          { costType: config?.costType, deliveryRate: config?.deliveryRate },
          distance ?? 0,
          {
            deliveryFee: restaurant.deliveryFee,
            minDeliveryFee: restaurant.minDeliveryFee,
            deliveryFeeType: restaurant.deliveryFeeType,
          },
        );
      }

      const orderAmount = itemsTotal - discountAmount + deliveryCharges + args.tipping + gst.taxationAmount;

      // Fulfilment: pickup → PICKUP; a self-delivery-only store → SELF; anything
      // MVP delivery is handled by the store; historical fleet orders retain their mode. The store
      // can move a BOTH order to its own person after accepting it.
      const deliveryMode = args.isPickedUp ? 'PICKUP' : 'SELF';

      const order = await prisma.order.create({
        data: {
          orderId: generateDisplayOrderId(),
          userId: currentUser.id,
          restaurantId: args.restaurant,
          addressId,
          paymentMethod: args.paymentMethod,
          tipping: args.tipping,
          taxationAmount: gst.taxationAmount,
          cgstAmount: gst.gstMode === 'REGULAR' ? gst.cgst : null,
          sgstAmount: gst.gstMode === 'REGULAR' ? gst.sgst : null,
          deliveryCharges,
          discountAmount,
          orderAmount,
          instructions: args.instructions,
          recipientPhone: normalizeIndianPhone(args.recipientPhone),
          isPickedUp: args.isPickedUp,
          deliveryMode,
          orderDate: new Date(args.orderDate),
          items: { create: itemsData },
        },
      });

      await publishOrderUpdate(order);
      // CASHFREE orders aren't shown/alerted to the store until the webhook
      // confirms payment (see cashfree-webhook.ts) — otherwise a store could
      // start preparing food for an order the customer never actually paid
      // for (abandoned checkout, failed payment). COD carries no such risk
      // since the store is paid in cash on handover either way.
      if (args.paymentMethod !== 'CASHFREE') {
        await pubsub.publish(TOPICS.SUBSCRIBE_PLACE_ORDER(order.restaurantId), {
          subscribePlaceOrder: { userId: order.userId, origin: 'order_service', order },
        });
        await prisma.webNotification.create({
          data: { userId: restaurant.ownerId, body: `New order #${order.orderId} received`, navigateTo: '/orders' },
        });
        notifyOrderEvent(order.id, 'PLACED');
      }
      return order;
    },

    modifyOrder: async (
      _parent,
      args: {
        id: string;
        isPickedUp?: boolean;
        paymentMethod?: string;
        address?: PlaceOrderArgs['address'];
        deliveryCharges?: number;
      },
      context,
    ) => {
      const currentUser = requireAuth(context);
      const order = await prisma.order.findUnique({ where: { id: args.id } });
      if (!order) throw notFoundError('Order not found');
      const isOwner = order.userId === currentUser.id;
      const isAdmin = currentUser.userType === 'ADMIN';
      if (!isOwner && !isAdmin) throw notFoundError('Order not found');
      if (order.orderStatus !== 'PENDING') {
        throw userInputError('This order can no longer be changed — the store has already accepted it.');
      }

      const pickup = args.isPickedUp ?? order.isPickedUp;
      const data: Record<string, unknown> = {};

      if (args.paymentMethod && args.paymentMethod !== order.paymentMethod) {
        if (args.paymentMethod !== 'COD' && args.paymentMethod !== 'CASHFREE') {
          throw userInputError('Unsupported payment method — choose Cash on Delivery or online payment.');
        }
        data.paymentMethod = args.paymentMethod;
      }

      // Resolve the address if the caller passed a new one, else keep the order's.
      let addressId = order.addressId;
      if (args.address) addressId = await resolveOrderAddress(order.userId, args.address);

      // Delivery fee: 0 for pickup; for delivery, recomputed server-side (never
      // trust `args.deliveryCharges`) whenever the caller signals a fulfilment
      // change — either an explicit delivery-charges touch or a pickup→delivery
      // switch. Otherwise the order's existing fee is left as-is.
      const distance = await assertAddressInDeliveryArea(order.restaurantId, addressId, pickup);
      let deliveryCharges = order.deliveryCharges;
      if (pickup) {
        deliveryCharges = 0;
        if (order.riderId) data.riderId = null;
      } else {
        if (args.deliveryCharges != null || order.isPickedUp) {
          const [config, rest] = await Promise.all([
            prisma.configuration.findFirst(),
            prisma.restaurant.findUnique({
              where: { id: order.restaurantId },
              select: { deliveryFee: true, minDeliveryFee: true, deliveryFeeType: true },
            }),
          ]);
          deliveryCharges = computeDeliveryFee(
            { costType: config?.costType, deliveryRate: config?.deliveryRate },
            distance ?? 0,
            { deliveryFee: rest?.deliveryFee, minDeliveryFee: rest?.minDeliveryFee, deliveryFeeType: rest?.deliveryFeeType },
          );
        }
      }

      if (args.isPickedUp != null && args.isPickedUp !== order.isPickedUp) {
        data.isPickedUp = args.isPickedUp;
        // Keep deliveryMode in step with the fulfilment flag.
        if (args.isPickedUp) {
          data.deliveryMode = 'PICKUP';
          data.storeDeliveryAgentId = null;
        } else {
          data.deliveryMode = 'SELF';
        }
      }
      if (addressId !== order.addressId) data.addressId = addressId;
      if (deliveryCharges !== order.deliveryCharges) {
        data.deliveryCharges = deliveryCharges;
        // itemsBase = itemsTotal − discount, which is invariant to fulfilment.
        const itemsBase = order.orderAmount - order.deliveryCharges - order.tipping - order.taxationAmount;
        data.orderAmount =
          Math.round((itemsBase + deliveryCharges + order.tipping + order.taxationAmount) * 100) / 100;
      }

      if (Object.keys(data).length === 0) return order;

      const updated = await prisma.order.update({ where: { id: args.id }, data });
      await publishOrderUpdate(updated);
      return updated;
    },

    // Customer self-cancel is disabled platform-wide, at every status
    // (including PENDING) — once placed, an order can only be cancelled by
    // the store/admin (see the separate role-gated `cancelOrder` mutation).
    // Kept as a resolver (rather than removed from the schema) so an older
    // client build still gets a clear, friendly rejection instead of a raw
    // GraphQL schema error.
    abortOrder: async (_parent, args: { id: string }, context) => {
      const currentUser = requireAuth(context);
      const order = await prisma.order.findUnique({ where: { id: args.id } });
      if (!order || order.userId !== currentUser.id) throw notFoundError('Order not found');
      throw userInputError('This order cannot be cancelled. Please contact the store for help.');
    },

    updateOrderStatus: (_parent, args: { id: string; status: string }, context) =>
      applyOrderStatusUpdate(context, args.id, args.status),

    updateStatus: (_parent, args: { id: string; orderStatus: string }, context) =>
      applyOrderStatusUpdate(context, args.id, args.orderStatus),

    assignRider: async (_parent, args: { id: string; riderId: string }, context) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      const order = await prisma.order.findUnique({ where: { id: args.id } });
      if (!order) throw notFoundError('Order not found');
      // Once a rider has picked the order up (or it's reached a terminal
      // state) the handoff is done — reassigning would silently yank it away
      // from whoever is already carrying it.
      if (order.orderStatus !== 'ACCEPTED' && order.orderStatus !== 'ASSIGNED') {
        throw userInputError('This order can no longer be reassigned to a different rider');
      }
      const rider = await prisma.user.findUnique({ where: { id: args.riderId } });
      if (!rider || rider.userType !== 'RIDER') throw userInputError('Rider not found');
      await assertRiderApproved(args.riderId);
      await assertRiderNotRejected(args.riderId);
      await assertRiderUnderCashLimit(args.riderId, args.id);

      const updated = await prisma.order.update({
        where: { id: args.id },
        data: { riderId: args.riderId, orderStatus: 'ASSIGNED', assignedAt: new Date() },
      });
      await publishOrderUpdate(updated);
      await publishRiderAssigned(updated);
      notifyOrderEvent(updated.id, 'RIDER_ASSIGNED');
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
      // Same rule as assignRider (Issue 85): once the order has moved past
      // ACCEPTED/ASSIGNED (picked up or further), self-claiming would yank
      // it away from whoever is already carrying it and regress its status.
      if (order.orderStatus !== 'ACCEPTED' && order.orderStatus !== 'ASSIGNED') {
        throw userInputError('This order can no longer be assigned to a rider');
      }
      await assertRiderApproved(currentUser.id);
      await assertRiderNotRejected(currentUser.id);
      await assertRiderUnderCashLimit(currentUser.id, args.id);

      const updated = await prisma.order.update({
        where: { id: args.id },
        data: { riderId: currentUser.id, orderStatus: 'ASSIGNED', assignedAt: new Date() },
      });
      await publishOrderUpdate(updated);
      await publishRiderAssigned(updated);
      notifyOrderEvent(updated.id, 'RIDER_ASSIGNED');
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
        data: {
          orderStatus: 'ACCEPTED',
          status: 'ACTIVE',
          acceptedAt: new Date(),
          preparationTime: args.time,
          // Mint the proof-of-delivery code now, so the customer sees it the
          // moment the order is confirmed. Pickup orders don't need one.
          ...(!order.isPickedUp && !order.deliveryOtp ? { deliveryOtp: makeDeliveryOtp() } : {}),
        },
      });
      await publishOrderUpdate(updated);
      if (order.orderStatus !== 'ACCEPTED') notifyOrderEvent(updated.id, 'CONFIRMED');
      return updated;
    },

    // Whoever delivers the order — a LocalSell rider or the store's own person —
    // closes it here with the 4-digit code the customer shows them.
    confirmDelivery: async (_parent, args: { orderId: string; otp: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR', 'RIDER']);
      const order = await prisma.order.findUnique({ where: { id: args.orderId } });
      if (!order) throw notFoundError('Order not found');
      const restaurant = await prisma.restaurant.findUnique({ where: { id: order.restaurantId } });
      if (!restaurant) throw notFoundError('Order not found');
      if (currentUser.userType === 'VENDOR' && restaurant.ownerId !== currentUser.id) {
        throw notFoundError('Order not found');
      }
      if (currentUser.userType === 'RIDER' && order.riderId !== currentUser.id) {
        throw notFoundError('Order not found');
      }
      if (order.orderStatus === 'DELIVERED' || order.orderStatus === 'COMPLETED') return order;
      if (order.orderStatus === 'CANCELLED' || order.orderStatus === 'PENDING') {
        throw userInputError('This order is not out for delivery.');
      }

      if (!order.deliveryOtp) {
        // Legacy order accepted before this feature — mint the code now and ask
        // them to try again once the customer can see it.
        await prisma.order.update({ where: { id: order.id }, data: { deliveryOtp: makeDeliveryOtp() } });
        throw userInputError(
          "Delivery code is now ready on the customer's order screen — ask them for it and try again.",
        );
      }
      if ((args.otp ?? '').trim() !== order.deliveryOtp) {
        throw userInputError('Incorrect delivery code. Ask the customer to read it from their order screen.');
      }

      return finalizeDelivery(order, restaurant, 'OTP');
    },

    cancelOrder: async (_parent, args: { _id: string; reason: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const reason = args.reason?.trim() ?? '';
      if (reason.length < 5) {
        throw userInputError('Please give a specific reason (at least 5 characters) for cancelling this order.');
      }
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
        data: {
          orderStatus: 'CANCELLED',
          status: 'CANCELLED',
          cancelledAt: new Date(),
          reason,
          cancelledByType: currentUser.userType,
          cancelledByName: currentUser.name ?? currentUser.email ?? currentUser.userType,
        },
      });
      await recordAudit(context, {
        action: 'order.cancel',
        targetType: 'Order',
        targetId: order.id,
        summary: `${currentUser.userType} cancelled order #${order.orderId}: ${reason}`,
        changes: { orderStatus: [order.orderStatus, 'CANCELLED'], reason },
      });
      await publishOrderUpdate(updated);
      if (order.orderStatus !== 'CANCELLED') {
        notifyOrderEvent(updated.id, 'CANCELLED');
        return refundOrderIfEligible(updated);
      }
      return updated;
    },

    // Admin-only: re-fires a refund that came back FAILED (bad credentials at
    // the time, a transient network error, etc). Refuses anything else so it
    // can't be used to double-refund a SUCCESS or race a PENDING/PROCESSING one.
    retryOrderRefund: async (_parent, args: { orderId: string }, context) => {
      requireRole(context, ['ADMIN']);
      const order = await prisma.order.findUnique({ where: { id: args.orderId } });
      if (!order) throw notFoundError('Order not found');
      if (order.refundStatus !== 'FAILED') {
        throw userInputError('Only a failed refund can be retried.');
      }
      return attemptCashfreeRefund(order);
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
    // Only the customer who placed the order (and admins) may read the code —
    // the person delivering has to be told it in person.
    deliveryOtp: (parent: Order, _args: unknown, context: GraphQLContext) => {
      const u = context.user;
      if (!u) return null;
      return u.userType === 'ADMIN' || u.id === parent.userId ? parent.deliveryOtp : null;
    },
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
    refundedAt: (parent: Order) => parent.refundedAt?.toISOString() ?? null,
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
