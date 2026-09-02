import { IResolvers } from '@graphql-tools/utils';
import { Coupon } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireAuth, requireRole } from '../../middleware/auth';
import { notFoundError } from '../../utils/errors';

interface CouponInputArgs {
  _id?: string;
  title: string;
  discount?: number;
  enabled?: boolean;
  lifeTimeActive?: boolean;
  startDate?: string;
  endDate?: string;
}

function couponData(input: CouponInputArgs) {
  return {
    title: input.title,
    discount: input.discount ?? 0,
    enabled: input.enabled ?? true,
    lifeTimeActive: input.lifeTimeActive ?? false,
    startDate: input.startDate ? new Date(input.startDate) : null,
    endDate: input.endDate ? new Date(input.endDate) : null,
  };
}

export const couponResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    coupons: () => prisma.coupon.findMany({ where: { restaurantId: null } }),
    couponsPaginated: async (
      _parent,
      args: { page?: number; limit?: number; search?: string; enabled?: boolean; startDate?: string; endDate?: string },
    ) => {
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where = {
        restaurantId: null,
        ...(args.search ? { title: { contains: args.search } } : {}),
        ...(args.enabled != null ? { enabled: args.enabled } : {}),
      };
      const [data, totalCount] = await Promise.all([
        prisma.coupon.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.coupon.count({ where }),
      ]);
      return { data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) };
    },
    restaurantCoupons: (_parent, args: { restaurantId: string }) =>
      prisma.coupon.findMany({ where: { restaurantId: args.restaurantId } }),
    activeCoupons: async (
      _parent,
      args: { restaurantId?: string | null; campaignOnly?: boolean },
    ) => {
      const now = new Date();
      // With a restaurantId: that store's coupons + globals. Without one
      // (discovery/landing): every live coupon, so cards can each show their own.
      const where = args.restaurantId
        ? { enabled: true, OR: [{ restaurantId: null }, { restaurantId: args.restaurantId }] }
        : { enabled: true };
      const rows = await prisma.coupon.findMany({ where });
      return rows.filter((c) => {
        if (args.campaignOnly && (c.lifeTimeActive || (!c.startDate && !c.endDate))) return false;
        return (
          c.lifeTimeActive || ((!c.startDate || now >= c.startDate) && (!c.endDate || now <= c.endDate))
        );
      });
    },
    restaurantCouponsPaginated: async (
      _parent,
      args: { restaurantId: string; page?: number; limit?: number; search?: string; enabled?: boolean },
    ) => {
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where = {
        restaurantId: args.restaurantId,
        ...(args.search ? { title: { contains: args.search } } : {}),
        ...(args.enabled != null ? { enabled: args.enabled } : {}),
      };
      const [data, totalCount] = await Promise.all([
        prisma.coupon.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.coupon.count({ where }),
      ]);
      return { data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) };
    },
  },

  Mutation: {
    coupon: async (_parent, args: { coupon: string; restaurantId: string }, context) => {
      requireAuth(context);
      const now = new Date();
      const match = await prisma.coupon.findFirst({
        where: {
          title: args.coupon,
          enabled: true,
          OR: [{ restaurantId: null }, { restaurantId: args.restaurantId }],
        },
      });
      if (!match) {
        return { success: false, message: 'Invalid coupon code', coupon: null };
      }
      const isWithinWindow =
        match.lifeTimeActive || ((!match.startDate || now >= match.startDate) && (!match.endDate || now <= match.endDate));
      if (!isWithinWindow) {
        return { success: false, message: 'This coupon is not currently active', coupon: null };
      }
      return { success: true, message: 'Coupon applied', coupon: match };
    },

    createCoupon: (_parent, args: { couponInput: CouponInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.coupon.create({ data: couponData(args.couponInput) });
    },
    editCoupon: (_parent, args: { couponInput: CouponInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      if (!args.couponInput._id) throw notFoundError('Coupon _id is required to edit');
      return prisma.coupon.update({ where: { id: args.couponInput._id }, data: couponData(args.couponInput) });
    },
    deleteCoupon: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      await prisma.coupon.delete({ where: { id: args.id } });
      return true;
    },

    createRestaurantCoupon: (_parent, args: { restaurantId: string; couponInput: CouponInputArgs }, context) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      return prisma.coupon.create({ data: { ...couponData(args.couponInput), restaurantId: args.restaurantId } });
    },
    editRestaurantCoupon: (_parent, args: { restaurantId: string; couponInput: CouponInputArgs }, context) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      if (!args.couponInput._id) throw notFoundError('Coupon _id is required to edit');
      return prisma.coupon.update({
        where: { id: args.couponInput._id },
        data: { ...couponData(args.couponInput), restaurantId: args.restaurantId },
      });
    },
    deleteRestaurantCoupon: async (_parent, args: { restaurantId: string; couponId: string }, context) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      await prisma.coupon.delete({ where: { id: args.couponId } });
      return true;
    },
  },

  Coupon: {
    _id: (parent: Coupon) => parent.id,
    startDate: (parent: Coupon) => parent.startDate?.toISOString() ?? null,
    endDate: (parent: Coupon) => parent.endDate?.toISOString() ?? null,
  },
};
