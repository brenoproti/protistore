ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_neighborhood VARCHAR(100) NOT NULL DEFAULT '' AFTER shipping_address;
