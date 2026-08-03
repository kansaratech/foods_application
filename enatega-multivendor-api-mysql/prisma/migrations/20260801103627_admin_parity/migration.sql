-- AlterTable
ALTER TABLE `food` ADD COLUMN `subCategoryId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `restaurant` ADD COLUMN `boundType` VARCHAR(191) NULL,
    ADD COLUMN `bussinessDetails` JSON NULL,
    ADD COLUMN `circleBounds` JSON NULL,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `currentWalletAmount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `deliveryBounds` JSON NULL,
    ADD COLUMN `postCode` VARCHAR(191) NULL,
    ADD COLUMN `stripeDetailsSubmitted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `totalWalletAmount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `withdrawnWalletAmount` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `shoptype` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `permissions` JSON NULL,
    ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0,
    MODIFY `userType` ENUM('CUSTOMER', 'VENDOR', 'ADMIN', 'RIDER', 'STAFF') NOT NULL DEFAULT 'CUSTOMER';

-- CreateTable
CREATE TABLE `Zone` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `boundary` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiderProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `vehicleType` VARCHAR(191) NULL,
    `available` BOOLEAN NOT NULL DEFAULT true,
    `assigned` JSON NULL,
    `zoneId` VARCHAR(191) NULL,
    `licenseDetails` JSON NULL,
    `vehicleDetails` JSON NULL,
    `bussinessDetails` JSON NULL,
    `currentWalletAmount` DOUBLE NOT NULL DEFAULT 0,
    `totalWalletAmount` DOUBLE NOT NULL DEFAULT 0,
    `withdrawnWalletAmount` DOUBLE NOT NULL DEFAULT 0,

    UNIQUE INDEX `RiderProfile_userId_key`(`userId`),
    INDEX `RiderProfile_zoneId_idx`(`zoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubCategory` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `parentCategoryId` VARCHAR(191) NOT NULL,

    INDEX `SubCategory_parentCategoryId_idx`(`parentCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Coupon` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `discount` DOUBLE NOT NULL DEFAULT 0,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `lifeTimeActive` BOOLEAN NOT NULL DEFAULT false,
    `restaurantId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Coupon_restaurantId_idx`(`restaurantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Banner` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `action` VARCHAR(191) NULL,
    `screen` VARCHAR(191) NULL,
    `file` VARCHAR(191) NULL,
    `parameters` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Food_subCategoryId_idx` ON `Food`(`subCategoryId`);

-- AddForeignKey
ALTER TABLE `Food` ADD CONSTRAINT `Food_subCategoryId_fkey` FOREIGN KEY (`subCategoryId`) REFERENCES `SubCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiderProfile` ADD CONSTRAINT `RiderProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiderProfile` ADD CONSTRAINT `RiderProfile_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `Zone`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubCategory` ADD CONSTRAINT `SubCategory_parentCategoryId_fkey` FOREIGN KEY (`parentCategoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Coupon` ADD CONSTRAINT `Coupon_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
