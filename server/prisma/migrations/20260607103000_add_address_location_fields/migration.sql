ALTER TABLE `addresses`
  ADD COLUMN `location_name` VARCHAR(100) NULL,
  ADD COLUMN `latitude` DECIMAL(10, 6) NULL,
  ADD COLUMN `longitude` DECIMAL(10, 6) NULL,
  ADD COLUMN `adcode` VARCHAR(12) NULL;

ALTER TABLE `orders`
  ADD COLUMN `receiver_location_name` VARCHAR(100) NULL,
  ADD COLUMN `receiver_latitude` DECIMAL(10, 6) NULL,
  ADD COLUMN `receiver_longitude` DECIMAL(10, 6) NULL,
  ADD COLUMN `receiver_adcode` VARCHAR(12) NULL;

