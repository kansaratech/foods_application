import { IResolvers } from '@graphql-tools/utils';
import { RiderDocument } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { notFoundError, userInputError } from '../../utils/errors';
import { recordAudit } from '../../utils/audit';

// LICENSE and IDENTITY are KYC scans; BANK captures payout details (account
// holder, number, IFSC, bank name) the same way a vendor/store BANK
// document does. None of these block the rider from being created — they
// just start out PENDING for later review from the rider's profile.
const DOC_KINDS = ['LICENSE', 'IDENTITY', 'BANK'];
const DOC_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];
const REQUIRED_DOC_COUNT = DOC_KINDS.length;

async function assertCanEditRider(context: GraphQLContext, riderId: string) {
  const currentUser = requireRole(context, ['ADMIN', 'RIDER']);
  if (currentUser.userType === 'ADMIN') return currentUser;
  if (currentUser.id !== riderId) throw notFoundError('Rider not found');
  return currentUser;
}

function shape(doc: RiderDocument & { rider?: { name: string | null; email: string | null } }) {
  const extra = (doc.extra ?? {}) as Record<string, unknown>;
  return {
    _id: doc.id,
    riderId: doc.riderId,
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

export const riderDocsResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    riderDocuments: async (_parent, args: { riderId: string }, context) => {
      await assertCanEditRider(context, args.riderId);
      const docs = await prisma.riderDocument.findMany({
        where: { riderId: args.riderId },
        orderBy: { kind: 'asc' },
      });
      return docs.map((d) => shape(d));
    },

    pendingRiderDocuments: async (_parent, args: { page?: number; limit?: number }, context) => {
      requireRole(context, ['ADMIN']);
      const limit = args.limit ?? 50;
      const page = args.page ?? 1;
      const where = { status: 'PENDING' };
      const [docs, total] = await Promise.all([
        prisma.riderDocument.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
          include: { rider: { select: { name: true, email: true } } },
        }),
        prisma.riderDocument.count({ where }),
      ]);
      return { documents: docs.map((d) => shape(d)), total };
    },
  },

  Mutation: {
    upsertRiderDocument: async (
      _parent,
      args: {
        riderId: string;
        kind: string;
        number?: string;
        fileUrl?: string;
        holderName?: string;
        ifsc?: string;
        bankName?: string;
      },
      context,
    ) => {
      await assertCanEditRider(context, args.riderId);
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

      const doc = await prisma.riderDocument.upsert({
        where: { riderId_kind: { riderId: args.riderId, kind } },
        create: { riderId: args.riderId, kind, ...data },
        update: data,
        include: { rider: { select: { name: true, email: true } } },
      });
      await recordAudit(context, {
        action: 'rider.document.submit',
        targetType: 'User',
        targetId: args.riderId,
        summary: `${doc.rider?.name ?? doc.rider?.email ?? 'Rider'} submitted ${kind} document`,
      });
      return shape(doc);
    },

    reviewRiderDocument: async (_parent, args: { id: string; status: string; note?: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN']);
      if (!DOC_STATUSES.includes(args.status)) {
        throw userInputError(`status must be one of ${DOC_STATUSES.join(', ')}`);
      }
      const existing = await prisma.riderDocument.findUnique({
        where: { id: args.id },
        include: { rider: { select: { name: true, email: true } } },
      });
      if (!existing) throw notFoundError('Document not found');

      const doc = await prisma.riderDocument.update({
        where: { id: args.id },
        data: {
          status: args.status,
          reviewNote: args.note ?? null,
          reviewedById: currentUser.id,
          reviewedAt: new Date(),
        },
        include: { rider: { select: { name: true, email: true } } },
      });
      await recordAudit(context, {
        action: 'rider.document.review',
        targetType: 'User',
        targetId: existing.riderId,
        summary: `${existing.rider?.name ?? existing.rider?.email ?? 'Rider'} ${existing.kind}: ${existing.status} → ${args.status}`,
        changes: { note: args.note ?? null },
      });
      return shape(doc);
    },

    deleteRiderDocument: async (_parent, args: { id: string }, context) => {
      const doc = await prisma.riderDocument.findUnique({ where: { id: args.id } });
      if (!doc) throw notFoundError('Document not found');
      await assertCanEditRider(context, doc.riderId);
      await prisma.riderDocument.delete({ where: { id: args.id } });
      return true;
    },
  },

  Rider: {
    documentSummary: async (parent: { id?: string; _id?: string }) => {
      const riderId = parent.id ?? parent._id;
      if (!riderId) return { required: REQUIRED_DOC_COUNT, submitted: 0, verified: 0, rejected: 0, pending: 0 };
      const docs = await prisma.riderDocument.findMany({ where: { riderId } });
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

export const RIDER_REQUIRED_DOC_KINDS = DOC_KINDS;

// A rejected document is a real signal (fake license, mismatched bank
// holder, etc) — block the rider from going online or taking orders until
// it's resolved. Unsubmitted/PENDING documents do NOT block (mirrors the
// store-document rule: verification is a records workflow, not a launch
// gate) — only an explicit REJECTED does.
export async function assertRiderNotRejected(riderId: string): Promise<void> {
  const rejected = await prisma.riderDocument.findFirst({
    where: { riderId, status: 'REJECTED' },
  });
  if (rejected) {
    throw userInputError(
      `Your ${rejected.kind.toLowerCase()} document was rejected${rejected.reviewNote ? `: ${rejected.reviewNote}` : ''}. Contact support to resubmit before going online.`,
    );
  }
}
