ALTER TABLE `orders`
  ADD COLUMN `settlement_merchant_name` VARCHAR(100) NULL;

UPDATE `orders` o
LEFT JOIN `users` u ON u.`id` = o.`merchant_id`
LEFT JOIN `merchant_profiles` mp ON mp.`user_id` = o.`merchant_id`
SET o.`settlement_merchant_name` = COALESCE(NULLIF(mp.`shop_name`, ''), u.`real_name`)
WHERE o.`settlement_merchant_name` IS NULL;

CREATE INDEX `orders_settlement_merchant_name_idx` ON `orders`(`settlement_merchant_name`);
