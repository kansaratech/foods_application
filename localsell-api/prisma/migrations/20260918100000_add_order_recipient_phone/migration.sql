-- Added to schema.prisma in e6b0d427 without a migration ever being
-- generated, so it never existed on the local dev DB — its absence made
-- EVERY Prisma full-row read of Order (any findUnique/create/update without
-- an explicit `select`) fail with P2022, discovered while wiring up refunds
-- via cancelOrder (which does exactly that).
ALTER TABLE `Order`
  ADD COLUMN `recipientPhone` VARCHAR(191) NULL;
