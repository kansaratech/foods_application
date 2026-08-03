import { IResolvers } from '@graphql-tools/utils';
import { Banner } from '@prisma/client';
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
}

export const bannerResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    banners: () => prisma.banner.findMany(),
  },
  Mutation: {
    createBanner: (_parent, args: { bannerInput: BannerInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      const input = args.bannerInput;
      return prisma.banner.create({
        data: { title: input.title, description: input.description, file: input.file, action: input.action, screen: input.screen },
      });
    },
    editBanner: (_parent, args: { bannerInput: BannerInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      const input = args.bannerInput;
      if (!input._id) throw notFoundError('Banner _id is required to edit');
      return prisma.banner.update({
        where: { id: input._id },
        data: { title: input.title, description: input.description, file: input.file, action: input.action, screen: input.screen },
      });
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
  },
};
