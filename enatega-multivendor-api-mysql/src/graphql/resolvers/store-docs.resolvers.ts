import { IResolvers } from '@graphql-tools/utils';
import { Restaurant, StoreDocument } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { notFoundError, userInputError } from '../../utils/errors';
import { recordAudit } from '../../utils/audit';

const DOC_KINDS = ['FSSAI', 'GST', 'PAN', 'BANK'];
const DOC_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];
const REQUIRED_DOC_COUNT = DOC_KINDS.length;

async function assertCanEditStore(context: GraphQLContext, restaurantId: string) {
  const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
  if (currentUser.userType === 'ADMIN') return currentUser;
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || restaurant.ownerId !== currentUser.id) throw notFoundError('Restaurant not found');
  return currentUser;
}

function shape(doc: StoreDocument & { restaurant?: { name: string } }) {
  const extra = (doc.extra ?? {}) as Record<string, unknown>;
  return {
    _id: doc.id,
    restaurantId: doc.restaurantId,
    storeName: doc.restaurant?.name ?? null,
    kind: doc.kind,
    number: doc.number,
    fileUrl: doc.fileUrl,
    holderName: doc.holderName,
    ifsc: (extra.ifsc as string) ?? null,
    bankName: (extra.bankName as string) ?? null,
    expiryDate: (extra.expiryDate as string) ?? null,
    status: doc.status,
    reviewNote: doc.reviewNote,
    reviewedAt: doc.reviewedAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const storeDocsResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    storeDocuments: async (_parent, args: { restaurantId: string }, context) => {
      await assertCanEditStore(context, args.restaurantId);
      const docs = await prisma.storeDocument.findMany({
        where: { restaurantId: args.restaurantId },
        orderBy: { kind: 'asc' },
      });
      return docs.map((d) => shape(d));
    },

    pendingStoreDocuments: async (_parent, args: { page?: number; limit?: number }, context) => {
      requireRole(context, ['ADMIN']);
      const limit = args.limit ?? 50;
      const page = args.page ?? 1;
      const where = { status: 'PENDING' };
      const [docs, total] = await Promise.all([
        prisma.storeDocument.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
          include: { restaurant: { select: { name: true } } },
        }),
        prisma.storeDocument.count({ where }),
      ]);
      return { documents: docs.map((d) => shape(d)), total };
    },
  },

  Mutation: {
    upsertStoreDocument: async (
      _parent,
      args: {
        restaurantId: string;
        kind: string;
        number?: string;
        fileUrl?: string;
        holderName?: string;
        ifsc?: string;
        bankName?: string;
        expiryDate?: string;
      },
      context,
    ) => {
      await assertCanEditStore(context, args.restaurantId);
      const kind = args.kind.toUpperCase();
      if (!DOC_KINDS.includes(kind)) throw userInputError(`kind must be one of ${DOC_KINDS.join(', ')}`);

      const extra: Record<string, string> = {};
      if (args.ifsc) extra.ifsc = args.ifsc.trim();
      if (args.bankName) extra.bankName = args.bankName.trim();
      if (args.expiryDate) extra.expiryDate = args.expiryDate.trim();

      const data = {
        number: args.number?.trim() || null,
        fileUrl: args.fileUrl?.trim() || null,
        holderName: args.holderName?.trim() || null,
        extra: Object.keys(extra).length ? extra : undefined,
        // Any change puts the document back in the review queue.
        status: 'PENDING',
        reviewNote: null,
        reviewedById: null,
        reviewedAt: null,
      };

      const doc = await prisma.storeDocument.upsert({
        where: { restaurantId_kind: { restaurantId: args.restaurantId, kind } },
        create: { restaurantId: args.restaurantId, kind, ...data },
        update: data,
        include: { restaurant: { select: { name: true } } },
      });
      await recordAudit(context, {
        action: 'store.document.submit',
        targetType: 'Restaurant',
        targetId: args.restaurantId,
        summary: `${doc.restaurant?.name ?? 'Store'} submitted ${kind} document`,
      });
      return shape(doc);
    },

    reviewStoreDocument: async (
      _parent,
      args: { id: string; status: string; note?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN']);
      if (!DOC_STATUSES.includes(args.status)) {
        throw userInputError(`status must be one of ${DOC_STATUSES.join(', ')}`);
      }
      const existing = await prisma.storeDocument.findUnique({
        where: { id: args.id },
        include: { restaurant: { select: { name: true } } },
      });
      if (!existing) throw notFoundError('Document not found');

      const doc = await prisma.storeDocument.update({
        where: { id: args.id },
        data: {
          status: args.status,
          reviewNote: args.note ?? null,
          reviewedById: currentUser.id,
          reviewedAt: new Date(),
        },
        include: { restaurant: { select: { name: true } } },
      });
      await recordAudit(context, {
        action: 'store.document.review',
        targetType: 'Restaurant',
        targetId: existing.restaurantId,
        summary: `${existing.restaurant?.name ?? 'Store'} ${existing.kind}: ${existing.status} → ${args.status}`,
        changes: { note: args.note ?? null },
      });
      return shape(doc);
    },

    deleteStoreDocument: async (_parent, args: { id: string }, context) => {
      const doc = await prisma.storeDocument.findUnique({ where: { id: args.id } });
      if (!doc) throw notFoundError('Document not found');
      await assertCanEditStore(context, doc.restaurantId);
      await prisma.storeDocument.delete({ where: { id: args.id } });
      return true;
    },
  },

  Restaurant: {
    documentSummary: async (parent: Restaurant) => {
      const docs = await prisma.storeDocument.findMany({ where: { restaurantId: parent.id } });
      return {
        required: REQUIRED_DOC_COUNT,
        submitted: docs.length,
        verified: docs.filter((d) => d.status === 'VERIFIED').length,
        rejected: docs.filter((d) => d.status === 'REJECTED').length,
        pending: docs.filter((d) => d.status === 'PENDING').length,
      };
    },
  },
};
