-- Store-registration fields required by the three-step admin wizard.
ALTER TABLE `Restaurant`
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `state` VARCHAR(191) NULL;
