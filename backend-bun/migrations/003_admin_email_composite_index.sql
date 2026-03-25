-- Change admin email unique constraint from (email) to (store_id, email)
-- This allows the same email to exist in different stores
ALTER TABLE store_admins DROP INDEX idx_store_admins_email;
ALTER TABLE store_admins ADD UNIQUE INDEX idx_store_admins_store_email (store_id, email);
