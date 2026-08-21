import { IResolvers } from '@graphql-tools/utils';
import { SupportTicket, TicketMessage } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireAuth, requireRole } from '../../middleware/auth';
import { forbiddenError, notFoundError, userInputError } from '../../utils/errors';

const AGENT_ROLES = ['ADMIN', 'STAFF'];
const TICKET_STATUSES = ['open', 'inProgress', 'closed'];

function isAgent(userType: string): boolean {
  return AGENT_ROLES.includes(userType);
}

async function assertTicketAccess(context: GraphQLContext, ticket: { userId: string }) {
  const user = requireAuth(context);
  if (isAgent(user.userType) || user.id === ticket.userId) return user;
  throw forbiddenError();
}

async function notifyAdmins(body: string) {
  const admins = await prisma.user.findMany({ where: { userType: { in: ['ADMIN', 'STAFF'] } }, select: { id: true } });
  if (admins.length === 0) return;
  await prisma.webNotification.createMany({ data: admins.map((a) => ({ userId: a.id, body })) });
}

interface FiltersArgs {
  page?: number;
  limit?: number;
}

export const supportResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    getTicketUsersWithLatest: async (_parent, args: { input?: FiltersArgs }, context) => {
      requireRole(context, ['ADMIN', 'STAFF']);
      const page = args.input?.page ?? 1;
      const limit = args.input?.limit ?? 10;

      const groups = await prisma.supportTicket.groupBy({ by: ['userId'], _max: { createdAt: true } });
      const sortedUserIds = groups
        .sort((a, b) => (b._max.createdAt?.getTime() ?? 0) - (a._max.createdAt?.getTime() ?? 0))
        .map((g) => g.userId);
      const docsCount = sortedUserIds.length;
      const pageIds = sortedUserIds.slice((page - 1) * limit, (page - 1) * limit + limit);

      const users = await Promise.all(
        pageIds.map(async (userId) => {
          const [user, latestTicket] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId } }),
            prisma.supportTicket.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
          ]);
          return { ...user, latestTicket };
        }),
      );

      return { users, docsCount, totalPages: Math.max(1, Math.ceil(docsCount / limit)), currentPage: page };
    },

    getTicketUsers: async (_parent, args: { input?: FiltersArgs }, context) => {
      requireRole(context, ['ADMIN', 'STAFF']);
      const page = args.input?.page ?? 1;
      const limit = args.input?.limit ?? 10;

      const groups = await prisma.supportTicket.groupBy({ by: ['userId'], _max: { createdAt: true } });
      const sortedUserIds = groups
        .sort((a, b) => (b._max.createdAt?.getTime() ?? 0) - (a._max.createdAt?.getTime() ?? 0))
        .map((g) => g.userId);
      const docsCount = sortedUserIds.length;
      const pageIds = sortedUserIds.slice((page - 1) * limit, (page - 1) * limit + limit);

      const foundUsers = await prisma.user.findMany({ where: { id: { in: pageIds } } });
      const users = pageIds.map((id) => foundUsers.find((u) => u.id === id)).filter((u) => u != null);

      return { users, docsCount, totalPages: Math.max(1, Math.ceil(docsCount / limit)), currentPage: page };
    },

    getSingleUserSupportTickets: async (
      _parent,
      args: { input: { userId: string; filters?: FiltersArgs } },
      context,
    ) => {
      const currentUser = requireAuth(context);
      const { userId, filters } = args.input;
      if (!isAgent(currentUser.userType) && currentUser.id !== userId) throw forbiddenError();

      const page = filters?.page ?? 1;
      const limit = filters?.limit ?? 10;
      const where = { userId };
      const [tickets, docsCount] = await Promise.all([
        prisma.supportTicket.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        prisma.supportTicket.count({ where }),
      ]);
      return { tickets, docsCount, totalPages: Math.max(1, Math.ceil(docsCount / limit)), currentPage: page };
    },

    getSingleSupportTicket: async (_parent, args: { ticketId: string }, context) => {
      const ticket = await prisma.supportTicket.findUnique({ where: { id: args.ticketId } });
      if (!ticket) throw notFoundError('Support ticket not found');
      await assertTicketAccess(context, ticket);
      return ticket;
    },

    getTicketMessages: async (
      _parent,
      args: { input: { ticket: string } & FiltersArgs },
      context,
    ) => {
      const ticket = await prisma.supportTicket.findUnique({ where: { id: args.input.ticket } });
      if (!ticket) throw notFoundError('Support ticket not found');
      await assertTicketAccess(context, ticket);

      const page = args.input.page ?? 1;
      const limit = args.input.limit ?? 20;
      const where = { ticketId: ticket.id };
      const [messages, docsCount] = await Promise.all([
        prisma.ticketMessage.findMany({ where, orderBy: { createdAt: 'asc' }, skip: (page - 1) * limit, take: limit }),
        prisma.ticketMessage.count({ where }),
      ]);
      return { messages, ticket, page, totalPages: Math.max(1, Math.ceil(docsCount / limit)), docsCount };
    },
  },

  Mutation: {
    createSupportTicket: async (
      _parent,
      args: { ticketInput: { title: string; description: string; category: string; orderId?: string; otherDetails?: string } },
      context,
    ) => {
      const user = requireAuth(context);
      const { title, description, category, orderId, otherDetails } = args.ticketInput;
      const ticket = await prisma.supportTicket.create({
        data: { userId: user.id, title, description, category, orderId, otherDetails },
      });
      await notifyAdmins(`New support ticket: ${title}`);
      return ticket;
    },

    createMessage: async (_parent, args: { messageInput: { content: string; ticket: string } }, context) => {
      const user = requireAuth(context);
      const ticket = await prisma.supportTicket.findUnique({ where: { id: args.messageInput.ticket } });
      if (!ticket) throw notFoundError('Support ticket not found');
      await assertTicketAccess(context, ticket);

      const senderType = user.id === ticket.userId ? 'user' : 'admin';
      const message = await prisma.ticketMessage.create({
        data: { ticketId: ticket.id, content: args.messageInput.content, senderType },
      });

      if (senderType === 'user') {
        await notifyAdmins(`New reply on ticket "${ticket.title}"`);
      } else {
        await prisma.webNotification.create({
          data: { userId: ticket.userId, body: `New reply on your support ticket "${ticket.title}"` },
        });
      }
      return message;
    },

    updateSupportTicketStatus: async (_parent, args: { input: { ticketId: string; status: string } }, context) => {
      requireRole(context, ['ADMIN', 'STAFF']);
      const existing = await prisma.supportTicket.findUnique({ where: { id: args.input.ticketId } });
      if (!existing) throw notFoundError('Support ticket not found');
      if (!TICKET_STATUSES.includes(args.input.status)) throw userInputError(`Invalid status: ${args.input.status}`);
      return prisma.supportTicket.update({ where: { id: args.input.ticketId }, data: { status: args.input.status } });
    },
  },

  SupportTicket: {
    _id: (parent: SupportTicket) => parent.id,
    user: (parent: SupportTicket) => prisma.user.findUnique({ where: { id: parent.userId } }),
    createdAt: (parent: SupportTicket) => parent.createdAt?.toISOString() ?? null,
    updatedAt: (parent: SupportTicket) => parent.updatedAt?.toISOString() ?? null,
  },

  TicketMessage: {
    _id: (parent: TicketMessage) => parent.id,
    ticket: (parent: TicketMessage) => parent.ticketId,
    createdAt: (parent: TicketMessage) => parent.createdAt?.toISOString() ?? null,
    updatedAt: (parent: TicketMessage) => parent.updatedAt?.toISOString() ?? null,
  },

  TicketUser: {
    _id: (parent: { id: string }) => parent.id,
  },

  TicketUserWithLatest: {
    _id: (parent: { id: string }) => parent.id,
  },

  TicketMessagesTicketRef: {
    _id: (parent: SupportTicket) => parent.id,
    user: (parent: SupportTicket) => prisma.user.findUnique({ where: { id: parent.userId } }),
  },

  TicketUserRefLite: {
    _id: (parent: { id: string }) => parent.id,
  },
};
