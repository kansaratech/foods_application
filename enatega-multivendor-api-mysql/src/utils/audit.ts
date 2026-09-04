import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { GraphQLContext } from '../context';

/**
 * Record one money- or access-level admin action. Call it AFTER the change has
 * been persisted. Never throws — an audit failure must not fail the mutation.
 *
 *   await recordAudit(context, {
 *     action: 'commission.rate.update',
 *     targetType: 'Restaurant', targetId: id,
 *     summary: `Commission rate ${before}% → ${after}% for ${name}`,
 *     changes: { commissionRate: [before, after] },
 *   });
 */
export async function recordAudit(
  context: GraphQLContext,
  entry: {
    action: string;
    targetType?: string;
    targetId?: string;
    summary?: string;
    changes?: unknown;
  },
): Promise<void> {
  try {
    const u = context.user;
    await prisma.auditLog.create({
      data: {
        actorId: u?.id ?? null,
        actorEmail: u?.email ?? null,
        actorType: u?.userType ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        summary: entry.summary ?? null,
        changes: (entry.changes ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error('[audit] failed to record', entry.action, (err as Error).message);
  }
}
