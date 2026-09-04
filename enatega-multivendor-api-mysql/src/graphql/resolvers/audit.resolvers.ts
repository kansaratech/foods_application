import { IResolvers } from '@graphql-tools/utils';
import { AuditLog, Prisma } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';

export const auditResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    auditLogs: async (
      _parent,
      args: { page?: number; limit?: number; action?: string; targetType?: string; search?: string },
      context,
    ) => {
      requireRole(context, ['ADMIN']);
      const page = args.page && args.page > 0 ? args.page : 1;
      const limit = args.limit && args.limit > 0 ? args.limit : 25;
      const search = args.search?.trim();

      const where: Prisma.AuditLogWhereInput = {
        ...(args.action ? { action: { startsWith: args.action } } : {}),
        ...(args.targetType ? { targetType: args.targetType } : {}),
        ...(search
          ? {
              OR: [
                { summary: { contains: search } },
                { actorEmail: { contains: search } },
                { targetId: { contains: search } },
              ],
            }
          : {}),
      };

      const [rows, totalCount] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        auditLogs: rows,
        totalCount,
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      };
    },
  },

  AuditLog: {
    _id: (p: AuditLog) => p.id,
    timestamp: (p: AuditLog) => p.createdAt.toISOString(),
    changes: (p: AuditLog) => (p.changes == null ? null : JSON.stringify(p.changes)),
    admin: (p: AuditLog) => (p.actorId || p.actorEmail ? { _id: p.actorId, email: p.actorEmail } : null),
  },
};
