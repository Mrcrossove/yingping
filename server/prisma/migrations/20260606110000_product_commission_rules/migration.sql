CREATE TABLE `_commission_rules_product_migration` (
  `product_id` INT NOT NULL,
  `role` ENUM('boss', 'admin', 'salesperson', 'maker', 'delivery', 'promoter', 'merchant', 'other') NOT NULL,
  `type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  `value` DECIMAL(10, 2) NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY `_commission_rules_product_migration_product_role_key` (`product_id`, `role`)
);

INSERT IGNORE INTO `_commission_rules_product_migration` (`product_id`, `role`, `type`, `value`, `created_at`, `updated_at`)
SELECT
  p.`id`,
  cr.`role`,
  'percentage',
  cr.`percentage`,
  cr.`created_at`,
  CURRENT_TIMESTAMP(3)
FROM `commission_rules` cr
JOIN `products` p ON p.`category_id` = cr.`category_id`;

DELETE FROM `commission_rules`;

SET @old_category_fk := (
  SELECT `CONSTRAINT_NAME`
  FROM `information_schema`.`KEY_COLUMN_USAGE`
  WHERE `TABLE_SCHEMA` = DATABASE()
    AND `TABLE_NAME` = 'commission_rules'
    AND `COLUMN_NAME` = 'category_id'
    AND `REFERENCED_TABLE_NAME` IS NOT NULL
  LIMIT 1
);
SET @drop_category_fk_sql := IF(
  @old_category_fk IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE `commission_rules` DROP FOREIGN KEY `', @old_category_fk, '`')
);
PREPARE drop_category_fk_stmt FROM @drop_category_fk_sql;
EXECUTE drop_category_fk_stmt;
DEALLOCATE PREPARE drop_category_fk_stmt;

SET @old_category_unique_index := (
  SELECT `INDEX_NAME`
  FROM `information_schema`.`STATISTICS`
  WHERE `TABLE_SCHEMA` = DATABASE()
    AND `TABLE_NAME` = 'commission_rules'
    AND `NON_UNIQUE` = 0
  GROUP BY `INDEX_NAME`
  HAVING SUM(`COLUMN_NAME` = 'category_id') > 0
    AND SUM(`COLUMN_NAME` = 'role') > 0
  LIMIT 1
);
SET @drop_category_unique_index_sql := IF(
  @old_category_unique_index IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE `commission_rules` DROP INDEX `', @old_category_unique_index, '`')
);
PREPARE drop_category_unique_index_stmt FROM @drop_category_unique_index_sql;
EXECUTE drop_category_unique_index_stmt;
DEALLOCATE PREPARE drop_category_unique_index_stmt;

ALTER TABLE `commission_rules`
  DROP COLUMN `category_id`,
  DROP COLUMN `percentage`,
  ADD COLUMN `product_id` INT NOT NULL,
  ADD COLUMN `type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  ADD COLUMN `value` DECIMAL(10, 2) NOT NULL,
  ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

INSERT INTO `commission_rules` (`product_id`, `role`, `type`, `value`, `created_at`, `updated_at`)
SELECT `product_id`, `role`, `type`, `value`, `created_at`, `updated_at`
FROM `_commission_rules_product_migration`;

DROP TABLE `_commission_rules_product_migration`;

CREATE UNIQUE INDEX `commission_rules_product_id_role_key` ON `commission_rules`(`product_id`, `role`);

ALTER TABLE `commission_rules`
  ADD CONSTRAINT `commission_rules_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
