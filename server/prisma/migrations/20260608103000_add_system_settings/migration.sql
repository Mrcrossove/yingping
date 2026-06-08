CREATE TABLE `system_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(80) NOT NULL,
  `value` VARCHAR(500) NULL,
  `description` VARCHAR(200) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `system_settings_key_key`(`key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `system_settings` (`key`, `value`, `description`)
VALUES ('customerServicePhone', '', '小程序订单联系业务员兜底客服电话')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

