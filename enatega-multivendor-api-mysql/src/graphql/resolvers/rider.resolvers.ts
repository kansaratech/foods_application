import { IResolvers } from '@graphql-tools/utils';
import { Prisma, RiderProfile, User, Zone } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { comparePassword, hashPassword, signAccessToken } from '../../services/auth.service';
import { forbiddenError, notFoundError, userInputError } from '../../utils/errors';
import { pubsub, TOPICS } from '../../utils/pubsub';

type RiderParent = User & { riderProfile: (RiderProfile & { zone: Zone | null }) | null };

const RIDER_INCLUDE = { riderProfile: { include: { zone: true } } } satisfies Prisma.UserInclude;

interface RiderInputArgs {
  _id?: string;
  name: string;
  username?: string;
  phone?: string;
  zone?: string;
  vehicleType?: string;
  available?: boolean;
  password?: string;
}

async function loadRiderProfile(userId: string) {
  return prisma.riderProfile.findUnique({ where: { userId }, include: { zone: true } });
}

export const riderResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    riders: (_parent, _args, context) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      return prisma.user.findMany({ where: { userType: 'RIDER' }, include: RIDER_INCLUDE });
    },
    ridersPaginated: async (
      _parent,
      args: { page?: number; limit?: number; search?: string; zone?: string; available?: boolean; isActive?: boolean },
      context,
    ) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where: Prisma.UserWhereInput = {
        userType: 'RIDER',
        ...(args.search ? { name: { contains: args.search } } : {}),
        ...(args.isActive != null ? { isActive: args.isActive } : {}),
        ...(args.zone || args.available != null
          ? {
              riderProfile: {
                ...(args.zone ? { zoneId: args.zone } : {}),
                ...(args.available != null ? { available: args.available } : {}),
              },
            }
          : {}),
      };
      const [data, totalCount] = await Promise.all([
        prisma.user.findMany({ where, include: RIDER_INCLUDE, skip: (page - 1) * limit, take: limit }),
        prisma.user.count({ where }),
      ]);
      return { data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) };
    },
    rider: (_parent, args: { id: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR', 'RIDER']);
      // A rider may only read their own profile (the rider app's RIDER_PROFILE query).
      if (currentUser.userType === 'RIDER' && currentUser.id !== args.id) throw forbiddenError();
      return prisma.user.findFirst({ where: { id: args.id, userType: 'RIDER' }, include: RIDER_INCLUDE });
    },
    availableRiders: (_parent, _args, context) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      return prisma.user.findMany({
        where: { userType: 'RIDER', isActive: true, riderProfile: { available: true } },
        include: RIDER_INCLUDE,
      });
    },
    ridersByZone: (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      return prisma.user.findMany({
        where: { userType: 'RIDER', riderProfile: { zoneId: args.id } },
        include: RIDER_INCLUDE,
      });
    },
  },

  Mutation: {
    riderLogin: async (
      _parent,
      args: { username?: string; password?: string; notificationToken?: string; timeZone: string },
    ) => {
      if (!args.username || !args.password) throw userInputError('username and password are required');
      const user = await prisma.user.findFirst({ where: { username: args.username, userType: 'RIDER' } });
      if (!user || !user.password || !(await comparePassword(args.password, user.password))) {
        throw userInputError('Invalid username or password');
      }
      if (args.notificationToken) {
        await prisma.user.update({ where: { id: user.id }, data: { notificationToken: args.notificationToken } });
      }
      const { token, expiresAt } = signAccessToken({ userId: user.id, userType: user.userType, tokenVersion: user.tokenVersion });
      return {
        userId: user.id,
        token,
        tokenExpiration: expiresAt,
        isActive: user.isActive,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isNewUser: false,
      };
    },

    createRider: async (_parent, args: { riderInput: RiderInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      const input = args.riderInput;
      return prisma.user.create({
        data: {
          name: input.name,
          username: input.username,
          phone: input.phone,
          password: input.password ? await hashPassword(input.password) : undefined,
          userType: 'RIDER',
          riderProfile: {
            create: {
              vehicleType: input.vehicleType,
              available: input.available ?? true,
              zoneId: input.zone || undefined,
            },
          },
        },
        include: RIDER_INCLUDE,
      });
    },

    editRider: async (_parent, args: { riderInput: RiderInputArgs }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'RIDER']);
      const input = args.riderInput;
      if (!input._id) throw notFoundError('Rider _id is required to edit');
      if (currentUser.userType === 'RIDER' && currentUser.id !== input._id) throw forbiddenError();

      await prisma.user.update({
        where: { id: input._id },
        data: {
          name: input.name,
          username: input.username,
          phone: input.phone,
          password: input.password ? await hashPassword(input.password) : undefined,
        },
      });
      await prisma.riderProfile.upsert({
        where: { userId: input._id },
        create: {
          userId: input._id,
          vehicleType: input.vehicleType,
          available: input.available ?? true,
          zoneId: input.zone || undefined,
        },
        update: {
          vehicleType: input.vehicleType,
          available: input.available,
          zoneId: input.zone || undefined,
        },
      });
      await pubsub.publish('RIDER_UPDATED', { riderUpdated: { _id: input._id } });
      return prisma.user.findUnique({ where: { id: input._id }, include: RIDER_INCLUDE });
    },

    deleteRider: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.user.delete({ where: { id: args.id }, include: RIDER_INCLUDE });
    },

    toggleAvailablity: async (_parent, args: { id: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR', 'RIDER']);
      // A rider may only toggle their own availability (the rider app's switch).
      if (currentUser.userType === 'RIDER' && currentUser.id !== args.id) throw forbiddenError();
      const profile = await loadRiderProfile(args.id);
      if (!profile) throw notFoundError('Rider not found');
      await prisma.riderProfile.update({ where: { userId: args.id }, data: { available: !profile.available } });
      await pubsub.publish('RIDER_UPDATED', { riderUpdated: { _id: args.id } });
      return prisma.user.findUnique({ where: { id: args.id }, include: RIDER_INCLUDE });
    },

    updateRiderLocation: async (_parent, args: { latitude: string; longitude: string }, context) => {
      const currentUser = requireRole(context, ['RIDER']);
      await prisma.riderProfile.update({
        where: { userId: currentUser.id },
        data: { latitude: Number(args.latitude), longitude: Number(args.longitude) },
      });
      const updated = await prisma.user.findUnique({ where: { id: currentUser.id }, include: RIDER_INCLUDE });
      await pubsub.publish(TOPICS.SUBSCRIPTION_RIDER_LOCATION(currentUser.id), { subscriptionRiderLocation: updated });
      return updated;
    },

    updateRiderLicenseDetails: async (
      _parent,
      args: { id: string; licenseDetails?: Prisma.InputJsonValue },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'RIDER']);
      if (currentUser.userType === 'RIDER' && currentUser.id !== args.id) throw forbiddenError();
      await prisma.riderProfile.upsert({
        where: { userId: args.id },
        create: { userId: args.id, licenseDetails: args.licenseDetails ?? undefined },
        update: { licenseDetails: args.licenseDetails ?? undefined },
      });
      return prisma.user.findUnique({ where: { id: args.id }, include: RIDER_INCLUDE });
    },

    updateRiderVehicleDetails: async (
      _parent,
      args: { id: string; vehicleDetails?: Prisma.InputJsonValue },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'RIDER']);
      if (currentUser.userType === 'RIDER' && currentUser.id !== args.id) throw forbiddenError();
      await prisma.riderProfile.upsert({
        where: { userId: args.id },
        create: { userId: args.id, vehicleDetails: args.vehicleDetails ?? undefined },
        update: { vehicleDetails: args.vehicleDetails ?? undefined },
      });
      return prisma.user.findUnique({ where: { id: args.id }, include: RIDER_INCLUDE });
    },

    updateRiderBussinessDetails: async (
      _parent,
      args: { id: string; bussinessDetails?: Prisma.InputJsonValue },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'RIDER']);
      if (currentUser.userType === 'RIDER' && currentUser.id !== args.id) throw forbiddenError();
      await prisma.riderProfile.upsert({
        where: { userId: args.id },
        create: { userId: args.id, bussinessDetails: args.bussinessDetails ?? undefined },
        update: { bussinessDetails: args.bussinessDetails ?? undefined },
      });
      return prisma.user.findUnique({ where: { id: args.id }, include: RIDER_INCLUDE });
    },

    updateWorkSchedule: async (
      _parent,
      args: { riderId: string; workSchedule: Prisma.InputJsonValue; timeZone: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'RIDER']);
      if (currentUser.userType === 'RIDER' && currentUser.id !== args.riderId) throw forbiddenError();
      await prisma.riderProfile.upsert({
        where: { userId: args.riderId },
        create: { userId: args.riderId, workSchedule: args.workSchedule, timeZone: args.timeZone },
        update: { workSchedule: args.workSchedule, timeZone: args.timeZone },
      });
      return prisma.user.findUnique({ where: { id: args.riderId }, include: RIDER_INCLUDE });
    },
  },

  Subscription: {
    riderUpdated: {
      subscribe: () => pubsub.asyncIterableIterator('RIDER_UPDATED'),
    },
    subscriptionRiderLocation: {
      subscribe: (_parent, args: { riderId: string }) =>
        pubsub.asyncIterableIterator(TOPICS.SUBSCRIPTION_RIDER_LOCATION(args.riderId)),
    },
  },

  Rider: {
    _id: (parent: RiderParent) => parent.id,
    email: (parent: RiderParent) => parent.email,
    image: (parent: RiderParent) => parent.image,
    available: (parent: RiderParent) => parent.riderProfile?.available ?? null,
    vehicleType: (parent: RiderParent) => parent.riderProfile?.vehicleType ?? null,
    assigned: (parent: RiderParent) => (Array.isArray(parent.riderProfile?.assigned) ? parent.riderProfile?.assigned : []),
    zone: (parent: RiderParent) => parent.riderProfile?.zone ?? null,
    location: (parent: RiderParent) =>
      parent.riderProfile?.latitude != null && parent.riderProfile?.longitude != null
        ? { coordinates: [parent.riderProfile.longitude, parent.riderProfile.latitude] }
        : null,
    timeZone: (parent: RiderParent) => parent.riderProfile?.timeZone ?? null,
    workSchedule: (parent: RiderParent) => parent.riderProfile?.workSchedule ?? null,
    bussinessDetails: (parent: RiderParent) => parent.riderProfile?.bussinessDetails ?? null,
    accountNumber: (parent: RiderParent) => {
      const details = parent.riderProfile?.bussinessDetails as { accountNumber?: string } | null | undefined;
      return details?.accountNumber ?? null;
    },
    licenseDetails: (parent: RiderParent) => parent.riderProfile?.licenseDetails ?? null,
    vehicleDetails: (parent: RiderParent) => parent.riderProfile?.vehicleDetails ?? null,
    currentWalletAmount: (parent: RiderParent) => parent.riderProfile?.currentWalletAmount ?? 0,
    totalWalletAmount: (parent: RiderParent) => parent.riderProfile?.totalWalletAmount ?? 0,
    withdrawnWalletAmount: (parent: RiderParent) => parent.riderProfile?.withdrawnWalletAmount ?? 0,
  },
  ZoneLite: {
    _id: (parent: Zone) => parent.id,
  },
};
