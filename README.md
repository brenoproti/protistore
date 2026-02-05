# VibeStore

A multi-tenant online store platform built with Go and React. Each tenant gets a fully customizable storefront with its own product catalog, branding, and admin dashboard.

## Tech Stack

- **Backend:** Go 1.22+ with Chi router
- **Database:** MySQL 8
- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Build Tool:** Vite

## Prerequisites

- Docker & Docker Compose
- Go 1.22+
- Node.js 18+

## Quick Start

1. **Clone the repo**

   ```bash
   git clone https://github.com/your-username/vibeStore.git
   cd vibeStore
   ```

2. **Start the database**

   ```bash
   docker compose up -d
   ```

3. **Copy the environment file**

   ```bash
   cp .env.example .env
   ```

4. **Run migrations and seed the database**

   ```bash
   cd backend && go run cmd/seed/main.go
   ```

5. **Start the backend**

   ```bash
   cd backend && go run cmd/server/main.go
   ```

6. **Start the frontend**

   ```bash
   cd frontend && npm install && npm run dev
   ```

7. **Access the application**

   - Frontend: http://localhost:5173
   - Admin panel: http://localhost:5173/admin
   - API: http://localhost:8081

## Demo Credentials

| Email                  | Password      |
|------------------------|---------------|
| admin@vibestore.com    | password123   |

## Project Structure

```
vibeStore/
├── backend/
│   ├── cmd/
│   │   ├── server/      # API server entry point
│   │   └── seed/        # Database seeder
│   ├── internal/
│   │   ├── config/      # Environment configuration
│   │   ├── dto/         # Request/response DTOs
│   │   ├── handler/     # HTTP handlers
│   │   ├── middleware/   # Auth, tenant, CORS
│   │   ├── model/       # Domain models
│   │   ├── repository/  # Database queries
│   │   └── service/     # Business logic
│   ├── migrations/      # SQL migration files
│   └── uploads/         # Uploaded files
├── frontend/
│   └── src/
│       ├── components/  # Reusable components
│       ├── contexts/    # React contexts (Auth, Cart, Store)
│       ├── lib/         # API client, utilities
│       ├── pages/       # Store & admin pages
│       └── types/       # TypeScript interfaces
└── docker-compose.yml
```

## API Endpoints

### Auth

| Method | Endpoint                | Description          |
|--------|-------------------------|----------------------|
| POST   | `/api/v1/auth/login`    | Login with email/password |
| POST   | `/api/v1/auth/refresh`  | Refresh JWT token    |

### Store (Public)

| Method | Endpoint                       | Description                |
|--------|--------------------------------|----------------------------|
| GET    | `/api/v1/store/info`           | Store information          |
| GET    | `/api/v1/store/categories`     | List categories            |
| GET    | `/api/v1/store/brands`         | List brands                |
| GET    | `/api/v1/store/products`       | List products (with filtering, search, pagination) |
| GET    | `/api/v1/store/products/:slug` | Product details            |
| GET    | `/api/v1/store/banners`        | List banners               |
| POST   | `/api/v1/store/checkout`       | Create an order            |

### Admin (Authenticated)

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | `/api/v1/admin/dashboard`         | Dashboard statistics     |
| GET    | `/api/v1/admin/products`          | List products            |
| POST   | `/api/v1/admin/products`          | Create product           |
| PUT    | `/api/v1/admin/products/:id`      | Update product           |
| DELETE | `/api/v1/admin/products/:id`      | Delete product           |
| GET    | `/api/v1/admin/categories`        | List categories          |
| POST   | `/api/v1/admin/categories`        | Create category          |
| PUT    | `/api/v1/admin/categories/:id`    | Update category          |
| DELETE | `/api/v1/admin/categories/:id`    | Delete category          |
| GET    | `/api/v1/admin/brands`            | List brands              |
| POST   | `/api/v1/admin/brands`            | Create brand             |
| PUT    | `/api/v1/admin/brands/:id`        | Update brand             |
| DELETE | `/api/v1/admin/brands/:id`        | Delete brand             |
| GET    | `/api/v1/admin/banners`           | List banners             |
| POST   | `/api/v1/admin/banners`           | Create banner            |
| PUT    | `/api/v1/admin/banners/:id`       | Update banner            |
| DELETE | `/api/v1/admin/banners/:id`       | Delete banner            |
| GET    | `/api/v1/admin/orders`            | List orders              |
| PUT    | `/api/v1/admin/orders/:id/status` | Update order status      |
| GET    | `/api/v1/admin/customization`     | Get store customization  |
| PUT    | `/api/v1/admin/customization`     | Update store customization |
| POST   | `/api/v1/admin/upload`            | Upload an image          |

## Multi-Tenant Architecture

VibeStore supports multiple independent stores from a single deployment. Each store (tenant) is resolved at request time via the **subdomain** or the **`X-Store-Slug`** HTTP header. All data -- products, categories, orders, and customization settings -- is scoped to the resolved tenant, ensuring complete isolation between stores.

## Features

- **Product catalog** with filtering, search, and pagination
- **Shopping cart** persisted in localStorage
- **Checkout** with order creation
- **Admin dashboard** with charts and statistics
- **Store customization** -- colors, fonts, and custom CSS per tenant
- **Image upload** for products and banners
- **JWT authentication** with token refresh
- **Responsive design** for mobile and desktop
