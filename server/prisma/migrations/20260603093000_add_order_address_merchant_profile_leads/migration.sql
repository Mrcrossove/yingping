ALTER TABLE `orders`
  ADD COLUMN `address_id` INT NULL,
  ADD COLUMN `receiver_name` VARCHAR(30) NULL,
  ADD COLUMN `receiver_phone` VARCHAR(20) NULL,
  ADD COLUMN `receiver_address` VARCHAR(500) NULL;

CREATE TABLE `merchant_profiles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `shop_name` VARCHAR(100) NULL,
  `shop_address` VARCHAR(300) NULL,
  `description` TEXT NULL,
  `license_image` VARCHAR(500) NULL,
  `contact_name` VARCHAR(50) NULL,
  `contact_phone` VARCHAR(20) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `merchant_profiles_user_id_key` (`user_id`),
  CONSTRAINT `merchant_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `promoter_merchant_leads` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `promoter_id` INT NOT NULL,
  `merchant_name` VARCHAR(100) NOT NULL,
  `contact_name` VARCHAR(50) NULL,
  `phone` VARCHAR(20) NOT NULL,
  `address` VARCHAR(300) NULL,
  `remark` VARCHAR(500) NULL,
  `status` ENUM('pending', 'followed', 'converted', 'rejected') NOT NULL DEFAULT 'pending',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `promoter_merchant_leads_promoter_id_phone_key` (`promoter_id`, `phone`),
  CONSTRAINT `promoter_merchant_leads_promoter_id_fkey` FOREIGN KEY (`promoter_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
