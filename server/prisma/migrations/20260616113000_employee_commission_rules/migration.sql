SET @old_commission_rule_index := (
  SELECT INDEX_NAME
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'commission_rules'
    AND NON_UNIQUE = 0
    AND INDEX_NAME IN ('commission_rules_productId_role_key', 'commission_rules_product_id_role_key')
  LIMIT 1
);

SET @drop_old_commission_rule_index_sql := IF(
  @old_commission_rule_index IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE `commission_rules` DROP INDEX `', @old_commission_rule_index, '`')
);

PREPARE drop_old_commission_rule_index_stmt FROM @drop_old_commission_rule_index_sql;
EXECUTE drop_old_commission_rule_index_stmt;
DEALLOCATE PREPARE drop_old_commission_rule_index_stmt;

ALTER TABLE `commission_rules`
  ADD COLUMN `user_id` INTEGER NULL,
  ADD INDEX `commission_rules_user_id_idx` (`user_id`),
  ADD UNIQUE INDEX `commission_rules_product_id_role_user_id_key` (`product_id`, `role`, `user_id`);

ALTER TABLE `commission_rules`
  ADD CONSTRAINT `commission_rules_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
