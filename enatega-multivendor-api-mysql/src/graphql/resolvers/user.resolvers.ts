import { IResolvers } from '@graphql-tools/utils';
import { User, Address } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireAuth } from '../../middleware/auth';
import {
  comparePassword,
  generateOtp,
  hashPassword,
  signAccessToken,
} from '../../services/auth.service';
import { userInputError } from '../../utils/errors';

function favouriteList(user: User): string[] {
  return Array.isArray(user.favouriteRestaurantIds) ? (user.favouriteRestaurantIds as string[]) : [];
}

interface UserInputArgs {
  phone?: string;
  email?: string;
  password?: string;
  name?: string;
  notificationToken?: string;
  appleId?: string;
  emailIsVerified?: boolean;
  isPhoneExists?: boolean;
}

interface LoginArgs {
  email?: string;
  password?: string;
  type: string;
  appleId?: string;
  idToken?: string;
  name?: string;
  notificationToken?: string;
}

interface AddressInputArgs {
  _id?: string;
  label?: string;
  deliveryAddress?: string;
  details?: string;
  longitude?: string;
  latitude?: string;
}

export const userResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    profile: (_parent, _args, context) => requireAuth(context),
  },
  Mutation: {
    login: async (_parent, args: LoginArgs) => {
      // NOTE: social login (google/apple) trusts the client-supplied identifier
      // without verifying it against Google/Apple's servers. Harden this before
      // shipping to production (see backend README "Deferred" section).
      if (args.type === 'default') {
        if (!args.email || !args.password) {
          throw userInputError('email and password are required');
        }
        const user = await prisma.user.findUnique({ where: { email: args.email } });
        if (!user || !user.password || !(await comparePassword(args.password, user.password))) {
          throw userInputError('Invalid email or password');
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
      }

      if (!['apple', 'google', 'facebook'].includes(args.type)) {
        throw userInputError('Unsupported login type');
      }

      // google / apple: find-or-create by email (or appleId for apple)
      const where = args.type === 'apple' && args.appleId ? { appleId: args.appleId } : { email: args.email };
      let user = await prisma.user.findFirst({ where });
      let isNewUser = false;
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: args.email,
            name: args.name,
            appleId: args.appleId,
            emailIsVerified: true,
            notificationToken: args.notificationToken,
          },
        });
        isNewUser = true;
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
        isNewUser,
      };
    },

    createUser: async (_parent, args: { userInput: UserInputArgs }) => {
      const input = args.userInput;
      if (input.email) {
        const existing = await prisma.user.findUnique({ where: { email: input.email } });
        if (existing) throw userInputError('Email is already registered');
      }
      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          password: input.password ? await hashPassword(input.password) : undefined,
          notificationToken: input.notificationToken,
          appleId: input.appleId,
          emailIsVerified: input.emailIsVerified ?? false,
        },
      });
      const { token, expiresAt } = signAccessToken({ userId: user.id, userType: user.userType, tokenVersion: user.tokenVersion });
      return {
        userId: user.id,
        token,
        tokenExpiration: expiresAt,
        isActive: user.isActive,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isNewUser: true,
      };
    },

    updateUser: async (
      _parent,
      args: { updateUserInput: { name: string; phone?: string; phoneIsVerified?: boolean; emailIsVerified?: boolean } },
      context,
    ) => {
      const currentUser = requireAuth(context);
      return prisma.user.update({
        where: { id: currentUser.id },
        data: {
          name: args.updateUserInput.name,
          phone: args.updateUserInput.phone,
          phoneIsVerified: args.updateUserInput.phoneIsVerified,
          emailIsVerified: args.updateUserInput.emailIsVerified,
        },
      });
    },

    emailExist: async (_parent, args: { email: string }) => {
      const user = await prisma.user.findUnique({ where: { email: args.email } });
      return Boolean(user);
    },
    phoneExist: async (_parent, args: { phone: string }) => {
      const user = await prisma.user.findUnique({ where: { phone: args.phone } });
      return Boolean(user);
    },

    sendOtpToEmail: async (_parent, args: { email: string }) => {
      const otp = generateOtp();
      await prisma.user.updateMany({
        where: { email: args.email },
        data: { otpCode: otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      });
      // TODO: wire up a real email provider. Logged for local/dev testing only.
      console.log(`[dev] OTP for ${args.email}: ${otp}`);
      return { result: 'OTP sent' };
    },
    sendOtpToPhoneNumber: async (_parent, args: { phone: string }) => {
      const otp = generateOtp();
      await prisma.user.updateMany({
        where: { phone: args.phone },
        data: { otpCode: otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      });
      // TODO: wire up a real SMS provider (e.g. Twilio). Logged for local/dev testing only.
      console.log(`[dev] OTP for ${args.phone}: ${otp}`);
      return { result: 'OTP sent' };
    },
    verifyOtp: async (_parent, args: { otp: string; email?: string; phone?: string }) => {
      const where = args.email ? { email: args.email } : { phone: args.phone };
      const user = await prisma.user.findFirst({ where: where as { email: string } | { phone: string } });
      const config = await prisma.configuration.findFirst();
      const isTestOtp = config?.testOtp && config.testOtp === args.otp;

      if (!user) throw userInputError('User not found');
      if (!isTestOtp) {
        if (!user.otpCode || user.otpCode !== args.otp) throw userInputError('Invalid OTP');
        if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) throw userInputError('OTP has expired');
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpCode: null,
          otpExpiresAt: null,
          emailIsVerified: args.email ? true : user.emailIsVerified,
          phoneIsVerified: args.phone ? true : user.phoneIsVerified,
        },
      });
      return { result: 'OTP verified' };
    },

    forgotPassword: async (_parent, args: { email: string }) => {
      const otp = generateOtp();
      const updated = await prisma.user.updateMany({
        where: { email: args.email },
        data: { otpCode: otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      });
      if (updated.count === 0) throw userInputError('No account found with that email');
      console.log(`[dev] Password reset OTP for ${args.email}: ${otp}`);
      return { result: 'OTP sent' };
    },
    resetPassword: async (_parent, args: { password: string; email: string; otp: string }) => {
      const user = await prisma.user.findUnique({ where: { email: args.email } });
      if (!user || !user.otpCode || user.otpCode !== args.otp) throw userInputError('Invalid OTP');
      if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) throw userInputError('OTP has expired');
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(args.password), otpCode: null, otpExpiresAt: null },
      });
      return { result: 'Password reset' };
    },
    changePassword: async (_parent, args: { oldPassword: string; newPassword: string }, context) => {
      const currentUser = requireAuth(context);
      if (!currentUser.password || !(await comparePassword(args.oldPassword, currentUser.password))) {
        throw userInputError('Old password is incorrect');
      }
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { password: await hashPassword(args.newPassword) },
      });
      return true;
    },

    Deactivate: async (_parent, args: { isActive: boolean; email: string }) => {
      const user = await prisma.user.update({ where: { email: args.email }, data: { isActive: args.isActive } });
      return { isActive: user.isActive };
    },

    pushToken: async (_parent, args: { token?: string }, context) => {
      const currentUser = requireAuth(context);
      const user = await prisma.user.update({
        where: { id: currentUser.id },
        data: { notificationToken: args.token },
      });
      return { _id: user.id, notificationToken: user.notificationToken };
    },

    updateNotificationStatus: async (
      _parent,
      args: { offerNotification: boolean; orderNotification: boolean },
      context,
    ) => {
      const currentUser = requireAuth(context);
      const user = await prisma.user.update({
        where: { id: currentUser.id },
        data: { isOfferNotification: args.offerNotification, isOrderNotification: args.orderNotification },
      });
      return {
        _id: user.id,
        notificationToken: user.notificationToken,
        isOrderNotification: user.isOrderNotification,
        isOfferNotification: user.isOfferNotification,
      };
    },

    addFavourite: async (_parent, args: { id: string }, context) => {
      const currentUser = requireAuth(context);
      const favourites = favouriteList(currentUser);
      const next = favourites.includes(args.id)
        ? favourites.filter((id) => id !== args.id)
        : [...favourites, args.id];
      return prisma.user.update({ where: { id: currentUser.id }, data: { favouriteRestaurantIds: next } });
    },

    createAddress: async (_parent, args: { addressInput: AddressInputArgs }, context) => {
      const currentUser = requireAuth(context);
      await prisma.address.create({
        data: {
          userId: currentUser.id,
          label: args.addressInput.label,
          deliveryAddress: args.addressInput.deliveryAddress,
          details: args.addressInput.details,
          latitude: args.addressInput.latitude ? Number(args.addressInput.latitude) : null,
          longitude: args.addressInput.longitude ? Number(args.addressInput.longitude) : null,
        },
      });
      return prisma.user.findUnique({ where: { id: currentUser.id } });
    },
    editAddress: async (_parent, args: { addressInput: AddressInputArgs }, context) => {
      const currentUser = requireAuth(context);
      if (!args.addressInput._id) throw userInputError('Address _id is required');
      await prisma.address.updateMany({
        where: { id: args.addressInput._id, userId: currentUser.id },
        data: {
          label: args.addressInput.label,
          deliveryAddress: args.addressInput.deliveryAddress,
          details: args.addressInput.details,
          latitude: args.addressInput.latitude ? Number(args.addressInput.latitude) : undefined,
          longitude: args.addressInput.longitude ? Number(args.addressInput.longitude) : undefined,
        },
      });
      return prisma.user.findUnique({ where: { id: currentUser.id } });
    },
    deleteAddress: async (_parent, args: { id: string }, context) => {
      const currentUser = requireAuth(context);
      await prisma.address.deleteMany({ where: { id: args.id, userId: currentUser.id } });
      return prisma.user.findUnique({ where: { id: currentUser.id } });
    },
    deleteBulkAddresses: async (_parent, args: { ids: string[] }, context) => {
      const currentUser = requireAuth(context);
      await prisma.address.deleteMany({ where: { id: { in: args.ids }, userId: currentUser.id } });
      return prisma.user.findUnique({ where: { id: currentUser.id } });
    },
    selectAddress: async (_parent, args: { id: string }, context) => {
      const currentUser = requireAuth(context);
      await prisma.address.updateMany({ where: { userId: currentUser.id }, data: { selected: false } });
      await prisma.address.updateMany({
        where: { id: args.id, userId: currentUser.id },
        data: { selected: true },
      });
      return prisma.user.findUnique({ where: { id: currentUser.id } });
    },
  },

  User: {
    _id: (parent: User) => parent.id,
    addresses: (parent: User) => prisma.address.findMany({ where: { userId: parent.id } }),
    favourite: (parent: User) => favouriteList(parent),
  },
  Address: {
    _id: (parent: Address) => parent.id,
    location: (parent: Address) =>
      parent.latitude != null && parent.longitude != null
        ? { coordinates: [parent.longitude, parent.latitude] }
        : null,
  },
};
