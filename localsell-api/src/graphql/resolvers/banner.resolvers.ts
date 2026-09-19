import { IResolvers } from '@graphql-tools/utils';
import { Banner, Prisma } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { notFoundError, userInputError } from '../../utils/errors';

interface BannerInputArgs {
  _id?: string;
  title?: string;
  description?: string;
  file?: string;
  action?: string;
  screen?: string;
  startDate?: string | null;
  endDate?: string | null;
  placement?: string;
  priority?: number;
  couponCode?: string | null;
  isActive?: boolean;
}

// Shared create/edit payload. Dates arrive as ISO strings from the admin form.
function bannerData(input: BannerInputArgs) {
  return {
    title: input.title,
    description: input.description,
    file: input.file,
    action: input.action,
    screen: input.screen,
    placement: input.placement ?? undefined,
    priority: input.priority ?? undefined,
    couponCode: input.couponCode === undefined ? undefined : input.couponCode || null,
    isActive: input.isActive ?? undefined,
    startDate: input.startDate ? new Date(input.startDate) : input.startDate === null ? null : undefined,
    endDate: input.endDate ? new Date(input.endDate) : input.endDate === null ? null : undefined,
  };
}

// A banner's couponCode is a free-standing reference to Coupon.title (no FK —
// coupons can be global or per-store, banners aren't). Placing an order
// matches it with an EXACT, case-sensitive `title` lookup (order.resolvers.ts
// placeOrder), so a code that doesn't exist there, or is disabled, silently
// never applies — the customer sees "Use code X" but it just never discounts
// anything. Validate the same way at save time so that can't happen (#118).
async function assertCouponCodeExists(couponCode: string | null | undefined): Promise<void> {
  if (!couponCode) return;
  const coupon = await prisma.coupon.findFirst({ where: { title: couponCode, enabled: true } });
  if (!coupon) {
    throw userInputError(
      `No enabled coupon named "${couponCode}" exists. Create it in the Coupons screen first, then pick it here — the code must match exactly.`,
    );
  }
}

export const bannerResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    banners: async (_parent, args: { placement?: string; activeOnly?: boolean }) => {
      const where: Prisma.BannerWhereInput = {};
      if (args.placement) where.placement = args.placement;

      let rows = await prisma.banner.findMany({ where, orderBy: { priority: 'desc' } });

      if (args.activeOnly !== false) {
        const now = new Date();
        rows = rows.filter(
          (b) =>
            b.isActive &&
            (!b.startDate || now >= b.startDate) &&
            (!b.endDate || now <= b.endDate),
        );
      }
      return rows;
    },
  },
  Mutation: {
    createBanner: async (_parent, args: { bannerInput: BannerInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      await assertCouponCodeExists(args.bannerInput.couponCode);
      return prisma.banner.create({ data: bannerData(args.bannerInput) });
    },
    editBanner: async (_parent, args: { bannerInput: BannerInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      const input = args.bannerInput;
      if (!input._id) throw notFoundError('Banner _id is required to edit');
      await assertCouponCodeExists(input.couponCode);
      return prisma.banner.update({ where: { id: input._id }, data: bannerData(input) });
    },
    deleteBanner: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      await prisma.banner.delete({ where: { id: args.id } });
      return true;
    },
  },
  Banner: {
    _id: (parent: Banner) => parent.id,
    parameters: (parent: Banner) => (parent.parameters ? JSON.stringify(parent.parameters) : null),
    startDate: (parent: Banner) => parent.startDate?.toISOString() ?? null,
    endDate: (parent: Banner) => parent.endDate?.toISOString() ?? null,
    // `screen` doubles as "which restaurant" only for this one action type —
    // resolved fresh on every read (never stored on the banner) so the web
    // app always routes to the store's CURRENT type/slug (#118: a stale or
    // missing shopType sent every "Navigate Specific Restaurant" banner to
    // the wrong detail-page template, which renders categories differently).
    shopType: async (parent: Banner) => {
      if (parent.action !== 'Navigate Specific Restaurant' || !parent.screen) return null;
      const restaurant = await prisma.restaurant.findUnique({ where: { id: parent.screen } });
      if (!restaurant?.shopTypeId) return null;
      const shopType = await prisma.shopType.findUnique({ where: { id: restaurant.shopTypeId } });
      return shopType?.slug ?? null;
    },
    slug: async (parent: Banner) => {
      if (parent.action !== 'Navigate Specific Restaurant' || !parent.screen) return null;
      const restaurant = await prisma.restaurant.findUnique({ where: { id: parent.screen } });
      return restaurant?.slug ?? null;
    },
  },
};
