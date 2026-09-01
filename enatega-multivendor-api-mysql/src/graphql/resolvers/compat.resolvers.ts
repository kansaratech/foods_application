import { IResolvers } from '@graphql-tools/utils';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';

const NO_FORCED_UPDATE = { android: '0.0.0', ios: '0.0.0' };

export const compatResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    // Legacy apps read `tips.tipVariations` as a single object, not a list.
    tips: async () => ({ _id: 'default-tips', tipVariations: [5, 10, 15], enabled: true }),

    relatedItems: async (_parent, args: { itemId: string; restaurantId: string }) => {
      const item = await prisma.food.findUnique({ where: { id: args.itemId } });
      const foods = await prisma.food.findMany({
        where: {
          restaurantId: args.restaurantId,
          isActive: true,
          id: { not: args.itemId },
          ...(item?.categoryId ? { categoryId: item.categoryId } : {}),
        },
        take: 6,
      });
      return foods.map((f) => f.id);
    },

    popularItems: async (_parent, args: { restaurantId: string }) => {
      const foods = await prisma.food.findMany({
        where: { restaurantId: args.restaurantId, isActive: true },
        select: { id: true },
      });
      if (foods.length === 0) return [];
      const foodIds = foods.map((f) => f.id);
      const grouped = await prisma.orderItem.groupBy({
        by: ['foodId'],
        where: { foodId: { in: foodIds } },
        _sum: { quantity: true },
      });
      const countById = new Map(grouped.map((g) => [g.foodId, g._sum.quantity ?? 0]));
      return foodIds
        .map((id) => ({ id, count: countById.get(id) ?? 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },

    fetchCategoryDetailsByStoreIdForMobile: async (_parent, args: { storeId: string }) => {
      const categories = await prisma.category.findMany({
        where: { restaurantId: args.storeId },
        include: { foods: { where: { isActive: true }, select: { id: true, image: true } } },
      });
      return categories.flatMap((c) =>
        c.foods.map((f) => ({
          id: `${c.id}:${f.id}`,
          category_name: c.title,
          url: f.image ?? null,
          food_id: f.id,
        })),
      );
    },

    getVersions: () => ({
      customerAppVersion: NO_FORCED_UPDATE,
      riderAppVersion: NO_FORCED_UPDATE,
      restaurantAppVersion: NO_FORCED_UPDATE,
    }),
  },
};
