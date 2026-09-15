import { IResolvers } from "@graphql-tools/utils";
import { CommissionBill, CommissionPayment } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { GraphQLContext } from "../../context";
import { requireRole } from "../../middleware/auth";
import {
  billOutstanding,
  collectCommission,
  reportDates,
  roundMoney,
  PaymentInput,
} from "../../services/collections.service";
import { notFoundError } from "../../utils/errors";

export const collectionsResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    commissionCollectionOverview: async (_p, _args, context) => {
      requireRole(context, ["ADMIN"]);
      const [bills, unbilled, collected, receipts] = await Promise.all([
        prisma.commissionBill.findMany({
          where: { status: "PENDING" },
          orderBy: { createdAt: "asc" },
        }),
        prisma.commissionRecord.aggregate({
          where: { selfCollected: false, billId: null },
          _sum: { commissionAmount: true },
        }),
        prisma.commissionBill.aggregate({ _sum: { paidAmount: true } }),
        prisma.commissionPayment.findMany({
          take: 5,
          orderBy: { receivedAt: "desc" },
        }),
      ]);
      return {
        unbilled: unbilled._sum.commissionAmount ?? 0,
        outstanding: roundMoney(
          bills.reduce((n, b) => n + billOutstanding(b), 0),
        ),
        collected: collected._sum.paidAmount ?? 0,
        openBills: bills.length,
        vendorsOwing: new Set(bills.map((b) => b.vendorId)).size,
        pendingBills: bills.slice(0, 8),
        recentReceipts: receipts,
      };
    },
    commissionPayments: async (
      _p,
      args: {
        startDate?: string;
        endDate?: string;
        vendorId?: string;
        page?: number;
        limit?: number;
      },
      context,
    ) => {
      const user = requireRole(context, ["ADMIN", "VENDOR"]);
      if (
        user.userType === "VENDOR" &&
        args.vendorId &&
        args.vendorId !== user.id
      )
        throw notFoundError("Vendor not found");
      const vendorId = user.userType === "VENDOR" ? user.id : args.vendorId;
      const where = {
        ...(vendorId ? { vendorId } : {}),
        receivedAt: reportDates(args.startDate, args.endDate),
      };
      const limit = Math.min(100, Math.max(1, args.limit ?? 25)),
        page = Math.max(1, args.page ?? 1);
      const [payments, total] = await Promise.all([
        prisma.commissionPayment.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { receivedAt: "desc" },
        }),
        prisma.commissionPayment.count({ where }),
      ]);
      return { payments, total };
    },
  },
  Mutation: {
    recordCommissionPayment: (_p, args: PaymentInput, context) =>
      collectCommission(args, requireRole(context, ["ADMIN"]).id),
  },
  CommissionBill: {
    outstandingAmount: (bill: CommissionBill) => billOutstanding(bill),
    payments: (bill: CommissionBill) =>
      prisma.commissionPayment.findMany({
        where: { billId: bill.id },
        orderBy: { receivedAt: "desc" },
      }),
  },
  CommissionPayment: {
    _id: (p: CommissionPayment) => p.id,
    receiptNumber: (p: CommissionPayment) => `LS-RCPT-${p.id.toUpperCase()}`,
    receivedAt: (p: CommissionPayment) => p.receivedAt.toISOString(),
    createdAt: (p: CommissionPayment) => p.createdAt.toISOString(),
    invoiceNumber: async (p: CommissionPayment) =>
      (await prisma.commissionBill.findUnique({ where: { id: p.billId } }))
        ?.invoiceNumber,
    vendor: async (p: CommissionPayment) => {
      const v = await prisma.user.findUnique({ where: { id: p.vendorId } });
      return v
        ? { _id: v.id, name: v.name, email: v.email, phone: v.phone }
        : null;
    },
  },
};
