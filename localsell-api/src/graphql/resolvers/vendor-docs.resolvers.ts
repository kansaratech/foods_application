import { IResolvers } from '@graphql-tools/utils';
import { User, VendorDocument } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { notFoundError, userInputError } from '../../utils/errors';
import { recordAudit } from '../../utils/audit';

// PAN and GST certificate are KYC scans; BANK captures payout details
// (account holder, number, IFSC, bank name) the same way a store's BANK
// document does. Unlike stores, none of these block the vendor from being
// created — they just start out PENDING for later review.
const DOC_KINDS = ['PAN', 'GST', 'BANK'];
const DOC_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];
const REQUIRED_DOC_COUNT = DOC_KINDS.length;

async function assertCanEditVendor(context: GraphQLContext, vendorId: string) {
  const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
  if (currentUser.userType === 'ADMIN') return currentUser;
  if (currentUser.id !== vendorId) throw notFoundError('Vendor not found');
  return currentUser;
}

function shape(doc: VendorDocument & { vendor?: { name: string | null; email: string | null } }) {
  const extra = (doc.extra ?? {}) as Record<string, unknown>;
  return {
    _id: doc.id,
    vendorId: doc.vendorId,
    kind: doc.kind,
    number: doc.number,
    fileUrl: doc.fileUrl,
    holderName: doc.holderName,
    ifsc: (extra.ifsc as string) ?? null,
    bankName: (extra.bankName as string) ?? null,
    status: doc.status,
    reviewNote: doc.reviewNote,
    reviewedAt: doc.reviewedAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const vendorDocsResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    vendorDocuments: async (_parent, args: { vendorId: string }, context) => {
      await assertCanEditVendor(context, args.vendorId);
      const docs = await prisma.vendorDocument.findMany({
        where: { vendorId: args.vendorId },
        orderBy: { kind: 'asc' },
      });
      return docs.map((d) => shape(d));
    },

    pendingVendorDocuments: async (_parent, args: { page?: number; limit?: number }, context) => {
      requireRole(context, ['ADMIN']);
      const limit = args.limit ?? 50;
      const page = args.page ?? 1;
      const where = { status: 'PENDING' };
      const [docs, total] = await Promise.all([
        prisma.vendorDocument.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
          include: { vendor: { select: { name: true, email: true } } },
        }),
        prisma.vendorDocument.count({ where }),
      ]);
      return { documents: docs.map((d) => shape(d)), total };
    },
  },

  Mutation: {
    upsertVendorDocument: async (
      _parent,
      args: {
        vendorId: string;
        kind: string;
        number?: string;
        fileUrl?: string;
        holderName?: string;
        ifsc?: string;
        bankName?: string;
      },
      context,
    ) => {
      await assertCanEditVendor(context, args.vendorId);
      const kind = args.kind.toUpperCase();
      if (!DOC_KINDS.includes(kind)) throw userInputError(`kind must be one of ${DOC_KINDS.join(', ')}`);

      const extra: Record<string, string> = {};
      if (args.ifsc) extra.ifsc = args.ifsc.trim();
      if (args.bankName) extra.bankName = args.bankName.trim();

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

      const doc = await prisma.vendorDocument.upsert({
        where: { vendorId_kind: { vendorId: args.vendorId, kind } },
        create: { vendorId: args.vendorId, kind, ...data },
        update: data,
        include: { vendor: { select: { name: true, email: true } } },
      });
      await recordAudit(context, {
        action: 'vendor.document.submit',
        targetType: 'User',
        targetId: args.vendorId,
        summary: `${doc.vendor?.name ?? doc.vendor?.email ?? 'Vendor'} submitted ${kind} document`,
      });
      return shape(doc);
    },

    reviewVendorDocument: async (_parent, args: { id: string; status: string; note?: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN']);
      if (!DOC_STATUSES.includes(args.status)) {
        throw userInputError(`status must be one of ${DOC_STATUSES.join(', ')}`);
      }
      const existing = await prisma.vendorDocument.findUnique({
        where: { id: args.id },
        include: { vendor: { select: { name: true, email: true } } },
      });
      if (!existing) throw notFoundError('Document not found');

      const doc = await prisma.vendorDocument.update({
        where: { id: args.id },
        data: {
          status: args.status,
          reviewNote: args.note ?? null,
          reviewedById: currentUser.id,
          reviewedAt: new Date(),
        },
        include: { vendor: { select: { name: true, email: true } } },
      });
      await recordAudit(context, {
        action: 'vendor.document.review',
        targetType: 'User',
        targetId: existing.vendorId,
        summary: `${existing.vendor?.name ?? existing.vendor?.email ?? 'Vendor'} ${existing.kind}: ${existing.status} → ${args.status}`,
        changes: { note: args.note ?? null },
      });
      return shape(doc);
    },

    deleteVendorDocument: async (_parent, args: { id: string }, context) => {
      const doc = await prisma.vendorDocument.findUnique({ where: { id: args.id } });
      if (!doc) throw notFoundError('Document not found');
      await assertCanEditVendor(context, doc.vendorId);
      await prisma.vendorDocument.delete({ where: { id: args.id } });
      return true;
    },
  },

  Vendor: {
    documentSummary: async (parent: { id?: string; _id?: string }) => {
      const vendorId = parent.id ?? parent._id;
      if (!vendorId) return { required: REQUIRED_DOC_COUNT, submitted: 0, verified: 0, rejected: 0, pending: 0 };
      const docs = await prisma.vendorDocument.findMany({ where: { vendorId } });
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
