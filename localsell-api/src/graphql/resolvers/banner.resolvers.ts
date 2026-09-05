import { IResolvers } from '@graphql-tools/utils';
import { Banner, Prisma } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { notFoundError } from '../../utils/errors';

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
    createBanner: (_parent, args: { bannerInput: BannerInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.banner.create({ data: bannerData(args.bannerInput) });
    },
    editBanner: (_parent, args: { bannerInput: BannerInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      const input = args.bannerInput;
      if (!input._id) throw notFoundError('Banner _id is required to edit');
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
  },
};
