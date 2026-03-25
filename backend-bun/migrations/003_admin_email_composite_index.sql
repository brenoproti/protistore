-- Change admin email unique constraint from (email) to (store_id, email)
-- This allows the same email to exist in different stores

-- Drop old index only if it exists
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_admins' AND INDEX_NAME = 'idx_store_admins_email');
SET @sql = IF(@exists > 0, 'ALTER TABLE store_admins DROP INDEX idx_store_admins_email', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add composite index only if it doesn't exist
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_admins' AND INDEX_NAME = 'idx_store_admins_store_email');
SET @sql = IF(@exists = 0, 'ALTER TABLE store_admins ADD UNIQUE INDEX idx_store_admins_store_email (store_id, email)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
