ALTER TABLE orders
  ADD COLUMN delivery_method VARCHAR(20) NOT NULL DEFAULT 'delivery',
  ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'pix',
  ADD COLUMN change_for DECIMAL(10,2) NULL;
