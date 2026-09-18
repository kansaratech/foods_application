-- Tracks the refund of a cancelled order's Cashfree payment back to the
-- customer's original card/UPI.
ALTER TABLE `Order`
  ADD COLUMN `refundStatus` ENUM('NONE', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'NONE',
  ADD COLUMN `refundId` VARCHAR(191) NULL,
  ADD COLUMN `refundedAmount` DOUBLE NULL,
  ADD COLUMN `refundedAt` DATETIME(3) NULL,
  ADD COLUMN `refundError` TEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Order_refundId_key` ON `Order`(`refundId`);
