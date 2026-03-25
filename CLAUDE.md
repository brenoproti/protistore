# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Database
```bash
docker compose up -d          # Start MySQL 8 (port 3307)
docker compose down           # Stop MySQL
```

### Backend (Bun + Elysia) — primary
```bash
cd backend-bun && bun install              # Install dependencies
cd backend-bun && bun run dev              # Dev server with watch (port 8081)
cd backend-bun && bun run start            # Production start (port 8081)
cd backend-bun && bun run seed             # Seed database (admin@protistore.com / password123)
```

### Backend (Go + Chi) — legacy, kept as reference
```bash
cd backend && go run cmd/server/main.go    # Run API server (port 8081)
cd backend && go run cmd/seed/main.go      # Seed database (admin@protistore.com / password123)
cd backend && go build cmd/server/main.go  # Build binary
cd backend && go vet ./...                 # Lint
```

### Frontend (React + Vite)
```bash
cd frontend && npm install      # Install dependencies
cd frontend && npm run dev      # Dev server (port 5173)
cd frontend && npm run build    # Production build
cd frontend && npm run lint     # ESLint
```

Vite proxies `/api` and `/uploads` to `localhost:8081`.

## Architecture

Multi-tenant online store platform. Tenants are resolved by subdomain (e.g. `mystore.protistore.localhost`) or `X-Store-Slug` header fallback.

### Backend: `backend-bun/` (Bun + Elysia)

Layered architecture: **routes → services → repositories** using `mysql2/promise` directly (no ORM).

- **Entry point:** `src/index.ts` — DB init, auto-migration, Elysia app setup, route wiring
- **Routes:** `src/routes/` — HTTP handlers, request/response handling
- **Services:** `src/services/auth.ts` — JWT via `jose` (access 15min + refresh 7d), bcrypt via `Bun.password`
- **Repositories:** `src/repositories/` — SQL queries, all filtered by `store_id`
- **Middleware:** `src/middleware/` — tenantMiddleware (Elysia derive: subdomain→storeId), authMiddleware (JWT + cross-store validation)
- **Types:** `src/types.ts` — all models + DTOs
- **Migration:** `migrations/001_schema.sql` — single unified schema, auto-run on startup
- **Seed:** `src/seed.ts` — standalone script with demo data

All API routes are under `/api/v1`. Public store routes use tenantMiddleware only. Admin routes use both tenantMiddleware + authMiddleware.

### Legacy Backend: `backend/` (Go + Chi) — kept as reference

### Frontend: `frontend/`

React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, TanStack Query.

- **Routing:** `App.tsx` detects subdomain → storefront mode vs landing mode
- **Contexts:** `AuthContext` (JWT + auto-refresh), `StoreContext` (store info + theme CSS vars), `CartContext` (localStorage-persisted cart)
- **API client:** `lib/api.ts` — Axios with request interceptor (JWT + store slug) and response interceptor (401 auto-refresh)
- **Types:** `types/index.ts`
- **Theming:** `StoreContext` applies store customization as CSS variables → `index.css` maps them via Tailwind v4 `@theme`

## Key Technical Details

- **Tailwind CSS v4:** Uses CSS-based `@theme` config in `index.css`, NOT `tailwind.config.js`
- **Axios type imports:** `InternalAxiosRequestConfig` must use `import type` (separate from runtime import) to avoid Vite ESM bundling errors
- **API route matching:** Frontend `lib/api.ts` routes must exactly match backend Elysia router paths
- **Store slug fallback:** `localStorage.getItem('store_slug')` used when hostname has no subdomain (localhost dev)
- **File uploads:** S3 presigned URLs primary, local `/uploads` directory fallback
- **Pagination:** Repository layer handles OFFSET/LIMIT, returns `PaginatedResponse` with total/page metadata
- **mysql2 type casting:** `decimalNumbers: true` and custom `typeCast` for TINYINT(1)→boolean in `db.ts`
- **JWT library:** `jose` for JWT generation/verification (matches Go HS256 format)
