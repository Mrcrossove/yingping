-- CreateTable
CREATE TABLE `feedbacks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `category` ENUM('suggestion', 'product', 'service', 'system', 'other') NOT NULL DEFAULT 'suggestion',
    `title` VARCHAR(100) NOT NULL,
    `content` TEXT NOT NULL,
    `contact_phone` VARCHAR(20) NULL,
    `status` ENUM('pending', 'processing', 'resolved', 'rejected') NOT NULL DEFAULT 'pending',
    `reply` TEXT NULL,
    `processed_by_id` INTEGER NULL,
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `feedbacks_user_id_idx`(`user_id`),
    INDEX `feedbacks_status_idx`(`status`),
    INDEX `feedbacks_category_idx`(`category`),
    INDEX `feedbacks_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `feedbacks` ADD CONSTRAINT `feedbacks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

