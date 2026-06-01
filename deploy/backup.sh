#!/bin/bash
# 数据库自动备份脚本
# crontab: 0 2 * * * /opt/beverage-order/deploy/backup.sh
# 每天凌晨2点执行

BACKUP_DIR="/opt/beverage-order/backups"
DB_NAME="beverage_order"
DB_USER="beverage"
DB_PASS="Beverage2024!"
KEEP_DAYS=30

mkdir -p "$BACKUP_DIR"

FILENAME="${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql.gz"
mysqldump -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > "$BACKUP_DIR/$FILENAME"

# 删除30天前的备份
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$KEEP_DAYS -delete

echo "[$(date)] Backup completed: $FILENAME"
