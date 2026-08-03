import { IResolvers } from '@graphql-tools/utils';
import { Zone } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { notFoundError } from '../../utils/errors';

interface ZoneInputArgs {
  _id?: string;
  title: string;
  description?: string;
  coordinates?: number[][][];
}

export const zoneResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    zones: () => prisma.zone.findMany(),
    zonesPaginated: async (
      _parent,
      args: { page?: number; limit?: number; search?: string; isActive?: boolean },
    ) => {
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where = {
        ...(args.search ? { title: { contains: args.search } } : {}),
        ...(args.isActive != null ? { isActive: args.isActive } : {}),
      };
      const [data, totalCount] = await Promise.all([
        prisma.zone.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.zone.count({ where }),
      ]);
      return { data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) };
    },
  },
  Mutation: {
    createZone: (_parent, args: { zone: ZoneInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.zone.create({
        data: { title: args.zone.title, description: args.zone.description, boundary: args.zone.coordinates ?? undefined },
      });
    },
    editZone: async (_parent, args: { zone: ZoneInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      if (!args.zone._id) throw notFoundError('Zone _id is required to edit');
      return prisma.zone.update({
        where: { id: args.zone._id },
        data: {
          title: args.zone.title,
          description: args.zone.description,
          boundary: args.zone.coordinates ?? undefined,
        },
      });
    },
    deleteZone: (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.zone.delete({ where: { id: args.id } });
    },
  },
  Zone: {
    _id: (parent: Zone) => parent.id,
    location: (parent: Zone) => (parent.boundary ? { coordinates: parent.boundary } : null),
  },
};
