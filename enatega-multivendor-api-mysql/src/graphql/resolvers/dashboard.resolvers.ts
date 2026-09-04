import { IResolvers } from '@graphql-tools/utils';
import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { forbiddenError, notFoundError } from '../../utils/errors';

type CurrentUser = { id: string; userType: string };

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

function monthRange(year: number, month: number): { gte: Date; lte: Date } {
  return {
    gte: new Date(year, month, 1),
    lte: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

function assertVendorAccess(user: CurrentUser, vendorId: string) {
  if (user.userType === 'ADMIN') return;
  if (user.userType === 'VENDOR' && user.id === vendorId) return;
  throw forbiddenError();
}

async function assertRestaurantAccess(user: CurrentUser, restaurantId: string) {
  if (user.userType === 'ADMIN') return;
  if (user.userType === 'VENDOR') {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (restaurant && restaurant.ownerId === user.id) return;
  }
  throw notFoundError('Restaurant not found');
}

async function orderStatsForWhere(where: Prisma.OrderWhereInput) {
  const orders = await prisma.order.findMany({ where, select: { orderAmount: true, deliveryCharges: true } });
  const total_orders = orders.length;
  const total_sales = orders.reduce((sum, o) => sum + o.orderAmount, 0);
  const total_delivery_fee = orders.reduce((sum, o) => sum + o.deliveryCharges, 0);
  return {
    total_orders,
    total_sales,
    total_sales_without_delivery: total_sales - total_delivery_fee,
    total_delivery_fee,
  };
}

async function storeDetailsForVendor(vendorId: string, range: { gte: Date; lte: Date } | undefined, search?: string) {
  const restaurants = await prisma.restaurant.findMany({
    where: { ownerId: vendorId, ...(search ? { name: { contains: search } } : {}) },
  });
  return Promise.all(
    restaurants.map(async (restaurant) => {
      const orders = await prisma.order.findMany({
        where: { restaurantId: restaurant.id, ...(range ? { createdAt: range } : {}) },
        select: { orderAmount: true, isPickedUp: true },
      });
      return {
        _id: restaurant.id,
        restaurantName: restaurant.name,
        totalOrders: orders.length,
        totalSales: orders.reduce((sum, o) => sum + o.orderAmount, 0),
        pickUpCount: orders.filter((o) => o.isPickedUp).length,
        deliveryCount: orders.filter((o) => !o.isPickedUp).length,
      };
    }),
  );
}

export const dashboardResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    adminOpsSnapshot: async (_parent, _args, context) => {
      requireRole(context, ['ADMIN']);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));

      const round2 = (n: number | null | undefined) => Math.round((n ?? 0) * 100) / 100;

      const [
        ordersDay,
        ordersWeek,
        activeOrders,
        activeStores,
        totalStores,
        ridersOnline,
        totalRiders,
        pendingPayouts,
        unbilled,
        openCash,
        waitlist,
      ] = await Promise.all([
        prisma.order.aggregate({ where: { createdAt: { gte: startOfDay } }, _count: { _all: true }, _sum: { orderAmount: true } }),
        prisma.order.aggregate({ where: { createdAt: { gte: startOfWeek } }, _count: { _all: true }, _sum: { orderAmount: true } }),
        prisma.order.count({ where: { orderStatus: { in: ['PENDING', 'ACCEPTED', 'PICKED', 'ASSIGNED'] } } }),
        prisma.restaurant.count({ where: { isActive: true, isAvailable: true } }),
        prisma.restaurant.count(),
        prisma.riderProfile.count({ where: { available: true } }),
        prisma.user.count({ where: { userType: 'RIDER' } }),
        prisma.withdrawRequest.aggregate({ where: { status: 'PENDING' }, _count: { _all: true }, _sum: { requestAmount: true } }),
        prisma.commissionRecord.aggregate({ where: { billId: null, selfCollected: false }, _sum: { commissionAmount: true } }),
        prisma.riderCashEntry.aggregate({ where: { remittanceId: null }, _sum: { owedToPlatform: true } }),
        prisma.waitlistEntry.count({ where: { notified: false } }),
      ]);

      return {
        ordersToday: ordersDay._count._all,
        gmvToday: round2(ordersDay._sum.orderAmount),
        ordersWeek: ordersWeek._count._all,
        gmvWeek: round2(ordersWeek._sum.orderAmount),
        activeOrders,
        activeStores,
        totalStores,
        ridersOnline,
        totalRiders,
        pendingPayouts: pendingPayouts._count._all,
        pendingPayoutAmount: round2(pendingPayouts._sum.requestAmount),
        unbilledCommission: round2(unbilled._sum.commissionAmount),
        codCashOutstanding: round2(openCash._sum.owedToPlatform),
        waitlistUnnotified: waitlist,
      };
    },

    storePerformance: async (
      _parent,
      args: { startDate?: string; endDate?: string; page?: number; limit?: number; search?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const now = new Date();
      const start = args.startDate
        ? new Date(args.startDate)
        : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const end = args.endDate ? new Date(args.endDate) : now;
      end.setUTCHours(23, 59, 59, 999);

      const limit = args.limit ?? 20;
      const page = args.page ?? 1;
      const search = args.search?.trim();
      // A vendor (incl. a store-app login, which is the owner USER) only sees
      // their own stores.
      const scope = currentUser.userType === 'VENDOR' ? { ownerId: currentUser.id } : {};
      const where = { ...scope, ...(search ? { name: { contains: search } } : {}) };

      const [stores, total] = await Promise.all([
        prisma.restaurant.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.restaurant.count({ where }),
      ]);
      const ids = stores.map((s) => s.id);

      const [orders, commissionAgg, reviewAgg] = await Promise.all([
        prisma.order.findMany({
          where: { restaurantId: { in: ids }, createdAt: { gte: start, lte: end } },
          select: { restaurantId: true, orderAmount: true, orderStatus: true },
        }),
        prisma.commissionRecord.groupBy({
          by: ['restaurantId'],
          where: { restaurantId: { in: ids }, orderDeliveredAt: { gte: start, lte: end } },
          _sum: { commissionAmount: true },
        }),
        prisma.review.groupBy({
          by: ['restaurantId'],
          where: { restaurantId: { in: ids } },
          _avg: { rating: true },
          _count: { _all: true },
        }),
      ]);

      const commissionByStore = new Map(commissionAgg.map((c) => [c.restaurantId, c._sum.commissionAmount ?? 0]));
      const reviewByStore = new Map(reviewAgg.map((r) => [r.restaurantId, r]));
      const round2 = (n: number) => Math.round(n * 100) / 100;

      const rows = stores.map((s) => {
        const so = orders.filter((o) => o.restaurantId === s.id);
        const delivered = so.filter((o) => o.orderStatus === 'DELIVERED').length;
        const cancelled = so.filter((o) => o.orderStatus === 'CANCELLED').length;
        const gmv = so.reduce((sum, o) => sum + o.orderAmount, 0);
        const rev = reviewByStore.get(s.id);
        return {
          _id: s.id,
          name: s.name,
          approvalStatus: s.approvalStatus ?? 'APPROVED',
          orders: so.length,
          delivered,
          cancelled,
          cancelRate: so.length ? round2((cancelled / so.length) * 100) : 0,
          gmv: round2(gmv),
          avgOrderValue: so.length ? round2(gmv / so.length) : 0,
          commissionEarned: round2(commissionByStore.get(s.id) ?? 0),
          avgRating: rev?._avg.rating != null ? round2(rev._avg.rating) : null,
          reviewCount: rev?._count._all ?? 0,
          walletBalance: round2(s.currentWalletAmount),
        };
      });

      return { rows, total, periodStart: start.toISOString(), periodEnd: end.toISOString() };
    },

    getDashboardUsersByYear: async (_parent, args: { year: number }, context) => {
      requireRole(context, ['ADMIN']);
      const { year } = args;
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
      const prevYearRange = { gte: new Date(year - 1, 0, 1), lte: new Date(year - 1, 11, 31, 23, 59, 59, 999) };

      // 4 queries + 4 counts instead of 52 sequential counts (the old month-by-
      // month loop was the main "dashboard is slow after login" cause).
      const [yearUsers, yearRestaurants, prevUsers, prevVendors, prevRiders, prevRestaurants] =
        await Promise.all([
          prisma.user.findMany({
            where: { createdAt: { gte: yearStart, lte: yearEnd }, userType: { in: ['CUSTOMER', 'VENDOR', 'RIDER'] } },
            select: { userType: true, createdAt: true },
          }),
          prisma.restaurant.findMany({
            where: { createdAt: { gte: yearStart, lte: yearEnd } },
            select: { createdAt: true },
          }),
          prisma.user.count({ where: { userType: 'CUSTOMER', createdAt: prevYearRange } }),
          prisma.user.count({ where: { userType: 'VENDOR', createdAt: prevYearRange } }),
          prisma.user.count({ where: { userType: 'RIDER', createdAt: prevYearRange } }),
          prisma.restaurant.count({ where: { createdAt: prevYearRange } }),
        ]);

      const usersCount = new Array(12).fill(0);
      const vendorsCount = new Array(12).fill(0);
      const ridersCount = new Array(12).fill(0);
      const restaurantsCount = new Array(12).fill(0);
      for (const u of yearUsers) {
        const m = u.createdAt.getMonth();
        if (u.userType === 'CUSTOMER') usersCount[m] += 1;
        else if (u.userType === 'VENDOR') vendorsCount[m] += 1;
        else if (u.userType === 'RIDER') ridersCount[m] += 1;
      }
      for (const r of yearRestaurants) restaurantsCount[r.createdAt.getMonth()] += 1;

      const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
      const pct = (curr: number, prev: number) => (prev > 0 ? ((curr - prev) / prev) * 100 : null);

      return {
        usersCount,
        vendorsCount,
        ridersCount,
        restaurantsCount,
        percentageChange: {
          usersPercent: pct(sum(usersCount), prevUsers),
          vendorsPercent: pct(sum(vendorsCount), prevVendors),
          restaurantsPercent: pct(sum(restaurantsCount), prevRestaurants),
          ridersPercent: pct(sum(ridersCount), prevRiders),
        },
      };
    },

    getDashboardOrdersByType: async (_parent, _args, context) => {
      requireRole(context, ['ADMIN']);
      const statuses: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PICKED', 'ASSIGNED', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
      const grouped = await prisma.order.groupBy({ by: ['orderStatus'], _count: { _all: true } });
      const byStatus = new Map(grouped.map((g) => [g.orderStatus, g._count._all]));
      return statuses.map((status) => ({ label: status, value: byStatus.get(status) ?? 0 }));
    },

    getDashboardSalesByType: async (_parent, _args, context) => {
      requireRole(context, ['ADMIN']);
      const byMethod = await prisma.order.groupBy({ by: ['paymentMethod'], _sum: { orderAmount: true } });
      return byMethod.map((row) => ({ label: row.paymentMethod, value: row._sum.orderAmount ?? 0 }));
    },

    getRestaurantDashboardOrdersSalesStats: async (
      _parent,
      args: { restaurant: string; starting_date: string; ending_date: string; dateKeyword?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      await assertRestaurantAccess(currentUser, args.restaurant);
      const range = computeDateRange(args.dateKeyword, args.starting_date, args.ending_date);
      const orders = await prisma.order.findMany({
        where: { restaurantId: args.restaurant, ...(range ? { createdAt: range } : {}) },
        select: { orderAmount: true, paymentMethod: true },
      });
      return {
        totalOrders: orders.length,
        totalSales: orders.reduce((sum, o) => sum + o.orderAmount, 0),
        totalCODOrders: orders.filter((o) => o.paymentMethod === 'COD').length,
        totalCardOrders: orders.filter((o) => o.paymentMethod !== 'COD').length,
      };
    },

    getRestaurantDashboardSalesOrderCountDetailsByYear: async (
      _parent,
      args: { restaurant: string; year: number },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      await assertRestaurantAccess(currentUser, args.restaurant);
      const salesAmount: number[] = [];
      const ordersCount: number[] = [];
      for (let month = 0; month < 12; month++) {
        const orders = await prisma.order.findMany({
          where: { restaurantId: args.restaurant, createdAt: monthRange(args.year, month) },
          select: { orderAmount: true },
        });
        ordersCount.push(orders.length);
        salesAmount.push(orders.reduce((sum, o) => sum + o.orderAmount, 0));
      }
      return { salesAmount, ordersCount };
    },

    getRestaurantDashboardOrderSalesDetailsByPaymentMethod: async (
      _parent,
      args: { restaurant: string; starting_date: string; ending_date: string; dateKeyword?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      await assertRestaurantAccess(currentUser, args.restaurant);
      const range = computeDateRange(args.dateKeyword, args.starting_date, args.ending_date);
      const baseWhere: Prisma.OrderWhereInput = {
        restaurantId: args.restaurant,
        ...(range ? { createdAt: range } : {}),
      };

      const [allStats, pickupStats, deliveryStats, codPickup, codDelivery, cardPickup, cardDelivery] = await Promise.all([
        orderStatsForWhere(baseWhere),
        orderStatsForWhere({ ...baseWhere, isPickedUp: true }),
        orderStatsForWhere({ ...baseWhere, isPickedUp: false }),
        orderStatsForWhere({ ...baseWhere, paymentMethod: 'COD', isPickedUp: true }),
        orderStatsForWhere({ ...baseWhere, paymentMethod: 'COD', isPickedUp: false }),
        orderStatsForWhere({ ...baseWhere, paymentMethod: { not: 'COD' }, isPickedUp: true }),
        orderStatsForWhere({ ...baseWhere, paymentMethod: { not: 'COD' }, isPickedUp: false }),
      ]);

      return {
        ...allStats,
        pickup_total_orders: pickupStats.total_orders,
        delivery_total_orders: deliveryStats.total_orders,
        pickup_orders: pickupStats.total_orders,
        delivery_orders: deliveryStats.total_orders,
        pickup: { total_orders: pickupStats.total_orders },
        delivery: { total_orders: deliveryStats.total_orders },
        all: [
          { _type: 'isPickedUp', data: pickupStats },
          { _type: 'isNotPickedUp', data: deliveryStats },
        ],
        cod: [
          { _type: 'isPickedUp', data: codPickup },
          { _type: 'isNotPickedUp', data: codDelivery },
        ],
        card: [
          { _type: 'isPickedUp', data: cardPickup },
          { _type: 'isNotPickedUp', data: cardDelivery },
        ],
      };
    },

    getStoreDetailsByVendorId: async (
      _parent,
      args: { id: string; dateKeyword?: string; starting_date?: string; ending_date?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      assertVendorAccess(currentUser, args.id);
      const range = computeDateRange(args.dateKeyword, args.starting_date, args.ending_date);
      return storeDetailsForVendor(args.id, range);
    },

    getStoreDetailsByVendorIdPaginated: async (
      _parent,
      args: {
        id: string;
        dateKeyword?: string;
        starting_date?: string;
        ending_date?: string;
        page?: number;
        limit?: number;
        search?: string;
      },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      assertVendorAccess(currentUser, args.id);
      const range = computeDateRange(args.dateKeyword, args.starting_date, args.ending_date);
      const all = await storeDetailsForVendor(args.id, range, args.search);
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const totalCount = all.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / limit));
      const data = all.slice((page - 1) * limit, (page - 1) * limit + limit);
      return { data, totalCount, currentPage: page, totalPages };
    },

    getVendorDashboardStatsCardDetails: async (
      _parent,
      args: { vendorId: string; dateKeyword?: string; starting_date: string; ending_date: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      assertVendorAccess(currentUser, args.vendorId);
      const range = computeDateRange(args.dateKeyword, args.starting_date, args.ending_date);
      const restaurants = await prisma.restaurant.findMany({ where: { ownerId: args.vendorId }, select: { id: true } });
      const restaurantIds = restaurants.map((r) => r.id);
      const orders = await prisma.order.findMany({
        where: { restaurantId: { in: restaurantIds }, ...(range ? { createdAt: range } : {}) },
        select: { orderAmount: true, orderStatus: true },
      });
      return {
        totalRestaurants: restaurants.length,
        totalOrders: orders.length,
        totalSales: orders.reduce((sum, o) => sum + o.orderAmount, 0),
        totalDeliveries: orders.filter((o) => o.orderStatus === 'DELIVERED' || o.orderStatus === 'COMPLETED').length,
      };
    },

    getLiveMonitorData: async (
      _parent,
      args: { id: string; dateKeyword?: string; starting_date?: string; ending_date?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      assertVendorAccess(currentUser, args.id);
      const range = computeDateRange(args.dateKeyword, args.starting_date, args.ending_date);
      const restaurants = await prisma.restaurant.findMany({ where: { ownerId: args.id } });
      const restaurantIds = restaurants.map((r) => r.id);
      const online_stores = restaurants.filter((r) => r.isActive && r.isAvailable).length;
      const now = new Date();

      const [cancelled_orders, delayed_orders, reviews] = await Promise.all([
        prisma.order.count({
          where: { restaurantId: { in: restaurantIds }, orderStatus: 'CANCELLED', ...(range ? { createdAt: range } : {}) },
        }),
        prisma.order.count({
          where: {
            restaurantId: { in: restaurantIds },
            orderStatus: { notIn: ['DELIVERED', 'COMPLETED', 'CANCELLED'] },
            expectedTime: { lt: now },
            ...(range ? { createdAt: range } : {}),
          },
        }),
        prisma.review.findMany({ where: { restaurantId: { in: restaurantIds } }, select: { rating: true } }),
      ]);

      const ratings = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;
      return { online_stores, cancelled_orders, delayed_orders, ratings };
    },

    getVendorDashboardGrowthDetailsByYear: async (_parent, args: { vendorId: string; year: number }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      assertVendorAccess(currentUser, args.vendorId);
      const totalRestaurants: number[] = [];
      const totalOrders: number[] = [];
      const totalSales: number[] = [];
      for (let month = 0; month < 12; month++) {
        const range = monthRange(args.year, month);
        const [restCount, orders] = await Promise.all([
          prisma.restaurant.count({ where: { ownerId: args.vendorId, createdAt: range } }),
          prisma.order.findMany({
            where: { restaurant: { ownerId: args.vendorId }, createdAt: range },
            select: { orderAmount: true },
          }),
        ]);
        totalRestaurants.push(restCount);
        totalOrders.push(orders.length);
        totalSales.push(orders.reduce((sum, o) => sum + o.orderAmount, 0));
      }
      return { totalRestaurants, totalOrders, totalSales };
    },
  },
};
