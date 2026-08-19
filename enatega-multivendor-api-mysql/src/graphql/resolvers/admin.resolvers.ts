import { IResolvers } from '@graphql-tools/utils';
import { User } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { comparePassword, hashPassword, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../services/auth.service';
import { forbiddenError, notFoundError, userInputError } from '../../utils/errors';

const OWNER_ROLES = ['ADMIN', 'VENDOR', 'STAFF'] as const;

function permissionsFor(user: User): string[] {
  if (user.userType === 'STAFF' && Array.isArray(user.permissions)) return user.permissions as string[];
  return user.userType === 'ADMIN' ? ['ALL'] : ['MANAGE_OWN_RESTAURANT'];
}

async function ownerAuthPayload(user: User) {
  const { token, expiresAt } = signAccessToken({
    userId: user.id,
    userType: user.userType,
    tokenVersion: user.tokenVersion,
  });
  const { token: refreshToken, expiresAt: refreshExpiresAt } = signRefreshToken({
    userId: user.id,
    userType: user.userType,
    tokenVersion: user.tokenVersion,
  });
  const restaurants = await prisma.restaurant.findMany({ where: { ownerId: user.id } });
  return {
    userId: user.id,
    token,
    tokenExpiration: expiresAt,
    refreshToken,
    refreshTokenExpiration: refreshExpiresAt,
    email: user.email,
    userType: user.userType,
    name: user.name,
    image: user.image,
    permissions: permissionsFor(user),
    userTypeId: user.userType,
    restaurants,
    isActive: user.isActive,
  };
}

interface VendorInputArgs {
  _id?: string;
  name?: string;
  email: string;
  image?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  password?: string;
}

export const adminResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    ownerSession: async (_parent, _args, context) => {
      if (!context.user || !OWNER_ROLES.includes(context.user.userType as (typeof OWNER_ROLES)[number])) {
        return null;
      }
      return ownerAuthPayload(context.user);
    },
    hasOwnerPermission: (_parent, _args, context) => {
      const user = requireRole(context, ['ADMIN', 'VENDOR']);
      return Boolean(user);
    },

    vendors: async (_parent, _args, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.user.findMany({ where: { userType: 'VENDOR' } });
    },
    getVendor: async (_parent, args: { id: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      if (currentUser.userType === 'VENDOR' && args.id !== currentUser.id) {
        throw forbiddenError();
      }
      const vendor = await prisma.user.findUnique({ where: { id: args.id } });
      if (!vendor) throw notFoundError('Vendor not found');
      return vendor;
    },

    users: async (_parent, _args, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.user.findMany({ where: { userType: 'CUSTOMER' } });
    },
    usersPaginated: async (_parent, args: { page?: number; limit?: number; search?: string }, context) => {
      requireRole(context, ['ADMIN']);
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where = {
        userType: 'CUSTOMER' as const,
        ...(args.search
          ? {
              OR: [
                { name: { contains: args.search } },
                { email: { contains: args.search } },
                { phone: { contains: args.search } },
              ],
            }
          : {}),
      };
      const [data, totalCount] = await Promise.all([
        prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.user.count({ where }),
      ]);
      return { data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) };
    },
    user: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.user.findUnique({ where: { id: args.id } });
    },

    getDashboardUsers: async (_parent, _args, context) => {
      requireRole(context, ['ADMIN']);
      const [usersCount, vendorsCount, restaurantsCount, ridersCount] = await Promise.all([
        prisma.user.count({ where: { userType: 'CUSTOMER' } }),
        prisma.user.count({ where: { userType: 'VENDOR' } }),
        prisma.restaurant.count(),
        prisma.user.count({ where: { userType: 'RIDER' } }),
      ]);
      return { usersCount, vendorsCount, restaurantsCount, ridersCount };
    },

    webNotifications: (_parent, _args, context) => {
      requireRole(context, ['ADMIN', 'STAFF', 'VENDOR']);
      return [];
    },
  },

  Mutation: {
    markWebNotificationsAsRead: (_parent, _args, context) => {
      requireRole(context, ['ADMIN', 'STAFF', 'VENDOR']);
      return [];
    },

    ownerLogin: async (_parent, args: { email: string; password: string }) => {
      const user = await prisma.user.findUnique({ where: { email: args.email } });
      if (!user || !OWNER_ROLES.includes(user.userType as (typeof OWNER_ROLES)[number])) {
        throw userInputError('Invalid email or password');
      }
      if (!user.password || !(await comparePassword(args.password, user.password))) {
        throw userInputError('Invalid email or password');
      }
      return ownerAuthPayload(user);
    },

    refreshToken: async (_parent, args: { refreshToken: string; userType: string }) => {
      const payload = verifyRefreshToken(args.refreshToken);
      if (!payload) throw userInputError('Invalid or expired refresh token');
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) throw userInputError('User not found');
      return ownerAuthPayload(user);
    },

    createVendor: async (_parent, args: { vendorInput: VendorInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      const input = args.vendorInput;
      const existing = await prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw userInputError('Email is already registered');
      return prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          image: input.image,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phoneNumber,
          password: input.password ? await hashPassword(input.password) : undefined,
          userType: 'VENDOR',
        },
      });
    },
    editVendor: async (_parent, args: { vendorInput: VendorInputArgs }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const input = args.vendorInput;
      if (!input._id) throw notFoundError('Vendor _id is required to edit');
      if (currentUser.userType === 'VENDOR' && input._id !== currentUser.id) {
        throw forbiddenError();
      }
      return prisma.user.update({
        where: { id: input._id },
        data: {
          email: input.email,
          name: input.name,
          image: input.image,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phoneNumber,
          password: input.password ? await hashPassword(input.password) : undefined,
        },
      });
    },
    deleteVendor: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      await prisma.user.delete({ where: { id: args.id } });
      return true;
    },

    updateUserStatus: async (_parent, args: { id: string; status: string; reason?: string }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.user.update({
        where: { id: args.id },
        data: { status: args.status, isActive: args.status === 'ACTIVE', notes: args.reason },
      });
    },
    updateUserNotes: async (_parent, args: { id: string; notes: string }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.user.update({ where: { id: args.id }, data: { notes: args.notes } });
    },
    deleteUser: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.user.delete({ where: { id: args.id } });
    },

    resetUserSession: async (_parent, args: { userId: string }, context) => {
      requireRole(context, ['ADMIN']);
      const user = await prisma.user.update({
        where: { id: args.userId },
        data: { tokenVersion: { increment: 1 } },
      });
      return { _id: user.id };
    },

    // Not a real business feature: the frontend layers a secondary nonce/token
    // handshake (`bop-auth` header) on top of normal JWT auth. The admin app
    // already works without validating it, so this just returns a stable
    // placeholder response instead of implementing that second auth factor.
    metricsGeneral: () => ({
      excellence: 'ok',
      topgun: 'ok',
      experience: 'stub-token',
      skydiver: 'ok',
      rider: 'ok',
      haha: 'ok',
      hehe: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      huhu: 'ok',
      yoyo: 'ok',
      turu: 'ok',
    }),
  },

  AdminUser: {
    _id: (parent: User) => parent.id,
    addresses: (parent: User) => prisma.address.findMany({ where: { userId: parent.id } }),
  },
};
