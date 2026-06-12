ALTER TABLE `orders`
  ADD COLUMN `settlement_type` ENUM('wechat', 'monthly') NOT NULL DEFAULT 'wechat',
  ADD COLUMN `settlement_status` ENUM('unpaid', 'paid', 'monthly_pending', 'monthly_settled', 'refunding', 'refunded') NOT NULL DEFAULT 'unpaid',
  ADD COLUMN `settled_at` DATETIME(3) NULL;
