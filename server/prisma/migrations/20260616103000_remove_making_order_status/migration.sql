ALTER TABLE `orders`
  MODIFY COLUMN `status` ENUM('pending', 'accepted', 'made', 'delivering', 'delivered', 'completed', 'cancelled') NOT NULL DEFAULT 'pending';
