import { IResolvers } from '@graphql-tools/utils';
import { Prisma, Transaction, UserType, WithdrawRequest } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { forbiddenError, notFoundError, userInputError } from '../../utils/errors';
import { riderOutstandingCash } from '../../utils/commission';
import { recordAudit } from '../../utils/audit';

const nanoid = customAlphabet('0123456789', 8);
type CurrentUser = { id: string; userType: string };

function computeDateRange(starting_date?: string, ending_date?: string): { gte: Date; lte: Date } | undefined {
  if (!starting_date || !ending_date) return undefined;
  const start = new Date(starting_date);
  const end = new Date(ending_date);
  end.setHours(23, 59, 59, 999);
  return { gte: start, lte: end };
}

/** Restricts WithdrawRequest/Transaction rows to what the caller may see. */
async function scopeMoneyWhere(
  currentUser: CurrentUser,
  userType?: 'RIDER' | 'STORE',
  userId?: string,
): Promise<Prisma.WithdrawRequestWhereInput> {
  if (currentUser.userType === 'ADMIN') {
    if (userType === 'RIDER') return { riderId: userId ?? { not: null } };
    if (userType === 'STORE') return { restaurantId: userId ?? { not: null } };
    return {};
  }
  if (currentUser.userType === 'RIDER') {
    return { riderId: currentUser.id };
  }
  if (currentUser.userType === 'VENDOR') {
    const restaurants = await prisma.restaurant.findMany({ where: { ownerId: currentUser.id }, select: { id: true } });
    const ids = restaurants.map((r) => r.id);
    if (userId && !ids.includes(userId)) throw forbiddenError();
    return { restaurantId: userId ?? { in: ids } };
  }
  throw forbiddenError();
}

/** Same access rule as scopeMoneyWhere, but for the Order table (earnings are derived from orders). */
async function scopeOrderWhere(
  currentUser: CurrentUser,
  userType?: 'RIDER' | 'STORE',
  userId?: string,
): Promise<Prisma.OrderWhereInput> {
  if (currentUser.userType === 'ADMIN') {
    if (userType === 'RIDER') return { riderId: userId ?? { not: null } };
    if (userType === 'STORE') return userId ? { restaurantId: userId } : {};
    return {};
  }
  if (currentUser.userType === 'RIDER') {
    return { riderId: currentUser.id };
  }
  if (currentUser.userType === 'VENDOR') {
    const restaurants = await prisma.restaurant.findMany({ where: { ownerId: currentUser.id }, select: { id: true } });
    const ids = restaurants.map((r) => r.id);
    if (userId && !ids.includes(userId)) throw forbiddenError();
    return { restaurantId: userId ?? { in: ids } };
  }
  throw forbiddenError();
}

async function resolveVendorRestaurant(currentUser: CurrentUser, requestedRestaurantId?: string) {
  if (requestedRestaurantId) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: requestedRestaurantId } });
    if (!restaurant || restaurant.ownerId !== currentUser.id) throw notFoundError('Restaurant not found');
    return restaurant;
  }
  const restaurants = await prisma.restaurant.findMany({ where: { ownerId: currentUser.id } });
  if (restaurants.length === 1) return restaurants[0];
  if (restaurants.length === 0) throw userInputError('You have no store to withdraw from');
  throw userInputError('You own multiple stores - please specify which one to withdraw from');
}

function withPaginationDefaults(pagination?: { pageSize?: number; pageNo?: number }) {
  return { pageSize: pagination?.pageSize ?? 10, pageNo: pagination?.pageNo ?? 1 };
}

async function notifyAdminsOfWithdrawRequest(body: string) {
  const admins = await prisma.user.findMany({ where: { userType: 'ADMIN' }, select: { id: true } });
  if (admins.length === 0) return;
  await prisma.webNotification.createMany({ data: admins.map((a) => ({ userId: a.id, body, navigateTo: '/finance/withdraw-requests' })) });
}

// Earnings split: the platform keeps the commission (on the food subtotal, at
// the restaurant's own commissionRate). The rider gets the full delivery fee +
// tip. The store gets the rest of the food subtotal PLUS the tax it remits as
// GST. No separate platform delivery cut or flat fee.
function computeEarningRow(
  order: {
    id: string;
    orderId: string;
    isPickedUp: boolean;
    paymentMethod: string;
    orderAmount: number;
    deliveryCharges: number;
    tipping: number;
    taxationAmount: number;
    riderId: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  restaurant: { id: string; name: string; username: string | null; commissionRate: number },
  rider: { id: string; name: string | null; username: string | null } | null,
) {
  const foodAmount = order.orderAmount - order.deliveryCharges - order.tipping - order.taxationAmount;
  const marketplaceCommission = foodAmount * (restaurant.commissionRate / 100);
  const deliveryCommission = 0;
  const tax = order.taxationAmount;
  const platformFee = 0;
  const platformTotal = marketplaceCommission + deliveryCommission + platformFee; // tax is the store's to remit
  const storeTotal = foodAmount - marketplaceCommission + tax;
  const riderTotal = order.deliveryCharges + order.tipping;

  return {
    _id: order.id,
    orderId: order.orderId,
    orderType: order.isPickedUp ? 'PICKUP' : 'DELIVERY',
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    platformEarnings: {
      marketplaceCommission,
      deliveryCommission,
      tax: 0, // tax passes through to the store (GST), not the platform
      platformFee,
      totalEarnings: platformTotal,
    },
    riderEarnings: order.riderId
      ? {
          riderId: rider ? { _id: rider.id, name: rider.name, username: rider.username } : null,
          deliveryFee: order.deliveryCharges,
          tip: order.tipping,
          totalEarnings: riderTotal,
        }
      : null,
    storeEarnings: {
      storeId: { _id: restaurant.id, name: restaurant.name, username: restaurant.username },
      orderAmount: foodAmount,
      totalEarnings: storeTotal,
    },
  };
}

export const paymentResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    withdrawRequests: async (
      _parent,
      args: {
        userType?: 'RIDER' | 'STORE';
        userId?: string;
        status?: string;
        pagination?: { pageSize?: number; pageNo?: number };
        search?: string;
      },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR', 'RIDER']);
      const scopedWhere = await scopeMoneyWhere(currentUser, args.userType, args.userId);
      const where: Prisma.WithdrawRequestWhereInput = {
        ...scopedWhere,
        ...(args.status ? { status: args.status } : {}),
        ...(args.search ? { requestId: { contains: args.search } } : {}),
      };
      const { pageSize, pageNo } = withPaginationDefaults(args.pagination);
      const [data, total] = await Promise.all([
        prisma.withdrawRequest.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (pageNo - 1) * pageSize,
          take: pageSize,
        }),
        prisma.withdrawRequest.count({ where }),
      ]);
      return { success: true, message: null, pagination: { total }, data };
    },

    transactionHistory: async (
      _parent,
      args: {
        userType?: 'RIDER' | 'STORE';
        userId?: string;
        search?: string;
        pagination?: { pageSize?: number; pageNo?: number };
        dateFilter?: { starting_date?: string; ending_date?: string };
      },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR', 'RIDER']);
      const scopedWhere = await scopeMoneyWhere(currentUser, args.userType, args.userId);
      const range = computeDateRange(args.dateFilter?.starting_date, args.dateFilter?.ending_date);
      const where: Prisma.TransactionWhereInput = {
        ...(scopedWhere as Prisma.TransactionWhereInput),
        ...(args.search ? { transactionId: { contains: args.search } } : {}),
        ...(range ? { createdAt: range } : {}),
      };
      const { pageSize, pageNo } = withPaginationDefaults(args.pagination);
      const [data, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (pageNo - 1) * pageSize,
          take: pageSize,
        }),
        prisma.transaction.count({ where }),
      ]);
      return { data, pagination: { total } };
    },

    earnings: async (
      _parent,
      args: {
        userId?: string;
        userType?: 'RIDER' | 'STORE';
        orderType?: 'DELIVERY' | 'PICKUP';
        paymentMethod?: string;
        search?: string;
        pagination?: { pageSize?: number; pageNo?: number };
        dateFilter?: { starting_date?: string; ending_date?: string };
      },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR', 'RIDER']);
      const scopedWhere = await scopeOrderWhere(currentUser, args.userType, args.userId);
      const range = computeDateRange(args.dateFilter?.starting_date, args.dateFilter?.ending_date);
      const where: Prisma.OrderWhereInput = {
        ...scopedWhere,
        orderStatus: { in: ['DELIVERED', 'COMPLETED'] },
        ...(args.orderType ? { isPickedUp: args.orderType === 'PICKUP' } : {}),
        ...(args.paymentMethod ? { paymentMethod: args.paymentMethod } : {}),
        ...(args.search ? { orderId: { contains: args.search } } : {}),
        ...(range ? { createdAt: range } : {}),
      };

      const allOrders = await prisma.order.findMany({ where, orderBy: { createdAt: 'desc' } });
      const restaurantIds = [...new Set(allOrders.map((o) => o.restaurantId))];
      const riderIds = [...new Set(allOrders.map((o) => o.riderId).filter((id): id is string => !!id))];
      const [restaurants, riders] = await Promise.all([
        prisma.restaurant.findMany({ where: { id: { in: restaurantIds } } }),
        prisma.user.findMany({ where: { id: { in: riderIds } } }),
      ]);
      const restaurantById = new Map(restaurants.map((r) => [r.id, r]));
      const riderById = new Map(riders.map((r) => [r.id, r]));

      const rows = allOrders
        .map((order) => {
          const restaurant = restaurantById.get(order.restaurantId);
          if (!restaurant) return null;
          const rider = order.riderId ? (riderById.get(order.riderId) ?? null) : null;
          return computeEarningRow(order, restaurant, rider);
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      const grandTotalEarnings = rows.reduce(
        (acc, row) => ({
          platformTotal: acc.platformTotal + row.platformEarnings.totalEarnings,
          riderTotal: acc.riderTotal + (row.riderEarnings?.totalEarnings ?? 0),
          storeTotal: acc.storeTotal + row.storeEarnings.totalEarnings,
        }),
        { platformTotal: 0, riderTotal: 0, storeTotal: 0 },
      );

      const { pageSize, pageNo } = withPaginationDefaults(args.pagination);
      const pageRows = rows.slice((pageNo - 1) * pageSize, (pageNo - 1) * pageSize + pageSize);

      return {
        success: true,
        message: null,
        data: { earnings: pageRows, grandTotalEarnings },
        pagination: { total: rows.length },
      };
    },

    storeCurrentWithdrawRequest: async (_parent, args: { storeId?: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const restaurant = await resolveVendorRestaurant(currentUser, args.storeId);
      return prisma.withdrawRequest.findFirst({
        where: { restaurantId: restaurant.id, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });
    },

    riderCurrentWithdrawRequest: async (_parent, args: { riderId?: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'RIDER']);
      const riderId = currentUser.userType === 'RIDER' ? currentUser.id : args.riderId;
      if (!riderId) throw userInputError('riderId is required');
      return prisma.withdrawRequest.findFirst({
        where: { riderId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });
    },

    storeEarningsGraph: async (
      _parent,
      args: { storeId: string; page?: number; limit?: number; startDate?: string; endDate?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const restaurant = await prisma.restaurant.findUnique({ where: { id: args.storeId } });
      if (!restaurant) throw notFoundError('Store not found');
      if (currentUser.userType === 'VENDOR' && restaurant.ownerId !== currentUser.id) throw forbiddenError();

      const range = computeDateRange(args.startDate, args.endDate);
      const orders = await prisma.order.findMany({
        where: {
          restaurantId: restaurant.id,
          orderStatus: { in: ['DELIVERED', 'COMPLETED'] },
          ...(range ? { createdAt: range } : {}),
        },
        orderBy: { createdAt: 'asc' },
      });

      const byDate = new Map<
        string,
        { totalOrderAmount: number; totalEarnings: number; orderDetails: { orderId: string; orderType: string; paymentMethod: string }[] }
      >();
      for (const order of orders) {
        const foodAmount = order.orderAmount - order.deliveryCharges - order.tipping - order.taxationAmount;
        const storeEarning = foodAmount - foodAmount * (restaurant.commissionRate / 100) + order.taxationAmount;
        const dateKey = order.createdAt.toISOString().slice(0, 10);
        const entry = byDate.get(dateKey) ?? { totalOrderAmount: 0, totalEarnings: 0, orderDetails: [] };
        entry.totalOrderAmount += order.orderAmount;
        entry.totalEarnings += storeEarning;
        entry.orderDetails.push({ orderId: order.orderId, orderType: order.isPickedUp ? 'PICKUP' : 'DELIVERY', paymentMethod: order.paymentMethod });
        byDate.set(dateKey, entry);
      }
      const days = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([date, v]) => ({ ...v, date }));
      const totalEarningsSum = days.reduce((sum, d) => sum + d.totalEarnings, 0);
      const page = args.page ?? 1;
      const limit = args.limit ?? (days.length || 10);
      const pageDays = days.slice((page - 1) * limit, (page - 1) * limit + limit);

      return { totalCount: days.length, earnings: [{ _id: restaurant.id, totalEarningsSum, earningsArray: pageDays }] };
    },

    riderEarningsGraph: async (
      _parent,
      args: { riderId: string; page?: number; limit?: number; startDate?: string; endDate?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'RIDER']);
      if (currentUser.userType === 'RIDER' && args.riderId !== currentUser.id) throw forbiddenError();
      const rider = await prisma.user.findUnique({ where: { id: args.riderId } });
      if (!rider || rider.userType !== 'RIDER') throw notFoundError('Rider not found');

      const range = computeDateRange(args.startDate, args.endDate);
      const orders = await prisma.order.findMany({
        where: { riderId: args.riderId, orderStatus: { in: ['DELIVERED', 'COMPLETED'] }, ...(range ? { createdAt: range } : {}) },
        orderBy: { createdAt: 'asc' },
      });

      const byDate = new Map<
        string,
        { tip: number; deliveryFee: number; totalEarnings: number; orderDetails: { orderId: string; orderType: string; paymentMethod: string }[] }
      >();
      for (const order of orders) {
        const dateKey = order.createdAt.toISOString().slice(0, 10);
        const entry = byDate.get(dateKey) ?? { tip: 0, deliveryFee: 0, totalEarnings: 0, orderDetails: [] };
        entry.tip += order.tipping;
        entry.deliveryFee += order.deliveryCharges;
        entry.totalEarnings += order.tipping + order.deliveryCharges;
        entry.orderDetails.push({ orderId: order.orderId, orderType: order.isPickedUp ? 'PICKUP' : 'DELIVERY', paymentMethod: order.paymentMethod });
        byDate.set(dateKey, entry);
      }
      const days = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([date, v]) => ({ ...v, date }));
      const totalEarningsSum = days.reduce((sum, d) => sum + d.totalEarnings, 0);
      const totalTipsSum = days.reduce((sum, d) => sum + d.tip, 0);
      const page = args.page ?? 1;
      const limit = args.limit ?? (days.length || 10);
      const pageDays = days.slice((page - 1) * limit, (page - 1) * limit + limit);

      return {
        totalCount: days.length,
        earnings: [
          {
            _id: args.riderId,
            date: null,
            totalEarningsSum,
            totalTipsSum,
            totalDeliveries: orders.length,
            // No shift/clock-in tracking exists in this schema, so there's no real "hours worked" figure to report.
            totalHours: 0,
            earningsArray: pageDays,
          },
        ],
      };
    },
  },

  Mutation: {
    createWithdrawRequest: async (_parent, args: { requestAmount: number; restaurant?: string; userId?: string }, context) => {
      const currentUser = requireRole(context, ['VENDOR', 'RIDER']);
      if (args.requestAmount <= 0) throw userInputError('Withdraw amount must be greater than 0');

      if (currentUser.userType === 'RIDER') {
        const profile = await prisma.riderProfile.findUnique({ where: { userId: currentUser.id } });
        if (!profile) throw notFoundError('Rider profile not found');
        // Net settlement: undeposited COD cash is held against earnings. A rider
        // can only withdraw wallet balance beyond what they still owe.
        const owed = await riderOutstandingCash(currentUser.id);
        const available = Math.max(0, profile.currentWalletAmount - owed);
        if (args.requestAmount > available) {
          throw userInputError(
            owed > 0
              ? `You can withdraw ₹${available.toFixed(0)}. ₹${owed.toFixed(0)} of your balance is held against undeposited COD cash — deposit it to release the rest.`
              : 'Withdraw amount exceeds your available balance',
          );
        }
        const request = await prisma.withdrawRequest.create({
          data: { requestId: `WR-${nanoid()}`, riderId: currentUser.id, requestAmount: args.requestAmount },
        });
        await notifyAdminsOfWithdrawRequest(`New rider withdraw request: ${args.requestAmount}`);
        return request;
      }

      const restaurant = await resolveVendorRestaurant(currentUser, args.restaurant ?? args.userId);
      if (args.requestAmount > restaurant.currentWalletAmount) {
        throw userInputError('Withdraw amount exceeds your available balance');
      }
      const request = await prisma.withdrawRequest.create({
        data: { requestId: `WR-${nanoid()}`, restaurantId: restaurant.id, requestAmount: args.requestAmount },
      });
      await notifyAdminsOfWithdrawRequest(`New store withdraw request from ${restaurant.name}: ${args.requestAmount}`);
      return request;
    },

    updateWithdrawReqStatus: async (_parent, args: { id: string; status: string }, context) => {
      requireRole(context, ['ADMIN']);
      const existing = await prisma.withdrawRequest.findUnique({ where: { id: args.id } });
      if (!existing) throw notFoundError('Withdraw request not found');

      const isFirstTimeSettled = existing.status === 'PENDING' && args.status !== 'PENDING';

      if (isFirstTimeSettled) {
        if (existing.riderId) {
          await prisma.riderProfile.update({
            where: { userId: existing.riderId },
            data: {
              currentWalletAmount: { decrement: existing.requestAmount },
              withdrawnWalletAmount: { increment: existing.requestAmount },
            },
          });
        } else if (existing.restaurantId) {
          await prisma.restaurant.update({
            where: { id: existing.restaurantId },
            data: {
              currentWalletAmount: { decrement: existing.requestAmount },
              withdrawnWalletAmount: { increment: existing.requestAmount },
            },
          });
        }
        await prisma.transaction.create({
          data: {
            transactionId: `TXN-${nanoid()}`,
            withdrawRequestId: existing.id,
            riderId: existing.riderId,
            restaurantId: existing.restaurantId,
            userType: existing.riderId ? UserType.RIDER : UserType.VENDOR,
            amountTransferred: existing.requestAmount,
            status: 'COMPLETED',
          },
        });
      }

      const updated = await prisma.withdrawRequest.update({ where: { id: args.id }, data: { status: args.status } });
      await recordAudit(context, {
        action: `payout.${args.status.toLowerCase()}`,
        targetType: 'WithdrawRequest',
        targetId: args.id,
        summary: `Payout ${existing.status} → ${args.status} · ₹${existing.requestAmount.toFixed(2)} to ${
          existing.riderId ? 'rider' : 'store'
        }`,
        changes: { status: [existing.status, args.status] },
      });
      return { success: true, message: 'Withdraw request updated', data: updated };
    },
  },

  WithdrawRequest: {
    _id: (parent: WithdrawRequest) => parent.id,
    requestTime: (parent: WithdrawRequest) => parent.requestTime?.toISOString() ?? null,
    createdAt: (parent: WithdrawRequest) => parent.createdAt?.toISOString() ?? null,
    rider: (parent: WithdrawRequest) =>
      parent.riderId ? prisma.user.findUnique({ where: { id: parent.riderId }, include: { riderProfile: true } }) : null,
    store: (parent: WithdrawRequest) =>
      parent.restaurantId ? prisma.restaurant.findUnique({ where: { id: parent.restaurantId } }) : null,
  },

  Transaction: {
    _id: (parent: Transaction) => parent.id,
    userId: (parent: Transaction) => parent.riderId ?? parent.restaurantId,
    createdAt: (parent: Transaction) => parent.createdAt?.toISOString() ?? null,
    rider: (parent: Transaction) =>
      parent.riderId ? prisma.user.findUnique({ where: { id: parent.riderId }, include: { riderProfile: true } }) : null,
    store: (parent: Transaction) =>
      parent.restaurantId ? prisma.restaurant.findUnique({ where: { id: parent.restaurantId } }) : null,
    toBank: async (parent: Transaction) => {
      if (parent.riderId) {
        const profile = await prisma.riderProfile.findUnique({ where: { userId: parent.riderId } });
        return (profile?.bussinessDetails as Record<string, unknown> | null) ?? null;
      }
      if (parent.restaurantId) {
        const restaurant = await prisma.restaurant.findUnique({ where: { id: parent.restaurantId } });
        return (restaurant?.bussinessDetails as Record<string, unknown> | null) ?? null;
      }
      return null;
    },
  },
};
