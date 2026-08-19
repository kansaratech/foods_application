import { IResolvers } from '@graphql-tools/utils';
import { Addon, Category, Food, Option, SubCategory, Variation } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { notFoundError, userInputError } from '../../utils/errors';

async function assertOwnsRestaurant(context: GraphQLContext, restaurantId: string) {
  const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
  if (currentUser.userType === 'ADMIN') return;
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || restaurant.ownerId !== currentUser.id) throw notFoundError('Restaurant not found');
}

interface VariationInputArgs {
  _id?: string;
  title: string;
  price: number;
  discounted?: number;
  isOutOfStock?: boolean;
  addons?: string[];
}

interface FoodInputArgs {
  _id?: string;
  restaurant: string;
  title: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  category: string;
  subCategory?: string;
  variations: VariationInputArgs[];
}

interface CategoryInputArgs {
  _id?: string;
  title: string;
  image?: string;
  restaurant: string;
}

interface OptionInputArgs {
  _id?: string;
  title: string;
  description?: string;
  price: number;
}

interface AddonInputArgs {
  _id?: string;
  restaurant: string;
  title: string;
  description?: string;
  quantityMinimum?: number;
  quantityMaximum?: number;
  options?: OptionInputArgs[];
}

export const foodResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    popularFoodItems: (_parent, args: { restaurantId: string }) =>
      prisma.food.findMany({ where: { restaurantId: args.restaurantId, isActive: true }, take: 10 }),

    subCategories: () => prisma.subCategory.findMany(),
    subCategory: (_parent, args: { id?: string }) =>
      args.id ? prisma.subCategory.findUnique({ where: { id: args.id } }) : null,
    subCategoriesByParentId: (_parent, args: { parentCategoryId: string }) =>
      prisma.subCategory.findMany({ where: { parentCategoryId: args.parentCategoryId } }),

    restaurantCategoriesPaginated: async (
      _parent,
      args: { restaurantId: string; page?: number; limit?: number; search?: string },
    ) => {
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where = {
        restaurantId: args.restaurantId,
        ...(args.search ? { title: { contains: args.search } } : {}),
      };
      const [data, totalCount] = await Promise.all([
        prisma.category.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.category.count({ where }),
      ]);
      return { data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) };
    },

    restaurantOptionsPaginated: async (
      _parent,
      args: { restaurantId: string; page?: number; limit?: number; search?: string },
    ) => {
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where = {
        addon: { restaurantId: args.restaurantId },
        ...(args.search ? { title: { contains: args.search } } : {}),
      };
      const [data, totalCount] = await Promise.all([
        prisma.option.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.option.count({ where }),
      ]);
      return { data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) };
    },

    restaurantAddonsPaginated: async (
      _parent,
      args: { restaurantId: string; page?: number; limit?: number; search?: string },
    ) => {
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where = {
        restaurantId: args.restaurantId,
        ...(args.search ? { title: { contains: args.search } } : {}),
      };
      const [data, totalCount] = await Promise.all([
        prisma.addon.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.addon.count({ where }),
      ]);
      return { data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) };
    },
  },

  Mutation: {
    createFood: async (_parent, args: { foodInput: FoodInputArgs }, context) => {
      await assertOwnsRestaurant(context, args.foodInput.restaurant);
      const input = args.foodInput;

      await prisma.food.create({
        data: {
          restaurantId: input.restaurant,
          categoryId: input.category,
          subCategoryId: input.subCategory || undefined,
          title: input.title,
          description: input.description,
          image: input.image,
          isActive: input.isActive ?? true,
          variations: {
            create: input.variations.map((v) => ({
              title: v.title,
              price: v.price,
              discounted: v.discounted,
              isOutOfStock: v.isOutOfStock ?? false,
              addons: v.addons?.length ? { create: v.addons.map((addonId) => ({ addonId })) } : undefined,
            })),
          },
        },
      });

      return prisma.restaurant.findUnique({ where: { id: input.restaurant } });
    },

    editFood: async (_parent, args: { foodInput: FoodInputArgs }, context) => {
      await assertOwnsRestaurant(context, args.foodInput.restaurant);
      const input = args.foodInput;
      if (!input._id) throw notFoundError('Food _id is required to edit');

      await prisma.food.update({
        where: { id: input._id },
        data: {
          categoryId: input.category,
          subCategoryId: input.subCategory || undefined,
          title: input.title,
          description: input.description,
          image: input.image,
          isActive: input.isActive,
        },
      });

      for (const v of input.variations) {
        if (v._id) {
          await prisma.variation.update({
            where: { id: v._id },
            data: { title: v.title, price: v.price, discounted: v.discounted, isOutOfStock: v.isOutOfStock },
          });
          await prisma.variationAddon.deleteMany({ where: { variationId: v._id } });
          if (v.addons?.length) {
            await prisma.variationAddon.createMany({
              data: v.addons.map((addonId) => ({ variationId: v._id as string, addonId })),
            });
          }
        } else {
          await prisma.variation.create({
            data: {
              foodId: input._id,
              title: v.title,
              price: v.price,
              discounted: v.discounted,
              isOutOfStock: v.isOutOfStock ?? false,
              addons: v.addons?.length ? { create: v.addons.map((addonId) => ({ addonId })) } : undefined,
            },
          });
        }
      }

      return prisma.restaurant.findUnique({ where: { id: input.restaurant } });
    },

    deleteFood: async (_parent, args: { id: string; restaurant: string; categoryId: string }, context) => {
      await assertOwnsRestaurant(context, args.restaurant);
      return prisma.food.delete({ where: { id: args.id } });
    },

    updateFoodOutOfStock: async (_parent, args: { id: string; restaurant: string; categoryId: string }, context) => {
      await assertOwnsRestaurant(context, args.restaurant);
      const food = await prisma.food.findUnique({ where: { id: args.id } });
      if (!food) throw notFoundError('Food not found');
      await prisma.food.update({ where: { id: args.id }, data: { isOutOfStock: !food.isOutOfStock } });
      return true;
    },

    createCategory: async (_parent, args: { category: CategoryInputArgs }, context) => {
      await assertOwnsRestaurant(context, args.category.restaurant);
      await prisma.category.create({
        data: { restaurantId: args.category.restaurant, title: args.category.title, image: args.category.image },
      });
      return prisma.restaurant.findUnique({ where: { id: args.category.restaurant } });
    },
    editCategory: async (_parent, args: { category: CategoryInputArgs }, context) => {
      await assertOwnsRestaurant(context, args.category.restaurant);
      if (!args.category._id) throw notFoundError('Category _id is required to edit');
      await prisma.category.update({
        where: { id: args.category._id },
        data: { title: args.category.title, image: args.category.image },
      });
      return prisma.restaurant.findUnique({ where: { id: args.category.restaurant } });
    },
    deleteCategory: async (_parent, args: { id: string; restaurant: string }, context) => {
      await assertOwnsRestaurant(context, args.restaurant);
      await prisma.category.delete({ where: { id: args.id } });
      return prisma.restaurant.findUnique({ where: { id: args.restaurant } });
    },

    createAddon: async (_parent, args: { addonInput: AddonInputArgs }, context) => {
      await assertOwnsRestaurant(context, args.addonInput.restaurant);
      const input = args.addonInput;
      return prisma.addon.create({
        data: {
          restaurantId: input.restaurant,
          title: input.title,
          description: input.description,
          quantityMinimum: input.quantityMinimum ?? 0,
          quantityMaximum: input.quantityMaximum ?? 1,
          options: input.options?.length
            ? { create: input.options.map((o) => ({ title: o.title, description: o.description, price: o.price })) }
            : undefined,
        },
        include: { options: true },
      });
    },
    editAddon: async (_parent, args: { addonInput: AddonInputArgs }, context) => {
      await assertOwnsRestaurant(context, args.addonInput.restaurant);
      const input = args.addonInput;
      if (!input._id) throw notFoundError('Addon _id is required to edit');
      await prisma.addon.update({
        where: { id: input._id },
        data: {
          title: input.title,
          description: input.description,
          quantityMinimum: input.quantityMinimum,
          quantityMaximum: input.quantityMaximum,
        },
      });
      if (input.options) {
        await prisma.option.deleteMany({ where: { addonId: input._id } });
        await prisma.option.createMany({
          data: input.options.map((o) => ({ addonId: input._id as string, title: o.title, description: o.description, price: o.price })),
        });
      }
      return prisma.addon.findUnique({ where: { id: input._id }, include: { options: true } });
    },
    deleteAddon: async (_parent, args: { id: string; restaurant: string }, context) => {
      await assertOwnsRestaurant(context, args.restaurant);
      await prisma.addon.delete({ where: { id: args.id } });
      return true;
    },

    createSubCategories: async (_parent, args: { subCategories: { title: string; parentCategoryId: string }[] }, context) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      if (!args.subCategories.length) throw userInputError('At least one sub-category is required');
      await prisma.subCategory.createMany({
        data: args.subCategories.map((s) => ({ title: s.title, parentCategoryId: s.parentCategoryId })),
      });
      return true;
    },
    deleteSubCategory: async (_parent, args: { _id: string }, context) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      await prisma.subCategory.delete({ where: { id: args._id } });
      return true;
    },
  },

  Category: {
    _id: (parent: Category) => parent.id,
    foods: (parent: Category) => prisma.food.findMany({ where: { categoryId: parent.id } }),
  },
  Food: {
    _id: (parent: Food) => parent.id,
    subCategory: (parent: Food) => parent.subCategoryId,
    variations: (parent: Food) => prisma.variation.findMany({ where: { foodId: parent.id } }),
  },
  SubCategory: {
    _id: (parent: SubCategory) => parent.id,
  },
  Variation: {
    _id: (parent: Variation) => parent.id,
    id: (parent: Variation) => parent.id,
    addons: async (parent: Variation) => {
      const links = await prisma.variationAddon.findMany({ where: { variationId: parent.id } });
      return links.map((l) => l.addonId);
    },
  },
  Addon: {
    _id: (parent: Addon) => parent.id,
    options: (parent: Addon) => prisma.option.findMany({ where: { addonId: parent.id } }),
  },
  Option: {
    _id: (parent: Option) => parent.id,
  },
};
