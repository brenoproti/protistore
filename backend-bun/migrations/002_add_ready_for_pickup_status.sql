ALTER TABLE orders
  MODIFY COLUMN status ENUM('pending', 'confirmed', 'processing', 'shipped', 'ready_for_pickup', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending';
