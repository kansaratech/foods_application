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
import { recordAudit } from '../../utils/audit';
import { sendEmail } from '../../utils/notifications';
import {
  assertPhoneRecentlyVerified,
  canonicalPhone,
  consumePhoneVerification,
  findUserByPhone,
  issuePhoneOtp,
  verifyPhoneOtp,
} from '../../services/phone-auth.service';

function favouriteList(user: User): string[] {
  return Array.isArray(user.favouriteRestaurantIds) ? (user.favouriteRestaurantIds as string[]) : [];
}

function buildAuthPayload(user: User, isNewUser: boolean) {
  const { token, expiresAt } = signAccessToken({
    userId: user.id,
    userType: user.userType,
    tokenVersion: user.tokenVersion,
  });
  return {
    userId: user.id,
    token,
    tokenExpiration: expiresAt,
    isActive: user.isActive,
    name: user.name,
    email: user.email,
    phone: user.phone,
    emailIsVerified: user.emailIsVerified,
    phoneIsVerified: user.phoneIsVerified,
    picture: user.image,
    isNewUser,
  };
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
  phone?: string;
  otp?: string;
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
      const loginConfig = await prisma.configuration.findFirst();
      const verifiedFlags = (user: { emailIsVerified: boolean; phoneIsVerified: boolean }) => ({
        emailIsVerified: loginConfig?.skipEmailVerification ? true : user.emailIsVerified,
        phoneIsVerified: loginConfig?.skipMobileVerification ? true : user.phoneIsVerified,
      });
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
          ...verifiedFlags(user),
          picture: user.image,
          isNewUser: false,
        };
      }

      // Phone login: passwordless (phone + OTP) or phone + password. Verified
      // customers sign in; an unknown number becomes a new CUSTOMER account.
      if (args.type === 'phone') {
        if (!args.phone) throw userInputError('Mobile number is required');
        const existing = await findUserByPhone(args.phone);

        if (args.otp) {
          await verifyPhoneOtp(args.phone, args.otp);
        } else if (args.password) {
          if (!existing?.password || !(await comparePassword(args.password, existing.password))) {
            throw userInputError('Invalid mobile number or password');
          }
        } else {
          throw userInputError('Enter the code sent to your phone');
        }

        let user = existing;
        let isNewUser = false;
        if (!user) {
          user = await prisma.user.create({
            data: {
              phone: canonicalPhone(args.phone),
              name: args.name,
              phoneIsVerified: true,
              notificationToken: args.notificationToken,
              userType: 'CUSTOMER',
            },
          });
          isNewUser = true;
        } else if (!user.phoneIsVerified || args.notificationToken) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              phoneIsVerified: true,
              ...(args.notificationToken ? { notificationToken: args.notificationToken } : {}),
            },
          });
        }
        if (args.otp) await consumePhoneVerification(args.phone);
        return buildAuthPayload(user, isNewUser);
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
        ...verifiedFlags(user),
        picture: user.image,
        isNewUser,
      };
    },

    createUser: async (_parent, args: { userInput: UserInputArgs }) => {
      const input = args.userInput;
      if (input.email) {
        const existing = await prisma.user.findUnique({ where: { email: input.email } });
        if (existing) throw userInputError('Email is already registered');
      }
      if (input.phone && (await findUserByPhone(input.phone))) {
        throw userInputError('This mobile number is already registered');
      }

      const config = await prisma.configuration.findFirst();
      const emailIsVerified = config?.skipEmailVerification ? true : (input.emailIsVerified ?? false);

      // Phone-first signup: unless mobile verification is switched off, the
      // number must have been OTP-verified (issuePhoneOtp → verifyPhoneOtp) in
      // the last half hour before the account can be created.
      let phoneIsVerified = false;
      if (input.phone) {
        if (config?.skipMobileVerification) {
          phoneIsVerified = true;
        } else {
          await assertPhoneRecentlyVerified(input.phone);
          phoneIsVerified = true;
        }
      }

      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone ? canonicalPhone(input.phone) : undefined,
          password: input.password ? await hashPassword(input.password) : undefined,
          notificationToken: input.notificationToken,
          appleId: input.appleId,
          emailIsVerified,
          phoneIsVerified,
        },
      });
      if (input.phone && phoneIsVerified && !config?.skipMobileVerification) {
        await consumePhoneVerification(input.phone);
      }
      return buildAuthPayload(user, true);
    },

    updateUser: async (
      _parent,
      args: {
        updateUserInput: {
          name: string;
          phone?: string;
          phoneIsVerified?: boolean;
          email?: string;
          emailIsVerified?: boolean;
        };
      },
      context,
    ) => {
      const currentUser = requireAuth(context);
      const { email } = args.updateUserInput;

      if (email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing && existing.id !== currentUser.id) {
          throw userInputError('That email is already in use on another account.');
        }
      }

      return prisma.user.update({
        where: { id: currentUser.id },
        data: {
          name: args.updateUserInput.name,
          phone: args.updateUserInput.phone,
          phoneIsVerified: args.updateUserInput.phoneIsVerified,
          // A freshly-added email is unverified until the user confirms it —
          // never let the client force this true for a new address.
          ...(email ? { email, emailIsVerified: false } : { emailIsVerified: args.updateUserInput.emailIsVerified }),
        },
      });
    },

    emailExist: async (_parent, args: { email: string }) => {
      const user = await prisma.user.findUnique({ where: { email: args.email } });
      return Boolean(user);
    },
    phoneExist: async (_parent, args: { phone: string }) => {
      return Boolean(await findUserByPhone(args.phone));
    },

    sendOtpToEmail: async (_parent, args: { email: string }) => {
      const otp = generateOtp();
      await prisma.user.updateMany({
        where: { email: args.email },
        data: { otpCode: otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      });
      await sendEmail(args.email, 'Your verification code', `Your OTP is ${otp}. It expires in 10 minutes.`);
      return { result: 'OTP sent' };
    },
    sendOtpToPhoneNumber: async (_parent, args: { phone: string }) => {
      await issuePhoneOtp(args.phone, 'SIGNUP');
      return { result: 'OTP sent' };
    },
    verifyOtp: async (_parent, args: { otp: string; email?: string; phone?: string }) => {
      if (args.phone) {
        await verifyPhoneOtp(args.phone, args.otp);
        // If an account already uses this number, flip its verified flag now.
        const user = await findUserByPhone(args.phone);
        if (user && !user.phoneIsVerified) {
          await prisma.user.update({ where: { id: user.id }, data: { phoneIsVerified: true } });
        }
        return { result: 'OTP verified' };
      }

      // Email OTP path (unchanged) — stored on the User row.
      const user = await prisma.user.findFirst({ where: { email: args.email } });
      const config = await prisma.configuration.findFirst();
      const isTestOtp = config?.testOtp && config.testOtp === args.otp;
      if (!user) throw userInputError('User not found');
      if (!isTestOtp) {
        if (!user.otpCode || user.otpCode !== args.otp) throw userInputError('Invalid OTP');
        if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) throw userInputError('OTP has expired');
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { otpCode: null, otpExpiresAt: null, emailIsVerified: true },
      });
      return { result: 'OTP verified' };
    },

    forgotPassword: async (_parent, args: { email?: string; phone?: string }) => {
      if (args.phone) {
        const user = await findUserByPhone(args.phone);
        if (!user) throw userInputError('No account found with that mobile number');
        await issuePhoneOtp(args.phone, 'PASSWORD_RESET');
        return { result: 'OTP sent' };
      }
      if (!args.email) throw userInputError('Enter your email or mobile number');
      const otp = generateOtp();
      const updated = await prisma.user.updateMany({
        where: { email: args.email },
        data: { otpCode: otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      });
      if (updated.count === 0) throw userInputError('No account found with that email');
      await sendEmail(args.email, 'Password reset code', `Your password reset OTP is ${otp}. It expires in 10 minutes.`);
      return { result: 'OTP sent' };
    },
    resetPassword: async (_parent, args: { password: string; email?: string; phone?: string; otp?: string }) => {
      if (!args.password || args.password.length < 8) {
        throw userInputError('Password must be at least 8 characters');
      }
      if (args.phone) {
        await verifyPhoneOtp(args.phone, args.otp ?? '');
        const user = await findUserByPhone(args.phone);
        if (!user) throw userInputError('No account found with that mobile number');
        await prisma.user.update({
          where: { id: user.id },
          data: { password: await hashPassword(args.password), phoneIsVerified: true, tokenVersion: { increment: 1 } },
        });
        await consumePhoneVerification(args.phone);
        return { result: 'Password reset' };
      }
      const user = args.email ? await prisma.user.findUnique({ where: { email: args.email } }) : null;
      if (!user || !user.otpCode || user.otpCode !== args.otp) throw userInputError('Invalid OTP');
      if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) throw userInputError('OTP has expired');
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(args.password), otpCode: null, otpExpiresAt: null, tokenVersion: { increment: 1 } },
      });
      return { result: 'Password reset' };
    },
    changePassword: async (_parent, args: { oldPassword: string; newPassword: string }, context) => {
      const currentUser = requireAuth(context);
      if (!currentUser.password || !(await comparePassword(args.oldPassword, currentUser.password))) {
        throw userInputError('Old password is incorrect');
      }
      if (!args.newPassword || args.newPassword.length < 8) {
        throw userInputError('New password must be at least 8 characters');
      }
      await prisma.user.update({
        where: { id: currentUser.id },
        // Bump tokenVersion so any other logged-in session is invalidated.
        data: { password: await hashPassword(args.newPassword), tokenVersion: { increment: 1 } },
      });
      if (currentUser.userType === 'ADMIN' || currentUser.userType === 'STAFF') {
        await recordAudit(context, { action: 'account.password.change', summary: `${currentUser.email} changed their password` });
      }
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
    id: (parent: Address) => parent.id,
    location: (parent: Address) =>
      parent.latitude != null && parent.longitude != null
        ? { coordinates: [parent.longitude, parent.latitude] }
        : null,
  },
};
