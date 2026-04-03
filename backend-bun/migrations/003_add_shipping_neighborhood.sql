ALTER TABLE orders
  ADD COLUMN shipping_neighborhood VARCHAR(100) NOT NULL DEFAULT '' AFTER shipping_address;
