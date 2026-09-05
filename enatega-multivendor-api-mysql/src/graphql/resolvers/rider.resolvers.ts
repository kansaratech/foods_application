import { randomBytes } from 'crypto';
import { IResolvers } from '@graphql-tools/utils';
import { Prisma, RiderProfile, User, Zone } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { comparePassword, hashPassword, signAccessToken } from '../../services/auth.service';
import { forbiddenError, notFoundError, userInputError } from '../../utils/errors';
import { pubsub, TOPICS } from '../../utils/pubsub';
import { RIDER_REQUIRED_DOC_KINDS } from './rider-docs.resolvers';

type RiderParent = User & { riderProfile: (RiderProfile & { zone: Zone | null }) | null };

const RIDER_INCLUDE = { riderProfile: { include: { zone: true } } } satisfies Prisma.UserInclude;

const ACTIVE_DELIVERY_STATUSES = ['ASSIGNED', 'PICKED'] as const;

interface RiderInputArgs {
  _id?: string;
  name: string;
  username?: string;
  phone?: string;
  email?: string;
  image?: string;
  zone?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  employmentType?: string;
  available?: boolean;
  isActive?: boolean;
  password?: string;
  sendSetupLink?: boolean;
}

// Riders don't have an email-driven verification flow the way vendors do —
// they log in via createRider only from the admin, so a randomly generated
// password is just a placeholder until the invite/reset flow replaces it.
function generateInvitePassword(): string {
  return randomBytes(24).toString('base64url');
}

function riderProfileWriteData(input: RiderInputArgs) {
  return {
    vehicleType: input.vehicleType,
    available: input.available ?? true,
    zoneId: input.zone || undefined,
    employmentType: input.employmentType || 'INDEPENDENT',
    ...(input.vehicleNumber !== undefined
      ? { vehicleDetails: { number: input.vehicleNumber || undefined } as Prisma.InputJsonValue }
      : {}),
  };
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
      args: {
        page?: number;
        limit?: number;
        search?: string;
        zone?: string;
        available?: boolean;
        isActive?: boolean;
        vehicleType?: string;
        onDelivery?: boolean;
      },
      context,
    ) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;

      let onDeliveryRiderIds: string[] | undefined;
      if (args.onDelivery != null) {
        const activeOrders = await prisma.order.findMany({
          where: { riderId: { not: null }, orderStatus: { in: [...ACTIVE_DELIVERY_STATUSES] } },
          select: { riderId: true },
          distinct: ['riderId'],
        });
        onDeliveryRiderIds = activeOrders.map((o) => o.riderId as string);
      }

      const where: Prisma.UserWhereInput = {
        userType: 'RIDER',
        ...(args.search
          ? {
              OR: [
                { name: { contains: args.search } },
                { username: { contains: args.search } },
                { phone: { contains: args.search } },
              ],
            }
          : {}),
        ...(args.isActive != null ? { isActive: args.isActive } : {}),
        ...(args.zone || args.available != null || args.vehicleType
          ? {
              riderProfile: {
                ...(args.zone ? { zoneId: args.zone } : {}),
                ...(args.available != null ? { available: args.available } : {}),
                ...(args.vehicleType ? { vehicleType: args.vehicleType } : {}),
              },
            }
          : {}),
        ...(onDeliveryRiderIds != null
          ? args.onDelivery
            ? { id: { in: onDeliveryRiderIds } }
            : { id: { notIn: onDeliveryRiderIds } }
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
    riderStats: async (_parent, _args, context) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      const [total, online, activeOrders, riders] = await Promise.all([
        prisma.user.count({ where: { userType: 'RIDER' } }),
        prisma.user.count({ where: { userType: 'RIDER', riderProfile: { available: true } } }),
        prisma.order.findMany({
          where: { riderId: { not: null }, orderStatus: { in: [...ACTIVE_DELIVERY_STATUSES] } },
          select: { riderId: true },
          distinct: ['riderId'],
        }),
        prisma.user.findMany({ where: { userType: 'RIDER' }, select: { id: true } }),
      ]);

      const riderIds = riders.map((r) => r.id);
      const verifiedDocs = riderIds.length
        ? await prisma.riderDocument.findMany({
            where: { riderId: { in: riderIds }, status: 'VERIFIED' },
            select: { riderId: true, kind: true },
          })
        : [];
      const verifiedByRider = new Map<string, Set<string>>();
      for (const doc of verifiedDocs) {
        if (!verifiedByRider.has(doc.riderId)) verifiedByRider.set(doc.riderId, new Set());
        verifiedByRider.get(doc.riderId)!.add(doc.kind);
      }
      const documentsPending = riderIds.filter((id) => {
        const verified = verifiedByRider.get(id) ?? new Set<string>();
        return RIDER_REQUIRED_DOC_KINDS.some((kind) => !verified.has(kind));
      }).length;

      return { total, online, onDelivery: activeOrders.length, documentsPending };
    },
  },

  Mutation: {
    riderLogin: async (
      _parent,
      args: { username?: string; password?: string; notificationToken?: string; timeZone: string },
    ) => {
      if (!args.username || !args.password) throw userInputError('username and password are required');
      // Riders often type the email into the "Email" field, or the username with
      // different casing — accept either identifier, case-insensitively.
      const identifier = args.username.trim();
      const user = await prisma.user.findFirst({
        where: {
          userType: 'RIDER',
          OR: [{ username: identifier }, { username: identifier.toLowerCase() }, { email: identifier.toLowerCase() }],
        },
      });
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

    // Mirrors createVendor's three-way branch (fresh create / finalize a
    // saveRiderDraft draft / edit an existing rider): a password is only
    // ever touched when one is explicitly supplied, or when a DRAFT rider
    // goes live for the first time — never silently overwritten on an
    // already-ACTIVE rider just because the field was left blank.
    createRider: async (_parent, args: { riderInput: RiderInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      const input = args.riderInput;
      const email = input.email ? input.email.trim().toLowerCase() : undefined;

      if (input.username) {
        const existingUsername = await prisma.user.findUnique({ where: { username: input.username } });
        if (existingUsername && existingUsername.id !== input._id) {
          throw userInputError('A rider with this username already exists');
        }
      }
      if (email) {
        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail && existingEmail.id !== input._id) {
          throw userInputError('A rider with this email already exists');
        }
      }

      const baseData = {
        name: input.name,
        username: input.username || undefined,
        phone: input.phone || undefined,
        email,
        image: input.image,
        isActive: input.isActive ?? true,
      };
      const profileData = riderProfileWriteData(input);

      let rider: User;
      let sendingInvite = false;

      if (input._id) {
        const existing = await prisma.user.findUnique({ where: { id: input._id } });
        if (!existing) throw notFoundError('Rider not found');

        const data: typeof baseData & { password?: string; status?: string } = { ...baseData };
        if (input.password) {
          data.password = await hashPassword(input.password);
        } else if (existing.status === 'DRAFT') {
          // First time this rider goes live — replace the draft's
          // placeholder password with a real invite.
          data.password = await hashPassword(generateInvitePassword());
          data.status = 'ACTIVE';
          sendingInvite = true;
        }
        rider = await prisma.user.update({ where: { id: input._id }, data });
        await prisma.riderProfile.upsert({
          where: { userId: input._id },
          create: { userId: input._id, ...profileData },
          update: profileData,
        });
      } else {
        sendingInvite = input.sendSetupLink !== false && !input.password;
        rider = await prisma.user.create({
          data: {
            ...baseData,
            userType: 'RIDER',
            status: 'ACTIVE',
            password: await hashPassword(input.password ?? generateInvitePassword()),
            riderProfile: { create: profileData },
          },
        });
      }

      if (sendingInvite) {
        // No email/SMS provider is wired up yet — this stands in until one
        // exists (same placeholder used by createVendor's invite path).
        console.log(
          `[dev] Account setup invitation for rider ${rider.username ?? rider.email ?? rider.phone}: use Forgot Password to set a password.`,
        );
      }

      await pubsub.publish('RIDER_UPDATED', { riderUpdated: { _id: rider.id } });
      return prisma.user.findUnique({ where: { id: rider.id }, include: RIDER_INCLUDE });
    },

    // Lenient upsert for the "Save as draft" action — never enforces the
    // uniqueness/required-field checks createRider does, and never
    // resurrects or silently edits an already-finalized rider's status.
    saveRiderDraft: async (_parent, args: { riderInput: RiderInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      const input = args.riderInput;
      const email = input.email ? input.email.trim().toLowerCase() : undefined;

      const baseData = {
        name: input.name,
        username: input.username || undefined,
        phone: input.phone || undefined,
        email,
        image: input.image,
        isActive: input.isActive ?? true,
      };
      const profileData = riderProfileWriteData(input);

      if (input._id) {
        const existing = await prisma.user.findUnique({ where: { id: input._id } });
        if (!existing) throw notFoundError('Rider not found');
        await prisma.user.update({ where: { id: input._id }, data: baseData });
        await prisma.riderProfile.upsert({
          where: { userId: input._id },
          create: { userId: input._id, ...profileData },
          update: profileData,
        });
        return prisma.user.findUnique({ where: { id: input._id }, include: RIDER_INCLUDE });
      }

      const rider = await prisma.user.create({
        data: {
          ...baseData,
          userType: 'RIDER',
          status: 'DRAFT',
          // A draft still needs some credential on record; it's replaced
          // when the form is finalized (createRider), same as the invite path.
          password: await hashPassword(generateInvitePassword()),
          riderProfile: { create: profileData },
        },
      });
      return prisma.user.findUnique({ where: { id: rider.id }, include: RIDER_INCLUDE });
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
          email: input.email ? input.email.trim().toLowerCase() : undefined,
          image: input.image,
          isActive: input.isActive,
          password: input.password ? await hashPassword(input.password) : undefined,
        },
      });
      const profileData = riderProfileWriteData(input);
      await prisma.riderProfile.upsert({
        where: { userId: input._id },
        create: { userId: input._id, ...profileData },
        update: profileData,
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
    status: (parent: RiderParent) => parent.status,
    employmentType: (parent: RiderParent) => parent.riderProfile?.employmentType ?? 'INDEPENDENT',
    available: (parent: RiderParent) => parent.riderProfile?.available ?? null,
    vehicleType: (parent: RiderParent) => parent.riderProfile?.vehicleType ?? null,
    currentTask: async (parent: RiderParent) => {
      const order = await prisma.order.findFirst({
        where: { riderId: parent.id, orderStatus: { in: [...ACTIVE_DELIVERY_STATUSES] } },
        orderBy: { createdAt: 'desc' },
        select: { orderId: true, orderStatus: true },
      });
      return order ? { orderId: order.orderId, status: order.orderStatus } : null;
    },
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
