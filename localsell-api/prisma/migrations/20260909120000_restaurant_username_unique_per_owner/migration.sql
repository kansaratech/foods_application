-- A store's dashboard login (`username`, an email) was globally unique, which
-- blocked one vendor from running several outlets under the same login email
-- (QA #59). Drop the unique constraint; `restaurantLogin` now matches on
-- username + password, and each outlet carries its own password.

-- DropIndex
DROP INDEX `Restaurant_username_key` ON `Restaurant`;

-- CreateIndex (plain, non-unique — keeps username lookups fast)
CREATE INDEX `Restaurant_ownerId_username_idx` ON `Restaurant`(`ownerId`, `username`);
