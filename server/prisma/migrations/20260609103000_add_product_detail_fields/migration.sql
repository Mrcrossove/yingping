ALTER TABLE `products`
  ADD COLUMN `detail_description` TEXT NULL,
  ADD COLUMN `detail_images` JSON NULL,
  ADD COLUMN `spec_text` TEXT NULL,
  ADD COLUMN `storage_text` TEXT NULL;
