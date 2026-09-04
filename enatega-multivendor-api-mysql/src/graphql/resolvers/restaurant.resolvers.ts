import { IResolvers } from '@graphql-tools/utils';
import { Prisma, Restaurant } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireAuth, requireRole } from '../../middleware/auth';
import { comparePassword, hashPassword, signAccessToken } from '../../services/auth.service';
import { distanceKm, pointInPolygon } from '../../utils/geo';
import { forbiddenError, notFoundError, userInputError } from '../../utils/errors';
import { recordAudit } from '../../utils/audit';

function slugify(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;
}

// A store a customer may see and order from: live, and past the onboarding gate.
const CUSTOMER_VISIBLE_STORE = { isActive: true, approvalStatus: 'APPROVED' } as const;
const STORE_APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

// Keep location-scoped lists local: when coordinates are given, drop restaurants
// further than `radiusKm` (default 60km) so legacy stores from other cities
// never appear. With no coordinates the list is returned unfiltered.
function withinRadius(
  restaurants: Restaurant[],
  latitude?: number | null,
  longitude?: number | null,
  radiusKm = 60,
): Restaurant[] {
  if (latitude == null || longitude == null) return restaurants;
  return restaurants.filter(
    (r) =>
      r.latitude != null &&
      r.longitude != null &&
      distanceKm(latitude, longitude, r.latitude, r.longitude) <= radiusKm,
  );
}

async function resolveShopTypeId(shopType?: string | null): Promise<string | undefined> {
  if (!shopType) return undefined;
  const byId = await prisma.shopType.findUnique({ where: { id: shopType } });
  if (byId) return byId.id;
  const bySlug = await prisma.shopType.findUnique({ where: { slug: shopType } });
  return bySlug?.id;
}

async function resolveCuisineIds(cuisines?: string[] | null): Promise<string[]> {
  if (!cuisines?.length) return [];
  const found = await prisma.cuisine.findMany({ where: { OR: [{ id: { in: cuisines } }, { name: { in: cuisines } }] } });
  return found.map((c) => c.id);
}

interface RestaurantInputArgs {
  name: string;
  address?: string;
  phone?: string;
  image?: string;
  logo?: string;
  deliveryTime?: number;
  minimumOrder?: number;
  username?: string;
  password?: string;
  shopType?: string;
  salesTax?: number;
  commissionRate?: number;
  cuisines?: string[];
  latitude?: number;
  longitude?: number;
}

interface RestaurantProfileInputArgs extends Partial<RestaurantInputArgs> {
  _id: string;
  orderPrefix?: string;
  isAvailable?: boolean;
}

function assertOwnsRestaurant(user: { id: string; userType: string }, restaurant: Restaurant) {
  if (user.userType === 'ADMIN') return;
  if (user.userType === 'VENDOR' && restaurant.ownerId === user.id) return;
  throw notFoundError('Restaurant not found');
}

export const restaurantResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    nearByRestaurants: async (
      _parent,
      args: { latitude?: number; longitude?: number; radiusKm?: number; shopType?: string },
    ) => {
      const where: { isActive: boolean; approvalStatus: string; shopTypeId?: string } = { ...CUSTOMER_VISIBLE_STORE };
      if (args.shopType) where.shopTypeId = await resolveShopTypeId(args.shopType);

      let restaurants = await prisma.restaurant.findMany({ where });
      if (args.latitude != null && args.longitude != null) {
        // Default to a local radius so stores from other cities (legacy seed
        // data) never leak into a location-scoped list.
        const radiusKm = args.radiusKm ?? 60;
        const withDist = restaurants.map((r) => ({
          r,
          dist:
            r.latitude != null && r.longitude != null
              ? distanceKm(args.latitude as number, args.longitude as number, r.latitude, r.longitude)
              : Number.MAX_SAFE_INTEGER,
        }));
        restaurants = withDist
          .filter((x) => x.dist <= radiusKm)
          .sort((a, b) => a.dist - b.dist)
          .map((x) => x.r);
      }
      return { offers: [], sections: [], restaurants };
    },

    nearByRestaurantsPreview: async (
      _parent,
      args: { latitude?: number; longitude?: number; radiusKm?: number; shopType?: string; page?: number; limit?: number },
    ) => {
      const where: { isActive: boolean; approvalStatus: string; shopTypeId?: string } = { ...CUSTOMER_VISIBLE_STORE };
      if (args.shopType) where.shopTypeId = await resolveShopTypeId(args.shopType);

      let restaurants = await prisma.restaurant.findMany({ where });
      if (args.latitude != null && args.longitude != null) {
        const radiusKm = args.radiusKm ?? 60;
        restaurants = restaurants
          .map((r) => ({
            r,
            dist:
              r.latitude != null && r.longitude != null
                ? distanceKm(args.latitude as number, args.longitude as number, r.latitude, r.longitude)
                : Number.MAX_SAFE_INTEGER,
          }))
          .filter((x) => x.dist <= radiusKm)
          .sort((a, b) => a.dist - b.dist)
          .map((x) => x.r);
      }

      if (args.limit != null) {
        const page = args.page ?? 1;
        restaurants = restaurants.slice((page - 1) * args.limit, (page - 1) * args.limit + args.limit);
      }

      // Same shape as nearByRestaurants so the customer app can read
      // `data.nearByRestaurantsPreview.restaurants`.
      return { offers: [], sections: [], restaurants };
    },

    recentOrderRestaurantsPreview: async (_parent, _args: { latitude: number; longitude: number }, context) => {
      const currentUser = requireAuth(context);
      const orders = await prisma.order.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: 'desc' },
        select: { restaurantId: true },
        take: 50,
      });
      const restaurantIds: string[] = [];
      for (const o of orders) {
        if (!restaurantIds.includes(o.restaurantId)) restaurantIds.push(o.restaurantId);
      }
      if (restaurantIds.length === 0) return [];
      const restaurants = await prisma.restaurant.findMany({ where: { id: { in: restaurantIds }, ...CUSTOMER_VISIBLE_STORE } });
      const byId = new Map(restaurants.map((r) => [r.id, r]));
      return restaurantIds.map((id) => byId.get(id)).filter((r): r is Restaurant => r != null).slice(0, 10);
    },

    mostOrderedRestaurantsPreview: async (
      _parent,
      args: { latitude?: number; longitude?: number; page?: number; limit?: number; shopType?: string },
    ) => {
      const where: { isActive: boolean; approvalStatus: string; shopTypeId?: string } = { ...CUSTOMER_VISIBLE_STORE };
      if (args.shopType) where.shopTypeId = await resolveShopTypeId(args.shopType);
      const limit = args.limit ?? 20;
      const page = args.page ?? 1;

      const grouped = await prisma.order.groupBy({ by: ['restaurantId'], _count: { _all: true } });
      const orderCountByRestaurant = new Map(grouped.map((g) => [g.restaurantId, g._count._all]));

      let restaurants = withinRadius(await prisma.restaurant.findMany({ where }), args.latitude, args.longitude);
      restaurants.sort((a, b) => (orderCountByRestaurant.get(b.id) ?? 0) - (orderCountByRestaurant.get(a.id) ?? 0));
      return restaurants.slice((page - 1) * limit, (page - 1) * limit + limit);
    },

    topRatedVendorsPreview: async (
      _parent,
      args: { latitude?: number; longitude?: number; page?: number; limit?: number; shopType?: string },
    ) => {
      const where: { isActive: boolean; approvalStatus: string; shopTypeId?: string } = { ...CUSTOMER_VISIBLE_STORE };
      if (args.shopType) where.shopTypeId = await resolveShopTypeId(args.shopType);
      const limit = args.limit ?? 20;
      const page = args.page ?? 1;

      const restaurants = withinRadius(await prisma.restaurant.findMany({ where }), args.latitude, args.longitude);
      const restaurantIds = restaurants.map((r) => r.id);
      const reviews =
        restaurantIds.length > 0
          ? await prisma.review.groupBy({ by: ['restaurantId'], _avg: { rating: true }, where: { restaurantId: { in: restaurantIds } } })
          : [];
      const avgById = new Map(reviews.map((r) => [r.restaurantId, r._avg.rating ?? 0]));

      restaurants.sort((a, b) => (avgById.get(b.id) ?? 0) - (avgById.get(a.id) ?? 0));
      return restaurants.slice((page - 1) * limit, (page - 1) * limit + limit);
    },

    popularRestaurantsPreview: async (
      _parent,
      args: { latitude?: number; longitude?: number; radiusKm?: number; limit?: number; shopType?: string },
    ) => {
      const where: { isActive: boolean; approvalStatus: string; shopTypeId?: string } = { ...CUSTOMER_VISIBLE_STORE };
      if (args.shopType) where.shopTypeId = await resolveShopTypeId(args.shopType);
      const limit = args.limit ?? 8;

      let restaurants = await prisma.restaurant.findMany({ where });
      if (args.latitude != null && args.longitude != null) {
        const radiusKm = args.radiusKm ?? 60;
        restaurants = restaurants.filter(
          (r) =>
            r.latitude != null &&
            r.longitude != null &&
            distanceKm(args.latitude as number, args.longitude as number, r.latitude, r.longitude) <= radiusKm,
        );
      }
      const restaurantIds = restaurants.map((r) => r.id);
      const grouped =
        restaurantIds.length > 0
          ? await prisma.review.groupBy({
              by: ['restaurantId'],
              _avg: { rating: true },
              _count: { _all: true },
              where: { restaurantId: { in: restaurantIds } },
            })
          : [];
      const statsById = new Map(grouped.map((g) => [g.restaurantId, { avg: g._avg.rating ?? 0, count: g._count._all }]));

      const scored = restaurants
        .map((r) => {
          const s = statsById.get(r.id) ?? { avg: 0, count: 0 };
          return { r, ...s };
        })
        .filter((x) => x.count >= 3)
        .sort((a, b) => b.avg - a.avg || b.count - a.count || a.r.deliveryTime - b.r.deliveryTime);

      return scored.slice(0, limit).map((x) => x.r);
    },

    activeRestaurantCount: async (
      _parent,
      args: { latitude?: number; longitude?: number; radiusKm?: number; shopType?: string },
    ) => {
      const where: { isActive: boolean; approvalStatus: string; shopTypeId?: string } = { ...CUSTOMER_VISIBLE_STORE };
      if (args.shopType) where.shopTypeId = await resolveShopTypeId(args.shopType);

      if (args.latitude != null && args.longitude != null) {
        const radiusKm = args.radiusKm ?? 60;
        const restaurants = await prisma.restaurant.findMany({ where, select: { latitude: true, longitude: true } });
        return restaurants.filter(
          (r) =>
            r.latitude != null &&
            r.longitude != null &&
            distanceKm(args.latitude as number, args.longitude as number, r.latitude, r.longitude) <= radiusKm,
        ).length;
      }
      return prisma.restaurant.count({ where });
    },

    nearByRestaurantsCuisines: async (_parent, args: { latitude?: number; longitude?: number; shopType?: string }) => {
      const where: { isActive: boolean; approvalStatus: string; shopTypeId?: string } = { ...CUSTOMER_VISIBLE_STORE };
      if (args.shopType) where.shopTypeId = await resolveShopTypeId(args.shopType);
      const restaurants = await prisma.restaurant.findMany({ where, select: { id: true } });
      const restaurantIds = restaurants.map((r) => r.id);
      if (restaurantIds.length === 0) return [];
      const links = await prisma.restaurantCuisine.findMany({
        where: { restaurantId: { in: restaurantIds } },
        include: { cuisine: true },
        distinct: ['cuisineId'],
      });
      return links.map((l) => l.cuisine);
    },

    attachedCuisines: async () => {
      const links = await prisma.restaurantCuisine.findMany({ include: { cuisine: true }, distinct: ['cuisineId'] });
      return links.map((l) => l.cuisine);
    },

    restaurant: (_parent, args: { id?: string }) => {
      if (!args.id) throw userInputError('Restaurant id is required');
      return prisma.restaurant.findUnique({ where: { id: args.id } });
    },

    userFavourite: async (_parent, _args, context) => {
      const currentUser = requireAuth(context);
      const ids = Array.isArray(currentUser.favouriteRestaurantIds)
        ? (currentUser.favouriteRestaurantIds as string[])
        : [];
      if (!ids.length) return [];
      return prisma.restaurant.findMany({ where: { id: { in: ids } } });
    },

    restaurants: async (_parent, _args, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      if (currentUser.userType === 'ADMIN') return prisma.restaurant.findMany();
      return prisma.restaurant.findMany({ where: { ownerId: currentUser.id } });
    },

    restaurantsPaginated: async (
      _parent,
      args: { page?: number; limit?: number; search?: string; approvalStatus?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where = {
        ...(currentUser.userType === 'VENDOR' ? { ownerId: currentUser.id } : {}),
        ...(args.search ? { name: { contains: args.search } } : {}),
        ...(args.approvalStatus && args.approvalStatus !== 'ALL'
          ? { approvalStatus: args.approvalStatus }
          : {}),
      };
      const [data, totalCount] = await Promise.all([
        prisma.restaurant.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.restaurant.count({ where }),
      ]);
      return { data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) };
    },

    restaurantByOwner: async (_parent, args: { id: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      if (currentUser.userType === 'VENDOR' && args.id !== currentUser.id) {
        throw forbiddenError();
      }
      return prisma.user.findUnique({ where: { id: args.id } });
    },

    commissionRate: async (_parent, args: { page?: number; limit?: number }, context) => {
      requireRole(context, ['ADMIN']);
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const [restaurant, totalCount] = await Promise.all([
        prisma.restaurant.findMany({ skip: (page - 1) * limit, take: limit }),
        prisma.restaurant.count(),
      ]);
      const totalPages = Math.max(1, Math.ceil(totalCount / limit));
      return {
        restaurant,
        currentPage: page,
        totalPages,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      };
    },

    getRestaurantDeliveryZoneInfo: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      const restaurant = await prisma.restaurant.findUnique({ where: { id: args.id } });
      if (!restaurant) throw notFoundError('Restaurant not found');
      return {
        boundType: restaurant.boundType,
        deliveryBounds: restaurant.deliveryBounds ? { coordinates: restaurant.deliveryBounds } : null,
        location:
          restaurant.latitude != null && restaurant.longitude != null
            ? { coordinates: [restaurant.longitude, restaurant.latitude] }
            : null,
        circleBounds: restaurant.circleBounds,
        address: restaurant.address,
        city: restaurant.city,
        postCode: restaurant.postCode,
      };
    },

    getClonedRestaurants: () => prisma.restaurant.findMany({ where: { clonedFromId: { not: null } } }),
    getClonedRestaurantsPaginated: async (_parent, args: { page?: number; limit?: number; search?: string }) => {
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where = {
        clonedFromId: { not: null },
        ...(args.search ? { name: { contains: args.search } } : {}),
      };
      const [data, totalCount] = await Promise.all([
        prisma.restaurant.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.restaurant.count({ where }),
      ]);
      return { data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) };
    },
  },

  Mutation: {
    restaurantLogin: async (_parent, args: { username: string; password: string; notificationToken?: string }) => {
      const restaurant = await prisma.restaurant.findUnique({ where: { username: args.username } });
      if (!restaurant?.password || !(await comparePassword(args.password, restaurant.password))) {
        throw userInputError('Invalid username or password');
      }
      if (!restaurant.isActive) {
        throw userInputError('This restaurant account is inactive');
      }

      const owner = await prisma.user.findUnique({ where: { id: restaurant.ownerId } });
      if (!owner) throw notFoundError('Restaurant owner not found');

      if (args.notificationToken) {
        await prisma.user.update({ where: { id: owner.id }, data: { notificationToken: args.notificationToken } });
      }

      const { token } = signAccessToken({ userId: owner.id, userType: owner.userType, tokenVersion: owner.tokenVersion });
      return { token, restaurantId: restaurant.id };
    },

    toggleStoreAvailability: async (_parent, args: { restaurantId: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const existing = await prisma.restaurant.findUnique({ where: { id: args.restaurantId } });
      if (!existing) throw notFoundError('Restaurant not found');
      assertOwnsRestaurant(currentUser, existing);
      return prisma.restaurant.update({ where: { id: existing.id }, data: { isAvailable: !existing.isAvailable } });
    },

    createRestaurant: async (_parent, args: { restaurant: RestaurantInputArgs; owner: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      if (currentUser.userType === 'VENDOR' && args.owner !== currentUser.id) {
        throw forbiddenError();
      }
      const owner = await prisma.user.findUnique({ where: { id: args.owner } });
      if (!owner) throw userInputError('Owner not found');

      const input = args.restaurant;
      const cuisineIds = await resolveCuisineIds(input.cuisines);
      const config = await prisma.configuration.findFirst();
      // A new store inherits the platform default commission unless the form
      // set an explicit rate. `Restaurant.commissionRate` otherwise defaults to
      // 0, which silently means "the platform earns nothing from this store".
      const commissionRate =
        input.commissionRate != null ? input.commissionRate : (config?.defaultCommissionRate ?? 20);

      // A store an admin creates is live immediately; one a vendor self-onboards
      // waits in the approval queue and stays hidden from customers until then.
      const adminCreated = currentUser.userType === 'ADMIN';

      const restaurant = await prisma.restaurant.create({
        data: {
          name: input.name,
          address: input.address,
          phone: input.phone,
          image: input.image,
          logo: input.logo,
          deliveryTime: input.deliveryTime ?? 30,
          minimumOrder: input.minimumOrder ?? 0,
          username: input.username,
          password: input.password ? await hashPassword(input.password) : undefined,
          shopTypeId: await resolveShopTypeId(input.shopType),
          tax: input.salesTax ?? 0,
          commissionRate,
          latitude: input.latitude,
          longitude: input.longitude,
          slug: slugify(input.name),
          orderPrefix: input.name.slice(0, 3).toUpperCase(),
          ownerId: owner.id,
          approvalStatus: adminCreated ? 'APPROVED' : 'PENDING',
          approvedAt: adminCreated ? new Date() : null,
          approvedById: adminCreated ? currentUser.id : null,
          cuisines: { create: cuisineIds.map((cuisineId) => ({ cuisineId })) },
        },
      });

      if (owner.userType !== 'ADMIN') {
        await prisma.user.update({ where: { id: owner.id }, data: { userType: 'VENDOR' } });
      }

      await recordAudit(context, {
        action: 'store.create',
        targetType: 'Restaurant',
        targetId: restaurant.id,
        summary: `Store created: ${restaurant.name} (commission ${commissionRate}%, ${restaurant.approvalStatus})`,
      });
      return restaurant;
    },

    setStoreApproval: async (
      _parent,
      args: { id: string; status: string; note?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN']);
      if (!STORE_APPROVAL_STATUSES.includes(args.status)) {
        throw userInputError(`status must be one of ${STORE_APPROVAL_STATUSES.join(', ')}`);
      }
      const existing = await prisma.restaurant.findUnique({ where: { id: args.id } });
      if (!existing) throw notFoundError('Restaurant not found');

      const approved = args.status === 'APPROVED';
      const updated = await prisma.restaurant.update({
        where: { id: args.id },
        data: {
          approvalStatus: args.status,
          approvalNote: args.note ?? null,
          approvedAt: approved ? new Date() : existing.approvedAt,
          approvedById: approved ? currentUser.id : existing.approvedById,
          // A rejected or suspended store must also drop out of every live list.
          isActive: args.status === 'REJECTED' || args.status === 'SUSPENDED' ? false : existing.isActive,
        },
      });

      await recordAudit(context, {
        action: 'store.approval',
        targetType: 'Restaurant',
        targetId: updated.id,
        summary: `Store ${existing.name}: ${existing.approvalStatus} → ${args.status}`,
        changes: { note: args.note ?? null },
      });
      return updated;
    },

    editRestaurant: async (_parent, args: { restaurant: RestaurantProfileInputArgs }, context) => {
      const currentUser = requireAuth(context);
      const existing = await prisma.restaurant.findUnique({ where: { id: args.restaurant._id } });
      if (!existing) throw notFoundError('Restaurant not found');
      assertOwnsRestaurant(currentUser, existing);

      const input = args.restaurant;
      const cuisineIds = input.cuisines ? await resolveCuisineIds(input.cuisines) : undefined;

      return prisma.restaurant.update({
        where: { id: input._id },
        data: {
          name: input.name,
          address: input.address,
          phone: input.phone,
          image: input.image,
          logo: input.logo,
          deliveryTime: input.deliveryTime,
          minimumOrder: input.minimumOrder,
          username: input.username,
          password: input.password ? await hashPassword(input.password) : undefined,
          shopTypeId: input.shopType ? await resolveShopTypeId(input.shopType) : undefined,
          tax: input.salesTax,
          orderPrefix: input.orderPrefix,
          isAvailable: input.isAvailable,
          latitude: input.latitude,
          longitude: input.longitude,
          ...(cuisineIds
            ? { cuisines: { deleteMany: {}, create: cuisineIds.map((cuisineId) => ({ cuisineId })) } }
            : {}),
        },
      });
    },

    deleteRestaurant: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      const updated = await prisma.restaurant.update({ where: { id: args.id }, data: { isActive: false } });
      await recordAudit(context, {
        action: 'store.deactivate',
        targetType: 'Restaurant',
        targetId: args.id,
        summary: `Store deactivated: ${updated.name}`,
      });
      return updated;
    },

    hardDeleteRestaurant: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      await prisma.restaurant.delete({ where: { id: args.id } });
      return true;
    },

    duplicateRestaurant: async (_parent, args: { id: string; owner: string }, context) => {
      requireRole(context, ['ADMIN']);
      const source = await prisma.restaurant.findUnique({ where: { id: args.id }, include: { cuisines: true } });
      if (!source) throw notFoundError('Restaurant not found');
      const owner = await prisma.user.findUnique({ where: { id: args.owner } });
      if (!owner) throw userInputError('Owner not found');

      return prisma.restaurant.create({
        data: {
          name: `${source.name} (Copy)`,
          image: source.image,
          logo: source.logo,
          address: source.address,
          phone: source.phone,
          deliveryTime: source.deliveryTime,
          minimumOrder: source.minimumOrder,
          tax: source.tax,
          latitude: source.latitude,
          longitude: source.longitude,
          shopTypeId: source.shopTypeId,
          slug: slugify(source.name),
          orderPrefix: source.orderPrefix,
          ownerId: owner.id,
          clonedFromId: source.id,
          cuisines: { create: source.cuisines.map((c) => ({ cuisineId: c.cuisineId })) },
        },
      });
    },

    updateCommission: async (_parent, args: { id: string; commissionRate: number }, context) => {
      requireRole(context, ['ADMIN']);
      const before = await prisma.restaurant.findUnique({ where: { id: args.id } });
      const updated = await prisma.restaurant.update({
        where: { id: args.id },
        data: { commissionRate: args.commissionRate },
      });
      await recordAudit(context, {
        action: 'commission.rate.update',
        targetType: 'Restaurant',
        targetId: args.id,
        summary: `Commission rate ${before?.commissionRate ?? '?'}% → ${args.commissionRate}% for ${updated.name}`,
        changes: { commissionRate: [before?.commissionRate ?? null, args.commissionRate] },
      });
      return updated;
    },

    updateDeliveryOptions: async (
      _parent,
      args: { restId: string; pickup: boolean; delivery: boolean },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const restaurant = await prisma.restaurant.findUnique({ where: { id: args.restId } });
      if (!restaurant) throw notFoundError('Restaurant not found');
      assertOwnsRestaurant(currentUser, restaurant);
      const updated = await prisma.restaurant.update({
        where: { id: args.restId },
        data: { pickup: args.pickup, delivery: args.delivery },
      });
      return { deliveryOptions: { pickup: updated.pickup, delivery: updated.delivery } };
    },

    updateTimings: async (
      _parent,
      args: { id: string; openingTimes?: { day?: string; times?: { startTime?: string[]; endTime?: string[] }[] }[] },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const restaurant = await prisma.restaurant.findUnique({ where: { id: args.id } });
      if (!restaurant) throw notFoundError('Restaurant not found');
      assertOwnsRestaurant(currentUser, restaurant);
      return prisma.restaurant.update({
        where: { id: args.id },
        data: { openingTimes: args.openingTimes ?? [] },
      });
    },

    updateDeliveryBoundsAndLocation: async (
      _parent,
      args: {
        id: string;
        boundType: string;
        bounds?: number[][][];
        circleBounds?: { radius: number };
        location: { latitude: number; longitude: number };
        address?: string;
        postCode?: string;
        city?: string;
      },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const restaurant = await prisma.restaurant.findUnique({ where: { id: args.id } });
      if (!restaurant) throw notFoundError('Restaurant not found');
      assertOwnsRestaurant(currentUser, restaurant);

      // The delivery radius (km) drawn here is the single source of truth for
      // "does this store deliver there?" — serviceability, the storefront range
      // banner and order placement all read `deliveryDistance`. Keep it in sync
      // with the circle the vendor set so the map and the rules never disagree.
      const radiusKm = args.circleBounds?.radius;
      const data = await prisma.restaurant.update({
        where: { id: args.id },
        data: {
          boundType: args.boundType,
          deliveryBounds: args.bounds ?? undefined,
          circleBounds: args.circleBounds ?? undefined,
          ...(radiusKm && radiusKm > 0 ? { deliveryDistance: radiusKm } : {}),
          latitude: args.location.latitude,
          longitude: args.location.longitude,
          address: args.address,
          postCode: args.postCode,
          city: args.city,
        },
      });
      return { success: true, message: 'Delivery bounds updated', data };
    },

    updateRestaurantDelivery: async (
      _parent,
      args: { id: string; minDeliveryFee?: number; deliveryDistance?: number; deliveryFee?: number },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const restaurant = await prisma.restaurant.findUnique({ where: { id: args.id } });
      if (!restaurant) throw notFoundError('Restaurant not found');
      assertOwnsRestaurant(currentUser, restaurant);

      const data = await prisma.restaurant.update({
        where: { id: args.id },
        data: {
          minDeliveryFee: args.minDeliveryFee,
          deliveryDistance: args.deliveryDistance,
          deliveryFee: args.deliveryFee,
        },
      });
      return { success: true, message: 'Delivery settings updated', data };
    },

    updateRestaurantBussinessDetails: async (
      _parent,
      args: { id: string; bussinessDetails?: Record<string, unknown> },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const restaurant = await prisma.restaurant.findUnique({ where: { id: args.id } });
      if (!restaurant) throw notFoundError('Restaurant not found');
      assertOwnsRestaurant(currentUser, restaurant);

      const data = await prisma.restaurant.update({
        where: { id: args.id },
        data: { bussinessDetails: (args.bussinessDetails ?? undefined) as Prisma.InputJsonValue | undefined },
      });
      return { success: true, message: 'Business details updated', data };
    },

    saveRestaurantToken: async (_parent, args: { token?: string; isEnabled?: boolean }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          notificationToken: args.token ?? currentUser.notificationToken,
          isOrderNotification: args.isEnabled ?? currentUser.isOrderNotification,
        },
      });
      const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: currentUser.id } });
      if (!restaurant) throw notFoundError('Restaurant not found');
      return restaurant;
    },
  },

  Restaurant: {
    _id: (parent: Restaurant) => parent.id,
    unique_restaurant_id: (parent: Restaurant) => parent.id,
    approvalStatus: (parent: Restaurant) => parent.approvalStatus ?? 'APPROVED',
    approvalNote: (parent: Restaurant) => parent.approvalNote ?? null,
    approvedAt: (parent: Restaurant) => parent.approvedAt?.toISOString() ?? null,
    location: (parent: Restaurant) =>
      parent.latitude != null && parent.longitude != null
        ? { coordinates: [parent.longitude, parent.latitude] }
        : null,
    owner: (parent: Restaurant) => prisma.user.findUnique({ where: { id: parent.ownerId } }),
    shopType: async (parent: Restaurant) => {
      if (!parent.shopTypeId) return null;
      const shopType = await prisma.shopType.findUnique({ where: { id: parent.shopTypeId } });
      return shopType?.slug ?? null;
    },
    cuisines: async (parent: Restaurant) => {
      const links = await prisma.restaurantCuisine.findMany({
        where: { restaurantId: parent.id },
        include: { cuisine: true },
      });
      return links.map((l) => l.cuisine.name);
    },
    categories: (parent: Restaurant) => prisma.category.findMany({ where: { restaurantId: parent.id } }),
    addons: (parent: Restaurant) =>
      prisma.addon.findMany({ where: { restaurantId: parent.id }, include: { options: true } }),
    options: async (parent: Restaurant) => {
      const addons = await prisma.addon.findMany({ where: { restaurantId: parent.id }, include: { options: true } });
      return addons.flatMap((a) => a.options);
    },
    openingTimes: (parent: Restaurant) => (Array.isArray(parent.openingTimes) ? parent.openingTimes : []),
    bussinessDetails: (parent: Restaurant) => parent.bussinessDetails ?? null,
    hasBusinessDetails: (parent: Restaurant) => Boolean(parent.bussinessDetails),
    deliveryBounds: (parent: Restaurant) => (parent.deliveryBounds ? { coordinates: parent.deliveryBounds } : null),
    deliveryInfo: (parent: Restaurant) => ({
      minDeliveryFee: parent.minDeliveryFee,
      deliveryDistance: parent.deliveryDistance,
      deliveryFee: parent.deliveryFee,
    }),
    notificationToken: async (parent: Restaurant) => {
      const owner = await prisma.user.findUnique({ where: { id: parent.ownerId } });
      return owner?.notificationToken ?? null;
    },
    enableNotification: async (parent: Restaurant) => {
      const owner = await prisma.user.findUnique({ where: { id: parent.ownerId } });
      return owner?.isOrderNotification ?? true;
    },
    reviewCount: (parent: Restaurant) => prisma.review.count({ where: { restaurantId: parent.id } }),
    restaurantUrl: (parent: Restaurant) => (parent.slug ? `/restaurant/${parent.slug}` : null),
    zone: async (parent: Restaurant) => {
      if (parent.latitude == null || parent.longitude == null) return null;
      const zones = await prisma.zone.findMany({ where: { isActive: true } });
      const point: [number, number] = [parent.longitude, parent.latitude];
      for (const zone of zones) {
        const ring = (zone.boundary as unknown as [number, number][][] | null)?.[0];
        if (ring && pointInPolygon(point, ring)) return zone;
      }
      return null;
    },
  },

  CommissionRateLite: {
    _id: (parent: Restaurant) => parent.id,
    unique_restaurant_id: (parent: Restaurant) => parent.id,
  },

  RestaurantCarouselPreview: {
    _id: (parent: Restaurant) => parent.id,
    location: (parent: Restaurant) =>
      parent.latitude != null && parent.longitude != null
        ? { coordinates: [parent.longitude, parent.latitude] }
        : null,
    shopType: async (parent: Restaurant) => {
      if (!parent.shopTypeId) return null;
      const shopType = await prisma.shopType.findUnique({ where: { id: parent.shopTypeId } });
      return shopType?.slug ?? null;
    },
    slug: (parent: Restaurant) => parent.slug,
    isActive: (parent: Restaurant) => parent.isActive,
    openingTimes: (parent: Restaurant) => (Array.isArray(parent.openingTimes) ? parent.openingTimes : []),
    cuisines: async (parent: Restaurant) => {
      const links = await prisma.restaurantCuisine.findMany({
        where: { restaurantId: parent.id },
        include: { cuisine: true },
      });
      return links.map((l) => l.cuisine.name);
    },
    // Legacy customer-app field (badge chips). No tags model on this API yet.
    tags: () => [],
    reviewCount: (parent: Restaurant) => prisma.review.count({ where: { restaurantId: parent.id } }),
  },

  Vendor: {
    _id: (parent: { id: string }) => parent.id,
    unique_id: (parent: { id: string }) => parent.id,
    restaurants: (parent: { id: string }) => prisma.restaurant.findMany({ where: { ownerId: parent.id } }),
  },

  Owner: {
    _id: (parent: { id: string }) => parent.id,
  },
};
