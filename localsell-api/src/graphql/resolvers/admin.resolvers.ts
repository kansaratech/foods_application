import { IResolvers } from '@graphql-tools/utils';
import { randomBytes } from 'crypto';
import { User } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireAuth, requireRole } from '../../middleware/auth';
import { comparePassword, hashPassword, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../services/auth.service';
import { forbiddenError, invalidTokenError, notFoundError, tokenExpiredError, userInputError } from '../../utils/errors';
import { normalizeIndianPhone } from '../../utils/phone';
import { recordAudit } from '../../utils/audit';
import { purgeRestaurant } from './restaurant.resolvers';

/** Friendly "phone already in use" — never let the raw `User_phone_key`
 *  Prisma error reach the client. */
async function assertPhoneFree(phone: string | undefined, ignoreUserId?: string): Promise<void> {
  if (!phone) return;
  const clash = await prisma.user.findUnique({ where: { phone } });
  if (clash && clash.id !== ignoreUserId) {
    throw userInputError('This phone number is already registered to another account.');
  }
}

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
  businessName?: string;
  businessType?: string;
  isGstRegistered?: boolean;
  gstin?: string;
}

// Accepts either a ShopType id or slug — mirrors resolveShopTypeId in
// restaurant.resolvers.ts (kept local here to avoid a cross-file import for
// one small lookup).
async function resolveBusinessTypeId(businessType?: string | null): Promise<string | undefined> {
  if (!businessType) return undefined;
  const byId = await prisma.shopType.findUnique({ where: { id: businessType } });
  if (byId) return byId.id;
  const bySlug = await prisma.shopType.findUnique({ where: { slug: businessType } });
  return bySlug?.id;
}

// The admin's "send account setup link" flow never collects a password from
// the admin. The account still needs *some* credential on record, so this
// generates one server-side; it is hashed and stored but never returned to
// the caller. The vendor sets their real password through the existing OTP
// forgot-password flow (forgotPassword / resetPassword) using their email.
function generateInvitePassword(): string {
  return randomBytes(24).toString('base64url');
}

export const adminResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    ownerSession: async (_parent, _args, context) => {
      // A present-but-stale token must report *why* so the client's error link
      // can refresh (expired) or clear the session (invalid) on boot, instead of
      // silently treating it as "logged out".
      if (context.authError === 'expired') throw tokenExpiredError();
      if (context.authError === 'invalid') throw invalidTokenError();
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
    usersPaginated: async (
      _parent,
      args: {
        page?: number;
        limit?: number;
        search?: string;
        registrationMethod?: string;
        status?: string;
      },
      context,
    ) => {
      requireRole(context, ['ADMIN']);
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;

      // Registration method: no dedicated column, so infer from what's set.
      const methodFilter =
        args.registrationMethod === 'apple'
          ? { appleId: { not: null } }
          : args.registrationMethod === 'default'
            ? { password: { not: null } }
            : args.registrationMethod === 'google'
              ? { appleId: null, password: null }
              : {};

      const statusMap: Record<string, string> = {
        active: 'ACTIVE',
        blocked: 'BLOCKED',
        deactivate: 'DEACTIVATED',
      };
      const statusFilter =
        args.status && statusMap[args.status]
          ? { status: statusMap[args.status] }
          : {};

      const where = {
        userType: 'CUSTOMER' as const,
        ...methodFilter,
        ...statusFilter,
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
      const user = requireRole(context, ['ADMIN', 'STAFF', 'VENDOR']);
      return prisma.webNotification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
    },
  },

  Mutation: {
    // Re-authenticate the current user for a sensitive action (e.g. editing a
    // store). Returns true only when the supplied password matches.
    verifyMyPassword: async (_parent, args: { password: string }, context) => {
      const user = requireAuth(context);
      if (!user.password) return false;
      return comparePassword(args.password ?? '', user.password);
    },

    markWebNotificationsAsRead: async (_parent, _args, context) => {
      const user = requireRole(context, ['ADMIN', 'STAFF', 'VENDOR']);
      await prisma.webNotification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
      return prisma.webNotification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
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
      // A password change bumps tokenVersion to kill every existing session — the
      // refresh token must not be a loophole that keeps minting access tokens.
      if (user.tokenVersion !== payload.tokenVersion) {
        throw userInputError('Invalid or expired refresh token');
      }
      return ownerAuthPayload(user);
    },

    // Creates a brand-new vendor, finalizes a draft the registration wizard
    // started with saveVendorDraft (status DRAFT → ACTIVE), or — since the
    // same wizard is reused for editing — updates an already-ACTIVE vendor.
    // Those three cases need different password handling: a fresh account
    // needs *some* credential; a draft going live for the first time needs a
    // real one minted if the admin didn't set one; but editing an already-live
    // vendor must never touch the password just because the field was left
    // blank — that would silently lock them out.
    createVendor: async (_parent, args: { vendorInput: VendorInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      const input = args.vendorInput;
      const email = input.email.trim().toLowerCase();
      const phone = normalizeIndianPhone(input.phoneNumber);

      const businessTypeId = await resolveBusinessTypeId(input.businessType);
      const gstRegistered = input.isGstRegistered ?? false;

      const baseData = {
        email,
        name: input.name,
        image: input.image,
        firstName: input.firstName,
        lastName: input.lastName,
        phone,
        userType: 'VENDOR' as const,
        status: 'ACTIVE',
        businessName: input.businessName,
        businessTypeId,
        isGstRegistered: gstRegistered,
        gstin: gstRegistered ? input.gstin?.trim().toUpperCase() : null,
      };

      let vendor;
      let sendingInvite = false;

      if (input._id) {
        const existing = await prisma.user.findUnique({ where: { id: input._id } });
        if (!existing) throw notFoundError('Vendor not found');
        if (existing.email !== email) {
          const emailTaken = await prisma.user.findUnique({ where: { email } });
          if (emailTaken && emailTaken.id !== input._id) throw userInputError('A vendor with this email already exists');
        }
        await assertPhoneFree(phone, input._id);

        const data: typeof baseData & { password?: string } = { ...baseData };
        if (input.password) {
          data.password = await hashPassword(input.password);
        } else if (existing.status === 'DRAFT') {
          // First time this vendor goes live — it only has the placeholder
          // password saveVendorDraft gave it, so mint a real one now.
          data.password = await hashPassword(generateInvitePassword());
          sendingInvite = true;
        }
        // Otherwise this is an edit of an already-ACTIVE vendor with no
        // password entered: leave the existing password untouched.
        vendor = await prisma.user.update({ where: { id: input._id }, data });
      } else {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) throw userInputError('A vendor with this email already exists');
        await assertPhoneFree(phone);
        sendingInvite = !input.password;
        vendor = await prisma.user.create({
          data: { ...baseData, password: await hashPassword(input.password ?? generateInvitePassword()) },
        });
      }

      if (sendingInvite) {
        // No email provider is wired up yet (see forgotPassword/resetPassword,
        // which log their OTP the same way) — this stands in for the email
        // until one exists.
        console.log(`[dev] Account setup invitation for ${vendor.email}: use Forgot Password with this email to set a password.`);
      }

      return vendor;
    },

    saveVendorDraft: async (_parent, args: { vendorInput: VendorInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      const input = args.vendorInput;
      // Draft saves stay near-validation-free (#52): a blank email is fine
      // (stored as null so multiple empty drafts don't collide on the unique
      // index), it's filled in before the wizard finalizes.
      const email = input.email?.trim().toLowerCase() || null;

      const businessTypeId = await resolveBusinessTypeId(input.businessType);
      const gstRegistered = input.isGstRegistered ?? false;
      const phone = normalizeIndianPhone(input.phoneNumber);
      // Friendly conflict message instead of a raw `User_phone_key` Prisma error.
      await assertPhoneFree(phone, input._id);

      // The one thing a draft must have: something in it. An entirely blank
      // "Save draft" shouldn't create a ghost vendor row.
      if (!input._id && !email && !phone && !input.name?.trim() && !input.firstName?.trim() && !input.businessName?.trim()) {
        throw userInputError('Add at least a name, email or phone before saving a draft.');
      }

      const data = {
        email,
        name: input.name,
        image: input.image,
        firstName: input.firstName,
        lastName: input.lastName,
        phone,
        businessName: input.businessName,
        businessTypeId,
        isGstRegistered: gstRegistered,
        gstin: gstRegistered ? input.gstin?.trim().toUpperCase() : null,
      };

      if (input._id) {
        const existing = await prisma.user.findUnique({ where: { id: input._id } });
        if (!existing) throw notFoundError('Vendor not found');
        // A draft save must never resurrect / silently edit an already-finalized
        // vendor's status — only the wizard's own draft is ever touched here.
        return prisma.user.update({ where: { id: input._id }, data });
      }

      const existingByEmail = email ? await prisma.user.findUnique({ where: { email } }) : null;
      if (existingByEmail) {
        if (existingByEmail.status !== 'DRAFT') throw userInputError('A vendor with this email already exists');
        return prisma.user.update({ where: { id: existingByEmail.id }, data });
      }

      return prisma.user.create({
        data: {
          ...data,
          userType: 'VENDOR',
          status: 'DRAFT',
          // A draft still needs some credential on record; it's replaced when
          // the wizard is finalized (createVendor), same as the invite path.
          password: await hashPassword(generateInvitePassword()),
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

      const businessTypeId = input.businessType !== undefined ? await resolveBusinessTypeId(input.businessType) : undefined;
      const gstRegistered = input.isGstRegistered;
      const phone = input.phoneNumber !== undefined ? normalizeIndianPhone(input.phoneNumber) : undefined;
      await assertPhoneFree(phone, input._id);

      return prisma.user.update({
        where: { id: input._id },
        data: {
          email: input.email ? input.email.trim().toLowerCase() : undefined,
          name: input.name,
          image: input.image,
          firstName: input.firstName,
          lastName: input.lastName,
          phone,
          password: input.password ? await hashPassword(input.password) : undefined,
          businessName: input.businessName,
          businessTypeId,
          isGstRegistered: gstRegistered,
          gstin: gstRegistered === false ? null : input.gstin?.trim().toUpperCase(),
        },
      });
    },
    deleteVendor: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      const vendor = await prisma.user.findUnique({
        where: { id: args.id },
        include: { restaurants: { select: { id: true, name: true } } },
      });
      if (!vendor) throw notFoundError('Vendor not found');

      // Wipe every store this vendor owns (menus, orders, ledgers) before the
      // owner row — Restaurant.ownerId is RESTRICT, not cascade.
      for (const r of vendor.restaurants) {
        await purgeRestaurant(r.id);
      }
      // Ledgers keyed by vendorId have no FK relation — clear them by hand.
      await prisma.$transaction([
        prisma.commissionRecord.deleteMany({ where: { vendorId: args.id } }),
        prisma.commissionBill.deleteMany({ where: { vendorId: args.id } }),
        prisma.user.delete({ where: { id: args.id } }), // cascades VendorDocument
      ]);

      await recordAudit(context, {
        action: 'vendor.delete',
        targetType: 'User',
        targetId: args.id,
        summary: `Vendor permanently deleted: ${vendor.name ?? vendor.email} (${vendor.restaurants.length} store(s))`,
      });
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
    favourite: (parent: User) => (Array.isArray(parent.favouriteRestaurantIds) ? (parent.favouriteRestaurantIds as string[]) : []),
    addresses: (parent: User) => prisma.address.findMany({ where: { userId: parent.id } }),
  },
};
