CREATE TABLE `withdrawal_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `withdrawal_id` INT NOT NULL,
  `earning_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `withdrawal_items_earning_id_key`(`earning_id`),
  INDEX `withdrawal_items_withdrawal_id_idx`(`withdrawal_id`),
  INDEX `withdrawal_items_user_id_idx`(`user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `withdrawal_items`
  ADD CONSTRAINT `withdrawal_items_withdrawal_id_fkey`
  FOREIGN KEY (`withdrawal_id`) REFERENCES `withdrawals`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `withdrawal_items`
  ADD CONSTRAINT `withdrawal_items_earning_id_fkey`
  FOREIGN KEY (`earning_id`) REFERENCES `earnings`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `withdrawal_items`
  ADD CONSTRAINT `withdrawal_items_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

