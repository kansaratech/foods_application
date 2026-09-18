-- Cashfree's own order_id for the CURRENT payment attempt (added to
-- schema.prisma in 8d0ecde8 without ever generating this migration, so the
-- column never actually existed on the local dev DB — found while wiring up
-- order refunds, which also key off this).
ALTER TABLE `Order`
  ADD COLUMN `cashfreeOrderId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Order_cashfreeOrderId_key` ON `Order`(`cashfreeOrderId`);
