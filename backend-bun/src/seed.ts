import { getPool, runMigrations, type ResultSetHeader, type RowDataPacket } from "./db";
import { hashPassword } from "./services/auth";

interface InsertedProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  imageURL: string;
}

async function main() {
  console.log("=== Proti Store Seed Script ===");

  const pool = getPool();
  await pool.query("SELECT 1");
  console.log("Connected to MySQL successfully.");

  console.log("\n--- Running migrations ---");
  await runMigrations();
  console.log("All migrations applied.");

  // Check if demo store already exists
  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM stores WHERE slug = ?",
    ["protistore"]
  );
  if (existing.length > 0) {
    console.log(`\nDemo store already exists (id=${existing[0].id}, slug=protistore). Skipping seed.`);
    process.exit(0);
  }

  // Create store
  console.log("\n--- Creating demo store ---");
  const [storeRes] = await pool.query<ResultSetHeader>(
    `INSERT INTO stores (name, slug, description, logo_url, favicon_url, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "Proti Store",
      "protistore",
      "Your one-stop shop for everything trending. Quality products, unbeatable prices, and fast shipping.",
      "https://picsum.photos/seed/protistore-logo/200/200",
      "https://picsum.photos/seed/protistore-favicon/32/32",
      true,
    ]
  );
  const storeId = storeRes.insertId;
  console.log(`  Created store "Proti Store" (id=${storeId})`);

  // Customization
  console.log("\n--- Creating store customization ---");
  await pool.query(
    `INSERT INTO store_customizations
     (store_id, primary_color, accent_color, header_bg_color, footer_bg_color)
     VALUES (?, ?, ?, ?, ?)`,
    [storeId, "#6366f1", "#f59e0b", "#ffffff", "#1f2937"]
  );
  console.log("  Store customization created.");

  // Admin user
  console.log("\n--- Creating admin user ---");
  const hash = await hashPassword("password123");
  await pool.query(
    `INSERT INTO store_admins (store_id, name, email, password_hash, is_active) VALUES (?, ?, ?, ?, ?)`,
    [storeId, "Store Admin", "admin@protistore.com", hash, true]
  );
  console.log("  Admin user created (admin@protistore.com / password123)");

  // Categories
  console.log("\n--- Creating categories ---");
  const categories = [
    { name: "Electronics", slug: "electronics", description: "Discover the latest gadgets, devices, and tech accessories.", subcats: [
      { name: "Smartphones", slug: "smartphones", description: "Latest smartphones from top brands with cutting-edge features." },
      { name: "Laptops", slug: "laptops", description: "Powerful laptops for work, gaming, and everyday use." },
    ]},
    { name: "Fashion", slug: "fashion", description: "Trendy clothing and accessories for every style.", subcats: [
      { name: "Men's Wear", slug: "mens-wear", description: "Stylish and comfortable clothing for men." },
      { name: "Women's Wear", slug: "womens-wear", description: "Elegant and fashionable clothing for women." },
    ]},
    { name: "Home & Garden", slug: "home-garden", description: "Everything you need to make your home beautiful and comfortable.", subcats: [] },
    { name: "Sports & Outdoors", slug: "sports-outdoors", description: "Gear up for your next adventure or workout session.", subcats: [] },
    { name: "Books & Media", slug: "books-media", description: "Explore a wide selection of books, music, and digital media.", subcats: [] },
    { name: "Health & Beauty", slug: "health-beauty", description: "Premium health, wellness, and beauty products for self-care.", subcats: [] },
  ];

  const categoryMap = new Map<string, number>();

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const [res] = await pool.query<ResultSetHeader>(
      `INSERT INTO categories (store_id, parent_id, name, slug, description, image_url, sort_order, is_active)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?)`,
      [storeId, cat.name, cat.slug, cat.description, `https://picsum.photos/seed/cat-${cat.slug}/400/400`, i + 1, true]
    );
    const parentId = res.insertId;
    categoryMap.set(cat.slug, parentId);
    console.log(`  Created category "${cat.name}" (id=${parentId})`);

    for (let j = 0; j < cat.subcats.length; j++) {
      const sub = cat.subcats[j];
      const [subRes] = await pool.query<ResultSetHeader>(
        `INSERT INTO categories (store_id, parent_id, name, slug, description, image_url, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [storeId, parentId, sub.name, sub.slug, sub.description, `https://picsum.photos/seed/cat-${sub.slug}/400/400`, j + 1, true]
      );
      categoryMap.set(sub.slug, subRes.insertId);
      console.log(`    Created subcategory "${sub.name}" (id=${subRes.insertId})`);
    }
  }

  // Brands
  console.log("\n--- Creating brands ---");
  const brands = [
    { name: "Apple", slug: "apple" },
    { name: "Samsung", slug: "samsung" },
    { name: "Nike", slug: "nike" },
    { name: "Adidas", slug: "adidas" },
    { name: "Sony", slug: "sony" },
    { name: "Canon", slug: "canon" },
  ];

  const brandMap = new Map<string, number>();
  for (const b of brands) {
    const [res] = await pool.query<ResultSetHeader>(
      `INSERT INTO brands (store_id, name, slug, logo_url, is_active) VALUES (?, ?, ?, ?, ?)`,
      [storeId, b.name, b.slug, `https://picsum.photos/seed/brand-${b.slug}/200/200`, true]
    );
    brandMap.set(b.slug, res.insertId);
    console.log(`  Created brand "${b.name}" (id=${res.insertId})`);
  }

  // Products
  console.log("\n--- Creating products ---");
  const products = [
    { name: "iPhone 15 Pro Max", slug: "iphone-15-pro-max", description: "The most powerful iPhone ever with A17 Pro chip, titanium design, and an advanced camera system for stunning photos and videos.", price: 1199.00, compareAtPrice: 1299.00, costPrice: 899.00, sku: "ELEC-APL-001", stock: 45, isFeatured: true, categorySlug: "smartphones", brandSlug: "apple" },
    { name: "Samsung Galaxy S24 Ultra", slug: "samsung-galaxy-s24-ultra", description: "Experience Galaxy AI with the most powerful Galaxy smartphone. Features a built-in S Pen, 200MP camera, and titanium frame.", price: 1099.00, compareAtPrice: 1199.00, costPrice: 820.00, sku: "ELEC-SAM-001", stock: 38, isFeatured: true, categorySlug: "smartphones", brandSlug: "samsung" },
    { name: "iPhone 15", slug: "iphone-15", description: "Dynamic Island, 48MP camera, and USB-C. A new era of iPhone with the powerful A16 Bionic chip.", price: 799.00, compareAtPrice: null, costPrice: 580.00, sku: "ELEC-APL-002", stock: 60, isFeatured: false, categorySlug: "smartphones", brandSlug: "apple" },
    { name: "Samsung Galaxy A54", slug: "samsung-galaxy-a54", description: "Awesome Galaxy experience with a stunning Super AMOLED display, versatile triple camera, and long-lasting battery.", price: 449.00, compareAtPrice: 499.00, costPrice: 310.00, sku: "ELEC-SAM-002", stock: 75, isFeatured: false, categorySlug: "smartphones", brandSlug: "samsung" },
    { name: "MacBook Pro 16\" M3 Max", slug: "macbook-pro-16-m3-max", description: "Supercharged by M3 Max with up to 128GB unified memory. The most powerful MacBook Pro ever with stunning Liquid Retina XDR display.", price: 3499.00, compareAtPrice: null, costPrice: 2800.00, sku: "ELEC-APL-003", stock: 15, isFeatured: true, categorySlug: "laptops", brandSlug: "apple" },
    { name: "Samsung Galaxy Book4 Pro", slug: "samsung-galaxy-book4-pro", description: "Ultra-thin and lightweight laptop with Intel Core Ultra processor, vivid AMOLED display, and all-day battery life.", price: 1449.00, compareAtPrice: 1599.00, costPrice: 1050.00, sku: "ELEC-SAM-003", stock: 22, isFeatured: false, categorySlug: "laptops", brandSlug: "samsung" },
    { name: "Nike Dri-FIT Running Jacket", slug: "nike-dri-fit-running-jacket", description: "Lightweight and breathable running jacket with Dri-FIT technology to keep you dry and comfortable on every run.", price: 89.99, compareAtPrice: 110.00, costPrice: 45.00, sku: "FASH-NIK-001", stock: 120, isFeatured: false, categorySlug: "mens-wear", brandSlug: "nike" },
    { name: "Adidas Essentials Hoodie", slug: "adidas-essentials-hoodie", description: "Classic comfort meets modern style. This cozy fleece hoodie features the iconic 3-Stripes design and a kangaroo pocket.", price: 65.00, compareAtPrice: null, costPrice: 30.00, sku: "FASH-ADI-001", stock: 95, isFeatured: false, categorySlug: "mens-wear", brandSlug: "adidas" },
    { name: "Nike Tech Fleece Joggers", slug: "nike-tech-fleece-joggers", description: "Premium Nike Tech Fleece joggers with tapered leg design. Lightweight warmth and a sleek, modern silhouette.", price: 110.00, compareAtPrice: 130.00, costPrice: 55.00, sku: "FASH-NIK-002", stock: 80, isFeatured: true, categorySlug: "mens-wear", brandSlug: "nike" },
    { name: "Nike Air Max Dress", slug: "nike-air-max-dress", description: "A sporty yet elegant dress that blends athletic comfort with everyday style. Perfect for brunch or casual outings.", price: 75.00, compareAtPrice: 95.00, costPrice: 35.00, sku: "FASH-NIK-003", stock: 65, isFeatured: false, categorySlug: "womens-wear", brandSlug: "nike" },
    { name: "Adidas Ultraboost Leggings", slug: "adidas-ultraboost-leggings", description: "High-waisted performance leggings with Primeknit construction. Designed for comfort during workouts and beyond.", price: 80.00, compareAtPrice: null, costPrice: 38.00, sku: "FASH-ADI-002", stock: 110, isFeatured: false, categorySlug: "womens-wear", brandSlug: "adidas" },
    { name: "Sony WH-1000XM5 Headphones", slug: "sony-wh-1000xm5", description: "Industry-leading noise cancellation headphones with exceptional sound quality, 30-hour battery life, and ultra-comfortable design.", price: 349.99, compareAtPrice: 399.99, costPrice: 220.00, sku: "HOME-SNY-001", stock: 55, isFeatured: true, categorySlug: "home-garden", brandSlug: "sony" },
    { name: "Sony SRS-XB100 Portable Speaker", slug: "sony-srs-xb100", description: "Ultra-portable Bluetooth speaker with extra bass, IP67 waterproof rating, and 16-hour battery life. Take the party anywhere.", price: 59.99, compareAtPrice: null, costPrice: 32.00, sku: "HOME-SNY-002", stock: 140, isFeatured: false, categorySlug: "home-garden", brandSlug: "sony" },
    { name: "Canon PIXMA Wireless Printer", slug: "canon-pixma-wireless-printer", description: "Compact all-in-one wireless printer with vivid color printing, scanning, and copying. Easy mobile printing support.", price: 129.99, compareAtPrice: 159.99, costPrice: 78.00, sku: "HOME-CAN-001", stock: 35, isFeatured: false, categorySlug: "home-garden", brandSlug: "canon" },
    { name: "Nike Air Zoom Pegasus 41", slug: "nike-air-zoom-pegasus-41", description: "The workhorse running shoe returns with responsive Zoom Air cushioning, breathable mesh upper, and a secure midfoot fit.", price: 139.99, compareAtPrice: null, costPrice: 68.00, sku: "SPRT-NIK-001", stock: 90, isFeatured: true, categorySlug: "sports-outdoors", brandSlug: "nike" },
    { name: "Adidas Predator Elite FG", slug: "adidas-predator-elite-fg", description: "Dominate the pitch with Controlskin technology for unrivaled touch and precision. Firm ground football boots built for the best.", price: 299.99, compareAtPrice: null, costPrice: 150.00, sku: "SPRT-ADI-001", stock: 40, isFeatured: false, categorySlug: "sports-outdoors", brandSlug: "adidas" },
    { name: "Nike Brasilia Training Backpack", slug: "nike-brasilia-training-backpack", description: "Durable training backpack with multiple compartments, padded shoulder straps, and a ventilated shoe compartment.", price: 45.00, compareAtPrice: 55.00, costPrice: 22.00, sku: "SPRT-NIK-002", stock: 200, isFeatured: false, categorySlug: "sports-outdoors", brandSlug: "nike" },
    { name: "Adidas Tiro 23 Training Pants", slug: "adidas-tiro-23-training-pants", description: "Slim-fit training pants with AEROREADY moisture management, zip pockets, and the iconic 3-Stripes on the legs.", price: 55.00, compareAtPrice: 65.00, costPrice: 26.00, sku: "SPRT-ADI-002", stock: 150, isFeatured: false, categorySlug: "sports-outdoors", brandSlug: "adidas" },
    { name: "Sony WF-1000XM5 Earbuds", slug: "sony-wf-1000xm5-earbuds", description: "The world's best noise cancelling truly wireless earbuds. Exceptional sound with LDAC, all-day comfort, and crystal-clear calls.", price: 299.99, compareAtPrice: null, costPrice: 185.00, sku: "BOOK-SNY-001", stock: 70, isFeatured: false, categorySlug: "books-media", brandSlug: "sony" },
    { name: "Canon EOS R50 Mirrorless Camera", slug: "canon-eos-r50-mirrorless", description: "Compact and lightweight mirrorless camera with 24.2MP sensor, 4K video, and advanced autofocus. Perfect for content creators.", price: 679.99, compareAtPrice: 799.99, costPrice: 480.00, sku: "BOOK-CAN-001", stock: 25, isFeatured: false, categorySlug: "books-media", brandSlug: "canon" },
    { name: "Apple Watch Series 9", slug: "apple-watch-series-9", description: "The ultimate health and fitness companion with advanced sensors, S9 chip, and a brilliant always-on Retina display.", price: 399.00, compareAtPrice: 449.00, costPrice: 280.00, sku: "HLTH-APL-001", stock: 50, isFeatured: false, categorySlug: "health-beauty", brandSlug: "apple" },
    { name: "Samsung Galaxy Watch6 Classic", slug: "samsung-galaxy-watch6-classic", description: "Premium smartwatch with rotating bezel, advanced health monitoring, sleep coaching, and a stunning Super AMOLED display.", price: 349.99, compareAtPrice: 399.99, costPrice: 230.00, sku: "HLTH-SAM-001", stock: 42, isFeatured: false, categorySlug: "health-beauty", brandSlug: "samsung" },
    { name: "Nike Yoga Mat Premium", slug: "nike-yoga-mat-premium", description: "Extra-thick 5mm yoga mat with non-slip textured surface and alignment lines. Lightweight, durable, and easy to clean.", price: 49.99, compareAtPrice: null, costPrice: 18.00, sku: "HLTH-NIK-001", stock: 180, isFeatured: false, categorySlug: "health-beauty", brandSlug: "nike" },
    { name: "Canon PowerShot V10 Vlog Camera", slug: "canon-powershot-v10-vlog", description: "Pocket-sized vlog camera with a wide-angle lens, built-in stand, and stunning 4K video. Your perfect vlogging companion.", price: 429.99, compareAtPrice: 479.99, costPrice: 290.00, sku: "HLTH-CAN-001", stock: 30, isFeatured: false, categorySlug: "health-beauty", brandSlug: "canon" },
  ];

  const insertedProducts: InsertedProduct[] = [];

  for (const p of products) {
    const catId = categoryMap.get(p.categorySlug)!;
    const bId = brandMap.get(p.brandSlug)!;

    const [res] = await pool.query<ResultSetHeader>(
      `INSERT INTO products (store_id, category_id, brand_id, name, slug, description, price, compare_at_price, cost_price, sku, stock, is_active, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [storeId, catId, bId, p.name, p.slug, p.description, p.price, p.compareAtPrice, p.costPrice, p.sku, p.stock, true, p.isFeatured]
    );
    const prodId = res.insertId;

    const mainImage = `https://picsum.photos/seed/${p.slug}/800/800`;
    const secondImage = `https://picsum.photos/seed/${p.slug}-2/800/800`;

    await pool.query(
      `INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?)`,
      [prodId, mainImage, `${p.name} - Main Image`, 1]
    );
    await pool.query(
      `INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?)`,
      [prodId, secondImage, `${p.name} - Alternate View`, 2]
    );

    insertedProducts.push({ id: prodId, name: p.name, slug: p.slug, price: p.price, imageURL: mainImage });
    const tag = p.isFeatured ? " [FEATURED]" : "";
    console.log(`  Created product "${p.name}" (id=${prodId}, $${p.price.toFixed(2)})${tag}`);
  }

  // Banners
  console.log("\n--- Creating banners ---");
  const banners = [
    { title: "New Arrivals", subtitle: "Discover the latest products fresh off the shelf. Be the first to get your hands on what's new.", linkURL: "/products?sort=newest" },
    { title: "Summer Sale", subtitle: "Up to 50% off on selected items. Don't miss our biggest sale of the season!", linkURL: "/products?sale=true" },
    { title: "Free Shipping", subtitle: "Enjoy free shipping on all orders over $99. No code needed, applied automatically at checkout.", linkURL: "/products" },
    { title: "Tech Essentials", subtitle: "Upgrade your setup with the latest electronics and gadgets from top brands.", linkURL: "/categories/electronics" },
    { title: "Fitness Collection", subtitle: "Gear up for your fitness goals with premium sportswear and equipment.", linkURL: "/categories/sports-outdoors" },
    { title: "Member Exclusive", subtitle: "Sign up today and get 15% off your first order. Join thousands of happy Proti Store customers.", linkURL: "/register" },
  ];

  for (let i = 0; i < banners.length; i++) {
    const b = banners[i];
    await pool.query(
      `INSERT INTO banners (store_id, title, subtitle, image_url, link_url, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [storeId, b.title, b.subtitle, `https://picsum.photos/seed/banner-${i + 1}/1200/400`, b.linkURL, i + 1, true]
    );
    console.log(`  Created banner "${b.title}" (sort=${i + 1})`);
  }

  // Orders
  console.log("\n--- Creating sample orders ---");
  const orders = [
    { orderNumber: "PS-1001", status: "delivered", customerName: "Alice Johnson", customerEmail: "alice.johnson@email.com", customerPhone: "(555) 123-4567", shippingAddress: "123 Oak Street, Apt 4B", shippingCity: "New York", shippingState: "NY", shippingZip: "10001", shippingCost: 9.99, discount: 0, daysAgo: 28, items: [{ idx: 0, qty: 1 }, { idx: 11, qty: 1 }] },
    { orderNumber: "PS-1002", status: "delivered", customerName: "Bob Martinez", customerEmail: "bob.martinez@email.com", customerPhone: "(555) 234-5678", shippingAddress: "456 Maple Avenue", shippingCity: "Los Angeles", shippingState: "CA", shippingZip: "90001", shippingCost: 0, discount: 15.00, daysAgo: 25, items: [{ idx: 4, qty: 1 }] },
    { orderNumber: "PS-1003", status: "delivered", customerName: "Carol White", customerEmail: "carol.white@email.com", customerPhone: "(555) 345-6789", shippingAddress: "789 Pine Road", shippingCity: "Chicago", shippingState: "IL", shippingZip: "60601", shippingCost: 9.99, discount: 0, daysAgo: 22, items: [{ idx: 6, qty: 2 }, { idx: 8, qty: 1 }] },
    { orderNumber: "PS-1004", status: "shipped", customerName: "David Chen", customerEmail: "david.chen@email.com", customerPhone: "(555) 456-7890", shippingAddress: "321 Elm Boulevard, Suite 100", shippingCity: "San Francisco", shippingState: "CA", shippingZip: "94102", shippingCost: 9.99, discount: 20.00, daysAgo: 18, items: [{ idx: 1, qty: 1 }, { idx: 14, qty: 1 }] },
    { orderNumber: "PS-1005", status: "shipped", customerName: "Emily Davis", customerEmail: "emily.davis@email.com", customerPhone: "(555) 567-8901", shippingAddress: "654 Birch Lane", shippingCity: "Seattle", shippingState: "WA", shippingZip: "98101", shippingCost: 0, discount: 0, daysAgo: 15, items: [{ idx: 20, qty: 1 }, { idx: 22, qty: 1 }] },
    { orderNumber: "PS-1006", status: "processing", customerName: "Frank Wilson", customerEmail: "frank.wilson@email.com", customerPhone: "(555) 678-9012", shippingAddress: "987 Cedar Court", shippingCity: "Austin", shippingState: "TX", shippingZip: "73301", shippingCost: 9.99, discount: 0, daysAgo: 10, items: [{ idx: 14, qty: 1 }, { idx: 16, qty: 1 }, { idx: 17, qty: 1 }] },
    { orderNumber: "PS-1007", status: "processing", customerName: "Grace Kim", customerEmail: "grace.kim@email.com", customerPhone: "(555) 789-0123", shippingAddress: "147 Walnut Street", shippingCity: "Portland", shippingState: "OR", shippingZip: "97201", shippingCost: 0, discount: 10.00, daysAgo: 8, items: [{ idx: 9, qty: 1 }, { idx: 10, qty: 2 }] },
    { orderNumber: "PS-1008", status: "confirmed", customerName: "Henry Thompson", customerEmail: "henry.thompson@email.com", customerPhone: "(555) 890-1234", shippingAddress: "258 Spruce Drive", shippingCity: "Denver", shippingState: "CO", shippingZip: "80201", shippingCost: 9.99, discount: 0, daysAgo: 5, items: [{ idx: 3, qty: 1 }, { idx: 12, qty: 1 }] },
    { orderNumber: "PS-1009", status: "confirmed", customerName: "Isabel Garcia", customerEmail: "isabel.garcia@email.com", customerPhone: "(555) 901-2345", shippingAddress: "369 Ash Way, Unit 7", shippingCity: "Miami", shippingState: "FL", shippingZip: "33101", shippingCost: 0, discount: 5.00, daysAgo: 4, items: [{ idx: 18, qty: 1 }] },
    { orderNumber: "PS-1010", status: "pending", customerName: "Jack Brown", customerEmail: "jack.brown@email.com", customerPhone: "(555) 012-3456", shippingAddress: "741 Poplar Place", shippingCity: "Boston", shippingState: "MA", shippingZip: "02101", shippingCost: 9.99, discount: 0, daysAgo: 2, items: [{ idx: 2, qty: 1 }, { idx: 7, qty: 1 }] },
    { orderNumber: "PS-1011", status: "pending", customerName: "Karen Lee", customerEmail: "karen.lee@email.com", customerPhone: "(555) 123-7890", shippingAddress: "852 Willow Road", shippingCity: "Nashville", shippingState: "TN", shippingZip: "37201", shippingCost: 0, discount: 0, daysAgo: 1, items: [{ idx: 5, qty: 1 }, { idx: 19, qty: 1 }, { idx: 15, qty: 1 }] },
    { orderNumber: "PS-1012", status: "cancelled", customerName: "Leo Nguyen", customerEmail: "leo.nguyen@email.com", customerPhone: "(555) 234-8901", shippingAddress: "963 Magnolia Avenue", shippingCity: "Phoenix", shippingState: "AZ", shippingZip: "85001", shippingCost: 9.99, discount: 0, daysAgo: 12, items: [{ idx: 13, qty: 1 }, { idx: 21, qty: 1 }] },
  ];

  for (const o of orders) {
    let subtotal = 0;
    for (const item of o.items) {
      subtotal += insertedProducts[item.idx].price * item.qty;
    }
    const total = Math.round((subtotal + o.shippingCost - o.discount) * 100) / 100;

    const [orderRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO orders (store_id, order_number, status, customer_name, customer_email, customer_phone,
       shipping_address, shipping_city, shipping_state, shipping_zip,
       subtotal, shipping_cost, discount, total, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
      [storeId, o.orderNumber, o.status, o.customerName, o.customerEmail, o.customerPhone,
       o.shippingAddress, o.shippingCity, o.shippingState, o.shippingZip,
       subtotal, o.shippingCost, o.discount, total, o.daysAgo]
    );
    const orderId = orderRes.insertId;

    for (const item of o.items) {
      const p = insertedProducts[item.idx];
      const itemTotal = Math.round(p.price * item.qty * 100) / 100;
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, p.id, p.name, p.imageURL, p.price, item.qty, itemTotal]
      );
    }

    const itemNames = o.items.map((i) => insertedProducts[i.idx].name);
    console.log(`  Created order ${o.orderNumber} [${o.status}] $${total.toFixed(2)} — ${o.items.length} item(s): ${itemNames.join(", ")}`);
  }

  console.log("\n=== Seed completed successfully! ===");
  console.log("  Store:  Proti Store (slug: protistore)");
  console.log("  Admin:  admin@protistore.com / password123");
  console.log(`  Data:   ${categoryMap.size} categories, ${brands.length} brands, ${products.length} products, ${banners.length} banners, ${orders.length} orders`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
