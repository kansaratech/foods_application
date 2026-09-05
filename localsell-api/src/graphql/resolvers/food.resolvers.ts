import { IResolvers } from '@graphql-tools/utils';
import { Addon, Category, Food, Option, SubCategory, Variation } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { notFoundError, userInputError } from '../../utils/errors';
import { recordAudit } from '../../utils/audit';

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

interface ComboItemInputArgs {
  foodId: string;
  variationId?: string;
  quantity?: number;
}

interface FoodInputArgs {
  _id?: string;
  restaurant: string;
  title: string;
  description?: string;
  image?: string;
  images?: string[];
  badge?: string | null;
  isActive?: boolean;
  category: string;
  subCategory?: string;
  variations: VariationInputArgs[];
  isCombo?: boolean;
  comboItems?: ComboItemInputArgs[];
  compareAtPrice?: number | null;
  pairedFoodIds?: string[];
}

// Extra Food columns from the combo / upsell feature. Kept out of the main
// data literal so createFood/editFood stay readable.
function foodExtraFields(input: FoodInputArgs) {
  return {
    isCombo: input.isCombo ?? undefined,
    comboItems:
      input.comboItems !== undefined
        ? (input.comboItems.map((c) => ({
            foodId: c.foodId,
            variationId: c.variationId ?? null,
            quantity: c.quantity && c.quantity > 0 ? c.quantity : 1,
          })) as unknown as object)
        : undefined,
    compareAtPrice: input.compareAtPrice ?? undefined,
    pairedFoodIds:
      input.pairedFoodIds !== undefined ? (input.pairedFoodIds as unknown as object) : undefined,
  };
}

// The first image doubles as the legacy single `image` field so every
// screen that only ever renders `food.image` (menus, cart, item detail,
// order history, ...) keeps working without changes.
function foodImageFields(input: Pick<FoodInputArgs, 'image' | 'images'>) {
  const images = input.images?.filter(Boolean) ?? [];
  if (images.length > 0) return { image: images[0], images };
  return { image: input.image, images: undefined };
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
  isRequired?: boolean;
  options?: OptionInputArgs[];
}

// Keep isRequired and quantityMinimum consistent: a required group forces at
// least one pick; an optional one allows zero.
function normalizeAddonRules(input: AddonInputArgs) {
  const max = input.quantityMaximum ?? 1;
  let min = input.quantityMinimum ?? 0;
  if (input.isRequired && min < 1) min = 1;
  if (input.isRequired === false) min = 0;
  return { quantityMinimum: min, quantityMaximum: Math.max(max, min), isRequired: min >= 1 };
}

export const foodResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    popularFoodItems: (_parent, args: { restaurantId: string }) =>
      prisma.food.findMany({ where: { restaurantId: args.restaurantId, isActive: true }, take: 10 }),

    restaurantCombos: (_parent, args: { restaurantId: string }) =>
      prisma.food.findMany({
        where: { restaurantId: args.restaurantId, isCombo: true, isActive: true },
        orderBy: { createdAt: 'desc' },
      }),

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
          badge: input.badge ?? null,
          ...foodImageFields(input),
          ...foodExtraFields(input),
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
          badge: input.badge ?? null,
          ...foodImageFields(input),
          ...foodExtraFields(input),
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

    updateVariationOutOfStock: async (_parent, args: { id: string; restaurant: string }, context) => {
      await assertOwnsRestaurant(context, args.restaurant);
      const variation = await prisma.variation.findUnique({ where: { id: args.id } });
      if (!variation) throw notFoundError('Variation not found');
      await prisma.variation.update({ where: { id: args.id }, data: { isOutOfStock: !variation.isOutOfStock } });
      return true;
    },

    cloneMenu: async (
      _parent,
      args: { fromRestaurantId: string; toRestaurantId: string; replace?: boolean },
      context,
    ) => {
      requireRole(context, ['ADMIN']);
      if (args.fromRestaurantId === args.toRestaurantId) {
        throw userInputError('Source and target store must be different');
      }
      const [source, target] = await Promise.all([
        prisma.restaurant.findUnique({ where: { id: args.fromRestaurantId } }),
        prisma.restaurant.findUnique({ where: { id: args.toRestaurantId } }),
      ]);
      if (!source) throw notFoundError('Source store not found');
      if (!target) throw notFoundError('Target store not found');

      if (args.replace) {
        // A food that appears on a past order can't be hard-deleted (OrderItem
        // FK). Deactivate everything the target currently has instead, and drop
        // the categories/addons that carry no order history.
        const ordered = await prisma.orderItem.count({
          where: { food: { restaurantId: target.id } },
        });
        if (ordered > 0) {
          await prisma.food.updateMany({ where: { restaurantId: target.id }, data: { isActive: false } });
        } else {
          await prisma.category.deleteMany({ where: { restaurantId: target.id } });
          await prisma.addon.deleteMany({ where: { restaurantId: target.id } });
        }
      }

      // 1. Add-ons + options (old id → new id).
      const srcAddons = await prisma.addon.findMany({
        where: { restaurantId: source.id },
        include: { options: true },
      });
      const addonIdMap = new Map<string, string>();
      for (const a of srcAddons) {
        const created = await prisma.addon.create({
          data: {
            restaurantId: target.id,
            title: a.title,
            description: a.description,
            quantityMinimum: a.quantityMinimum,
            quantityMaximum: a.quantityMaximum,
            options: {
              create: a.options.map((o) => ({ title: o.title, description: o.description, price: o.price })),
            },
          },
        });
        addonIdMap.set(a.id, created.id);
      }

      // 2. Categories → foods → variations → variation/add-on links.
      const srcCategories = await prisma.category.findMany({
        where: { restaurantId: source.id },
        include: { foods: { include: { variations: { include: { addons: true } } } } },
      });
      let items = 0;
      for (const c of srcCategories) {
        const newCategory = await prisma.category.create({
          data: { restaurantId: target.id, title: c.title, image: c.image },
        });
        for (const f of c.foods) {
          const newFood = await prisma.food.create({
            data: {
              restaurantId: target.id,
              categoryId: newCategory.id,
              title: f.title,
              description: f.description,
              image: f.image,
              images: f.images ?? undefined,
              badge: f.badge,
              isActive: f.isActive,
              isOutOfStock: f.isOutOfStock,
            },
          });
          items += 1;
          for (const v of f.variations) {
            const newVariation = await prisma.variation.create({
              data: {
                foodId: newFood.id,
                title: v.title,
                price: v.price,
                discounted: v.discounted,
                isOutOfStock: v.isOutOfStock,
              },
            });
            const links = v.addons
              .map((link) => addonIdMap.get(link.addonId))
              .filter((id): id is string => Boolean(id))
              .map((addonId) => ({ variationId: newVariation.id, addonId }));
            if (links.length) await prisma.variationAddon.createMany({ data: links });
          }
        }
      }

      await recordAudit(context, {
        action: 'menu.clone',
        targetType: 'Restaurant',
        targetId: target.id,
        summary: `Cloned menu from ${source.name} to ${target.name} (${srcCategories.length} categories, ${items} items${args.replace ? ', replaced existing' : ''})`,
      });
      return prisma.restaurant.findUnique({ where: { id: target.id } });
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
          ...normalizeAddonRules(input),
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
          ...normalizeAddonRules(input),
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
    images: (parent: Food) => {
      const stored = Array.isArray(parent.images) ? (parent.images as string[]) : [];
      if (stored.length > 0) return stored;
      return parent.image ? [parent.image] : [];
    },
    isCombo: (parent: Food) => parent.isCombo ?? false,
    compareAtPrice: (parent: Food) => parent.compareAtPrice ?? null,
    comboItems: async (parent: Food) => {
      const raw = Array.isArray(parent.comboItems)
        ? (parent.comboItems as Array<{ foodId: string; variationId?: string | null; quantity?: number }>)
        : [];
      if (!raw.length) return [];
      const foods = await prisma.food.findMany({ where: { id: { in: raw.map((r) => r.foodId) } } });
      const byId = new Map(foods.map((f) => [f.id, f]));
      return raw
        .map((r) => {
          const f = byId.get(r.foodId);
          if (!f) return null;
          return {
            foodId: r.foodId,
            variationId: r.variationId ?? null,
            title: f.title,
            quantity: r.quantity && r.quantity > 0 ? r.quantity : 1,
            image: f.image ?? null,
            isOutOfStock: f.isOutOfStock,
          };
        })
        .filter(Boolean);
    },
    pairedFoods: async (parent: Food) => {
      const ids = Array.isArray(parent.pairedFoodIds) ? (parent.pairedFoodIds as string[]) : [];
      if (!ids.length) return [];
      const foods = await prisma.food.findMany({ where: { id: { in: ids }, isActive: true } });
      const withVariation = await Promise.all(
        foods.map(async (f) => {
          const v = await prisma.variation.findFirst({ where: { foodId: f.id }, orderBy: { price: 'asc' } });
          return {
            _id: f.id,
            title: f.title,
            image: f.image ?? null,
            price: v?.discounted ?? v?.price ?? null,
            isOutOfStock: f.isOutOfStock,
          };
        }),
      );
      // preserve the merchant's ordering
      const order = new Map(ids.map((id, i) => [id, i]));
      return withVariation.sort((a, b) => (order.get(a._id) ?? 0) - (order.get(b._id) ?? 0));
    },
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
    isRequired: (parent: Addon) => parent.isRequired ?? (parent.quantityMinimum ?? 0) >= 1,
    options: (parent: Addon) => prisma.option.findMany({ where: { addonId: parent.id } }),
  },
  Option: {
    _id: (parent: Option) => parent.id,
  },
};
