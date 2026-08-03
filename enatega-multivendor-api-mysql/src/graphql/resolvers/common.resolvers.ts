import { IResolvers } from '@graphql-tools/utils';
import { Cuisine, ShopType } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { saveBase64Image } from '../../services/upload.service';
import { requireRole } from '../../middleware/auth';
import { GraphQLContext } from '../../context';
import { notFoundError } from '../../utils/errors';

function slugify(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;
}

interface CreateShopTypeInputArgs {
  name: string;
  image?: string;
}

interface UpdateShopTypeInputArgs {
  _id: string;
  name?: string;
  image?: string;
  isActive?: boolean;
}

interface CuisineInputArgs {
  _id?: string;
  name: string;
  description?: string;
  image?: string;
  shopType?: string;
}

async function resolveShopTypeId(shopType?: string | null): Promise<string | undefined> {
  if (!shopType) return undefined;
  const byId = await prisma.shopType.findUnique({ where: { id: shopType } });
  if (byId) return byId.id;
  const bySlug = await prisma.shopType.findUnique({ where: { slug: shopType } });
  return bySlug?.id;
}

export const commonResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    configuration: async () => {
      const config = await prisma.configuration.findFirst();
      return config;
    },
    fetchAllShopTypes: async () => {
      const data = await prisma.shopType.findMany();
      return { data };
    },
    fetchShopTypes: async (_parent, args: { filter?: { search?: string; isActive?: boolean }; pagination?: { page?: number; limit?: number } }) => {
      const limit = args.pagination?.limit ?? 20;
      const page = args.pagination?.page ?? 1;
      const where = {
        ...(args.filter?.search ? { name: { contains: args.filter.search } } : {}),
        ...(args.filter?.isActive != null ? { isActive: args.filter.isActive } : {}),
      };
      const [data, total] = await Promise.all([
        prisma.shopType.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.shopType.count({ where }),
      ]);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      return { data, total, page, pageSize: limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 };
    },
    cuisines: async () => prisma.cuisine.findMany(),
    cuisinesPaginated: async (
      _parent,
      args: { page?: number; limit?: number; search?: string; shopType?: string },
    ) => {
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where = {
        ...(args.search ? { name: { contains: args.search } } : {}),
        ...(args.shopType ? { shopTypeId: await resolveShopTypeId(args.shopType) } : {}),
      };
      const [data, totalCount] = await Promise.all([
        prisma.cuisine.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.cuisine.count({ where }),
      ]);
      return { data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) };
    },
  },
  Mutation: {
    uploadImageToS3: (_parent, args: { image: string }, context) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      const imageUrl = saveBase64Image(args.image);
      return { imageUrl };
    },

    createShopType: (_parent, args: { dto: CreateShopTypeInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.shopType.create({ data: { name: args.dto.name, image: args.dto.image, slug: slugify(args.dto.name) } });
    },
    updateShopType: (_parent, args: { dto: UpdateShopTypeInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.shopType.update({
        where: { id: args.dto._id },
        data: { name: args.dto.name, image: args.dto.image, isActive: args.dto.isActive },
      });
    },
    deleteShopType: (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.shopType.delete({ where: { id: args.id } });
    },

    createCuisine: async (_parent, args: { cuisineInput: CuisineInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.cuisine.create({
        data: {
          name: args.cuisineInput.name,
          description: args.cuisineInput.description,
          image: args.cuisineInput.image,
          shopTypeId: await resolveShopTypeId(args.cuisineInput.shopType),
        },
      });
    },
    editCuisine: async (_parent, args: { cuisineInput: CuisineInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      if (!args.cuisineInput._id) throw notFoundError('Cuisine _id is required to edit');
      return prisma.cuisine.update({
        where: { id: args.cuisineInput._id },
        data: {
          name: args.cuisineInput.name,
          description: args.cuisineInput.description,
          image: args.cuisineInput.image,
          shopTypeId: args.cuisineInput.shopType ? await resolveShopTypeId(args.cuisineInput.shopType) : undefined,
        },
      });
    },
    deleteCuisine: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      await prisma.cuisine.delete({ where: { id: args.id } });
      return true;
    },
  },
  Configuration: {
    _id: (parent: { id: string }) => parent.id,
  },
  ShopType: {
    _id: (parent: ShopType) => parent.id,
  },
  Cuisine: {
    _id: (parent: Cuisine) => parent.id,
    shopType: async (parent: Cuisine) => {
      if (!parent.shopTypeId) return null;
      const shopType = await prisma.shopType.findUnique({ where: { id: parent.shopTypeId } });
      return shopType?.slug ?? null;
    },
  },
};
