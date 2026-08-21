import { IResolvers } from '@graphql-tools/utils';
import { Notification, WebNotification } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireAuth, requireRole } from '../../middleware/auth';

// Audience for admin broadcast notifications: the restaurant-side roles that
// share the admin app's notification bell (vendors + their staff).
const BROADCAST_AUDIENCE = ['VENDOR', 'STAFF'] as const;

export const notificationResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    notifications: async (_parent, _args, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.notification.findMany({ orderBy: { createdAt: 'desc' } });
    },
    notificationsPaginated: async (_parent, args: { page?: number; limit?: number; search?: string }, context) => {
      requireRole(context, ['ADMIN']);
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where = args.search
        ? { OR: [{ title: { contains: args.search } }, { body: { contains: args.search } }] }
        : {};
      const [data, totalCount] = await Promise.all([
        prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        prisma.notification.count({ where }),
      ]);
      return { data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) };
    },
  },

  Mutation: {
    sendNotificationUser: async (_parent, args: { notificationTitle?: string; notificationBody: string }, context) => {
      requireRole(context, ['ADMIN']);
      await prisma.notification.create({ data: { title: args.notificationTitle, body: args.notificationBody } });

      const recipients = await prisma.user.findMany({
        where: { userType: { in: [...BROADCAST_AUDIENCE] } },
        select: { id: true },
      });
      if (recipients.length > 0) {
        await prisma.webNotification.createMany({
          data: recipients.map((r) => ({ userId: r.id, body: args.notificationBody })),
        });
      }
      return true;
    },

    saveNotificationTokenWeb: async (_parent, args: { token: string }, context) => {
      const user = requireAuth(context);
      await prisma.user.update({ where: { id: user.id }, data: { notificationToken: args.token } });
      return { success: true, message: 'Notification token saved' };
    },
  },

  Notification: {
    _id: (parent: Notification) => parent.id,
    createdAt: (parent: Notification) => parent.createdAt?.toISOString() ?? null,
  },

  WebNotification: {
    _id: (parent: WebNotification) => parent.id,
    createdAt: (parent: WebNotification) => parent.createdAt?.toISOString() ?? null,
  },
};
