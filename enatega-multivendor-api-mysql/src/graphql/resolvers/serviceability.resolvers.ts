import { IResolvers } from '@graphql-tools/utils';
import { Prisma, WaitlistEntry } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { userInputError } from '../../utils/errors';
import { distanceKm } from '../../utils/geo';

// Fallback delivery reach (km) for a store that has not set its own
// `deliveryDistance`. Matches the default radius used by `withinRadius` in
// restaurant.resolvers.ts and the web restaurant out-of-range banner.
const DEFAULT_DELIVERY_RADIUS_KM = 60;

interface JoinWaitlistArgs {
  input: {
    email?: string | null;
    phone?: string | null;
    latitude: number;
    longitude: number;
    areaLabel?: string | null;
    source?: string | null;
  };
}

export const serviceabilityResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    serviceability: async (_parent, args: { latitude: number; longitude: number }) => {
      const { latitude, longitude } = args;
      const stores = await prisma.restaurant.findMany({
        where: { isActive: true },
        select: { name: true, city: true, latitude: true, longitude: true, deliveryDistance: true },
      });

      let coveringCount = 0;
      let nearest: { area: string; dist: number } | null = null;

      for (const s of stores) {
        if (s.latitude == null || s.longitude == null) continue;
        const dist = distanceKm(latitude, longitude, s.latitude, s.longitude);
        const reach = s.deliveryDistance && s.deliveryDistance > 0 ? s.deliveryDistance : DEFAULT_DELIVERY_RADIUS_KM;
        if (dist <= reach) coveringCount += 1;
        if (!nearest || dist < nearest.dist) {
          nearest = { area: s.city || s.name, dist };
        }
      }

      return {
        serviceable: coveringCount > 0,
        storeCount: coveringCount,
        nearestArea: nearest?.area ?? null,
        nearestDistanceKm: nearest ? Math.round(nearest.dist * 10) / 10 : null,
      };
    },

    waitlistEntries: async (
      _parent,
      args: { page?: number; limit?: number; search?: string },
      context,
    ) => {
      requireRole(context, ['ADMIN']);
      const page = args.page && args.page > 0 ? args.page : 1;
      const limit = args.limit && args.limit > 0 ? args.limit : 25;
      const search = args.search?.trim();

      const where: Prisma.WaitlistEntryWhereInput = search
        ? {
            OR: [
              { email: { contains: search } },
              { phone: { contains: search } },
              { areaLabel: { contains: search } },
            ],
          }
        : {};

      const [entries, total] = await Promise.all([
        prisma.waitlistEntry.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.waitlistEntry.count({ where }),
      ]);

      return { entries, total };
    },
  },

  Mutation: {
    joinWaitlist: async (_parent, args: JoinWaitlistArgs) => {
      const { email, phone, latitude, longitude, areaLabel, source } = args.input;
      const cleanEmail = email?.trim() || null;
      const cleanPhone = phone?.trim() || null;
      if (!cleanEmail && !cleanPhone) {
        throw userInputError('An email or phone number is required to join the waitlist.');
      }

      // De-dupe: same contact + roughly the same spot in the last 30 days is a no-op.
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const round3 = (n: number) => Math.round(n * 1000) / 1000;
      const existing = await prisma.waitlistEntry.findFirst({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          latitude: { gte: round3(latitude) - 0.001, lte: round3(latitude) + 0.001 },
          longitude: { gte: round3(longitude) - 0.001, lte: round3(longitude) + 0.001 },
          OR: [
            ...(cleanEmail ? [{ email: cleanEmail }] : []),
            ...(cleanPhone ? [{ phone: cleanPhone }] : []),
          ],
        },
      });
      if (existing) return true;

      await prisma.waitlistEntry.create({
        data: {
          email: cleanEmail,
          phone: cleanPhone,
          latitude,
          longitude,
          areaLabel: areaLabel?.trim() || null,
          source: source?.trim() || 'web',
        },
      });
      return true;
    },

    markWaitlistNotified: async (
      _parent,
      args: { id: string; notified: boolean },
      context,
    ) => {
      requireRole(context, ['ADMIN']);
      return prisma.waitlistEntry.update({
        where: { id: args.id },
        data: { notified: args.notified },
      });
    },
  },

  WaitlistEntry: {
    _id: (parent: WaitlistEntry) => parent.id,
    createdAt: (parent: WaitlistEntry) => parent.createdAt.toISOString(),
  },
};
