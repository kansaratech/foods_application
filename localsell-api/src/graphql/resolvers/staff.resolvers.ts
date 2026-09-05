import { IResolvers } from '@graphql-tools/utils';
import { Prisma, User } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { hashPassword } from '../../services/auth.service';
import { notFoundError, userInputError } from '../../utils/errors';
import { recordAudit } from '../../utils/audit';

interface StaffInputArgs {
  _id?: string;
  name?: string;
  email: string;
  phone?: string;
  isActive?: boolean;
  permissions?: string[];
  password?: string;
}

export const staffResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    staffs: (_parent, _args, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.user.findMany({ where: { userType: 'STAFF' } });
    },
    staffsPaginated: async (
      _parent,
      args: { page?: number; limit?: number; search?: string; isActive?: boolean },
      context,
    ) => {
      requireRole(context, ['ADMIN']);
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where: Prisma.UserWhereInput = {
        userType: 'STAFF',
        ...(args.search ? { name: { contains: args.search } } : {}),
        ...(args.isActive != null ? { isActive: args.isActive } : {}),
      };
      const [data, totalCount] = await Promise.all([
        prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.user.count({ where }),
      ]);
      return { data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) };
    },
  },

  Mutation: {
    createStaff: async (_parent, args: { staffInput: StaffInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      const input = args.staffInput;
      const existing = await prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw userInputError('Email is already registered');
      const created = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          isActive: input.isActive ?? true,
          permissions: input.permissions ?? [],
          password: input.password ? await hashPassword(input.password) : undefined,
          userType: 'STAFF',
        },
      });
      await recordAudit(context, {
        action: 'staff.create',
        targetType: 'User',
        targetId: created.id,
        summary: `Staff created: ${input.email} · permissions: ${(input.permissions ?? []).join(', ') || 'none'}`,
      });
      return created;
    },
    editStaff: async (_parent, args: { staffInput: StaffInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      const input = args.staffInput;
      if (!input._id) throw notFoundError('Staff _id is required to edit');
      const before = await prisma.user.findUnique({ where: { id: input._id } });
      const updated = await prisma.user.update({
        where: { id: input._id },
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          isActive: input.isActive,
          permissions: input.permissions,
          password: input.password ? await hashPassword(input.password) : undefined,
        },
      });
      await recordAudit(context, {
        action: 'staff.update',
        targetType: 'User',
        targetId: input._id,
        summary: `Staff updated: ${updated.email}${input.password ? ' (password changed)' : ''}`,
        changes: {
          isActive: [before?.isActive, input.isActive],
          permissions: [before?.permissions ?? null, input.permissions ?? null],
        },
      });
      return updated;
    },
    deleteStaff: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      const deleted = await prisma.user.delete({ where: { id: args.id } });
      await recordAudit(context, {
        action: 'staff.delete',
        targetType: 'User',
        targetId: args.id,
        summary: `Staff deleted: ${deleted.email}`,
      });
      return deleted;
    },
  },

  Staff: {
    _id: (parent: User) => parent.id,
    permissions: (parent: User) => (Array.isArray(parent.permissions) ? parent.permissions : []),
  },
};
