import { IResolvers } from "@graphql-tools/utils";
import { VendorPayable, VendorPayout } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { GraphQLContext } from "../../context";
import { requireRole } from "../../middleware/auth";
import { payVendorPayables, VendorPayoutInput } from "../../services/vendor-payout.service";
import { roundMoney } from "../../services/collections.service";

export const vendorPayoutResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    vendorPayables: async (
      _p,
      args: { vendorId?: string; status?: string; page?: number; limit?: number },
      context,
    ) => {
      const user = requireRole(context, ["ADMIN", "VENDOR"]);
      const vendorId = user.userType === "VENDOR" ? user.id : args.vendorId;
      const page = args.page && args.page > 0 ? args.page : 1;
      const limit = Math.min(100, Math.max(1, args.limit ?? 25));
      const where = {
        ...(vendorId ? { vendorId } : {}),
        ...(args.status ? { status: args.status } : {}),
      };
      const [payables, total] = await Promise.all([
        prisma.vendorPayable.findMany({
          where,
          orderBy: { orderDeliveredAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.vendorPayable.count({ where }),
      ]);
      return { payables, total };
    },

    vendorPayoutOverview: async (_p, _args, context) => {
      requireRole(context, ["ADMIN"]);
      const [pending, recentPayouts] = await Promise.all([
        prisma.vendorPayable.findMany({ where: { status: "PENDING" } }),
        prisma.vendorPayout.findMany({ take: 5, orderBy: { paidAt: "desc" } }),
      ]);
      return {
        pendingTotal: roundMoney(pending.reduce((s, p) => s + p.netPayable, 0)),
        pendingOrderCount: pending.length,
        vendorsOwed: new Set(pending.map((p) => p.vendorId)).size,
        recentPayouts,
      };
    },
  },

  Mutation: {
    recordVendorPayout: (_p, args: VendorPayoutInput, context) =>
      payVendorPayables(args, requireRole(context, ["ADMIN"]).id),
  },

  VendorPayable: {
    _id: (p: VendorPayable) => p.id,
    orderDeliveredAt: (p: VendorPayable) => p.orderDeliveredAt.toISOString(),
    createdAt: (p: VendorPayable) => p.createdAt.toISOString(),
    vendor: async (p: VendorPayable) => {
      const v = await prisma.user.findUnique({ where: { id: p.vendorId } });
      return v ? { _id: v.id, name: v.name, email: v.email, phone: v.phone } : null;
    },
    storeName: async (p: VendorPayable) => {
      const r = await prisma.restaurant.findUnique({ where: { id: p.restaurantId } });
      return r?.name ?? null;
    },
  },

  VendorPayout: {
    _id: (p: VendorPayout) => p.id,
    paidAt: (p: VendorPayout) => p.paidAt.toISOString(),
    createdAt: (p: VendorPayout) => p.createdAt.toISOString(),
    vendor: async (p: VendorPayout) => {
      const v = await prisma.user.findUnique({ where: { id: p.vendorId } });
      return v ? { _id: v.id, name: v.name, email: v.email, phone: v.phone } : null;
    },
  },
};
