# ShopNova — E-commerce Platform

A modern, scalable e-commerce platform built with a microservices architecture and a React frontend featuring Figma-designed UI.

## Features

- **User Management** — Registration, JWT authentication, role-based access (admin/customer)
- **Product Catalog** — Full CRUD, categories, tags, MongoDB text search, Redis caching
- **Order Processing** — Place/view/cancel orders, real-time WebSocket updates, mock payment
- **Notifications** — Email (Nodemailer/Ethereal), in-app notifications via RabbitMQ events
- **Analytics Dashboard** — Revenue charts, order breakdown, top products, customer stats
- **Responsive UI** — React + TailwindCSS 4 + Framer Motion animations, mobile-first design

## Tech Stack

### Frontend (`/frontend`)

- React 18 + TypeScript + Vite
- TailwindCSS 4 + Lucide Icons + Motion (Framer Motion)
- Zustand (state management) + React Router 7
- Recharts (analytics charts) + Sonner (toast notifications)
- Radix UI primitives (dialog, dropdown, tabs, etc.)

### Backend (`/services/*`)

- **User Service** (port 3001) — Express + PostgreSQL + bcryptjs + JWT + RabbitMQ
- **Product Service** (port 3002) — Express + MongoDB + Redis caching + RabbitMQ
- **Order Service** (port 3003) — Express + PostgreSQL + WebSocket (real-time) + RabbitMQ
- **Notification Service** (port 3004) — Express + MongoDB + RabbitMQ consumer + Nodemailer

### Infrastructure (Docker)

- PostgreSQL 15 — user & order databases
- MongoDB 7 — product catalog & notifications
- Redis 7 — response caching
- Elasticsearch 8.11 — full-text product search (optional)
- RabbitMQ 3 — event-driven inter-service messaging

## Quick Start

### 1. Start infrastructure

```bash
npm run infra:up
```

### 2. Install all dependencies

```bash
npm install
cd frontend && npm install
cd ../services/user-service && npm install
cd ../product-service && npm install
cd ../order-service && npm install
cd ../notification-service && npm install
```

### 3. Run frontend only (uses mock data — no backend needed)

```bash
npm run dev:frontend
```

### 4. Run full stack (frontend + all backend services)

```bash
npm run dev
```

### 5. Run backend services only

```bash
npm run dev:backend
```

## Access Points

| Service                  | URL                              |
| ------------------------ | -------------------------------- |
| **Frontend**             | http://localhost:5173            |
| User Service API         | http://localhost:3001/api        |
| Product Service API      | http://localhost:3002/api        |
| Order Service API        | http://localhost:3003/api        |
| Notification Service API | http://localhost:3004/api        |
| Order WebSocket          | ws://localhost:3003/ws?token=JWT |
| PostgreSQL               | localhost:5432                   |
| MongoDB                  | localhost:27017                  |
| Redis                    | localhost:6379                   |
| Elasticsearch            | http://localhost:9200            |
| RabbitMQ Management      | http://localhost:15672           |

## API Endpoints

### User Service (`/api`)

| Method | Endpoint         | Auth   | Description        |
| ------ | ---------------- | ------ | ------------------ |
| POST   | `/auth/register` | —      | Register new user  |
| POST   | `/auth/login`    | —      | Login, returns JWT |
| GET    | `/auth/profile`  | Bearer | Get current user   |
| PUT    | `/auth/profile`  | Bearer | Update profile     |
| GET    | `/users`         | Admin  | List all users     |
| GET    | `/health`        | —      | Health check       |

### Product Service (`/api`)

| Method | Endpoint                | Auth   | Description          |
| ------ | ----------------------- | ------ | -------------------- |
| GET    | `/products`             | —      | List/filter products |
| GET    | `/products/search?q=`   | —      | Search products      |
| GET    | `/products/:id`         | —      | Get single product   |
| POST   | `/products`             | Admin  | Create product       |
| PUT    | `/products/:id`         | Admin  | Update product       |
| DELETE | `/products/:id`         | Admin  | Delete product       |
| GET    | `/categories`           | —      | List categories      |
| GET    | `/products/:id/reviews` | —      | Get reviews          |
| POST   | `/products/:id/reviews` | Bearer | Add review           |

### Order Service (`/api`)

| Method | Endpoint                    | Auth   | Description    |
| ------ | --------------------------- | ------ | -------------- |
| POST   | `/orders`                   | Bearer | Place order    |
| GET    | `/orders`                   | Bearer | User's orders  |
| GET    | `/orders/:id`               | Bearer | Single order   |
| PUT    | `/orders/:id/cancel`        | Bearer | Cancel order   |
| GET    | `/orders/admin/all`         | Admin  | All orders     |
| PUT    | `/orders/:id/status`        | Admin  | Update status  |
| GET    | `/orders/analytics/summary` | Admin  | Analytics data |

### Notification Service (`/api`)

| Method | Endpoint                  | Auth   | Description          |
| ------ | ------------------------- | ------ | -------------------- |
| GET    | `/notifications`          | Bearer | User's notifications |
| PUT    | `/notifications/:id/read` | Bearer | Mark as read         |
| PUT    | `/notifications/read-all` | Bearer | Mark all read        |
| POST   | `/notifications`          | Admin  | Create notification  |

## Project Structure

```
ShopNova/
├── frontend/                    # React frontend (Vite)
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/      # UI components (Navbar, Footer, ProductCard, etc.)
│   │   │   ├── pages/           # Page components (Home, Catalog, Cart, Checkout, Dashboard)
│   │   │   ├── store/           # Zustand global state
│   │   │   ├── services/        # API client layer (axios)
│   │   │   ├── types/           # TypeScript interfaces
│   │   │   ├── data/            # Mock data for frontend-only mode
│   │   │   ├── routes.ts        # React Router config
│   │   │   └── App.tsx
│   │   └── styles/              # TailwindCSS + theme
│   └── package.json
├── services/
│   ├── user-service/            # Auth & user management (PostgreSQL)
│   ├── product-service/         # Product catalog (MongoDB + Redis)
│   ├── order-service/           # Orders & payments (PostgreSQL + WebSocket)
│   └── notification-service/    # Notifications (MongoDB + RabbitMQ)
├── docker-compose.yml           # Infrastructure services
├── init-db.sql                  # PostgreSQL schema initialization
├── package.json                 # Root workspace & scripts
└── README.md
```

## Environment Variables

Copy `.env.example` → `.env` in each service directory. Key variables:

| Variable             | Default                                              | Used By                               |
| -------------------- | ---------------------------------------------------- | ------------------------------------- |
| `JWT_SECRET`         | `shopnova-secret-key-change-in-production`           | All services                          |
| `DB_HOST`            | `localhost`                                          | user-service, order-service           |
| `MONGO_URL`          | `mongodb://shopnova:shopnova123@localhost:27017/...` | product-service, notification-service |
| `REDIS_URL`          | `redis://localhost:6379`                             | product-service, order-service        |
| `RABBITMQ_URL`       | `amqp://shopnova:shopnova123@localhost:5672`         | All services                          |
| `VITE_*_SERVICE_URL` | `http://localhost:300X/api`                          | frontend                              |

## API Documentation (Swagger)

Each service exposes interactive OpenAPI/Swagger documentation:

| Service              | Swagger UI URL                 |
| -------------------- | ------------------------------ |
| User Service         | http://localhost:3001/api/docs |
| Product Service      | http://localhost:3002/api/docs |
| Order Service        | http://localhost:3003/api/docs |
| Notification Service | http://localhost:3004/api/docs |

Start the backend services (`npm run dev:backend`) and open any URL above to explore and test the API interactively.

## Database Schema

Full database documentation is in [`docs/database-schema.md`](docs/database-schema.md), covering:

- **PostgreSQL** — `users`, `orders`, `order_items` tables with indexes and constraints
- **MongoDB** — `products`, `categories`, `reviews`, `notifications` collections
- **Elasticsearch** — `shopnova_products` index mappings
- **Redis** — Caching strategy with key patterns and TTLs
- **RabbitMQ** — Event routing keys, publishers, consumers, and payloads

The SQL schema file is at [`init-db.sql`](init-db.sql).

## Testing

### Run Tests

```bash
# All tests (frontend + all backend services)
npm test

# Frontend only
npm run test:frontend

# Individual backend services
npm run test:user
npm run test:product
npm run test:order
npm run test:notification
```

### Test Coverage

| Area                 | Tests   | Type                           | What's Tested                                                       |
| -------------------- | ------- | ------------------------------ | ------------------------------------------------------------------- |
| **Frontend**         |         |                                |                                                                     |
| Zustand Store        | 25      | Unit                           | Auth (login/logout/register), cart, wishlist, notifications, search |
| Navbar               | 12      | Component (RTL)                | Logo, nav links, search, auth states, cart badge                    |
| Footer               | 10      | Component (RTL)                | Brand, quick links, categories, contact, newsletter                 |
| Layout               | 2       | Component (RTL)                | Navbar/Footer/Outlet rendering, Toaster                             |
| ProductCard          | 14      | Component (RTL)                | Grid/list views, price, discount, stock, add to cart, wishlist      |
| Home Page            | 13      | Component (RTL)                | Hero, features, categories, featured/trending products              |
| Cart Page            | 17      | Component (RTL)                | Empty state, items, promo codes, shipping, order summary            |
| Login Page           | 12      | Component (RTL)                | Form, quick login, validation, auth flow, navigation                |
| Register Page        | 11      | Component (RTL)                | Form, validation, password match, terms, duplicate email            |
| NotFound Page        | 5       | Component (RTL)                | 404 text, links                                                     |
| _Frontend Subtotal_  | _126_   |                                |                                                                     |
| **Backend**          |         |                                |                                                                     |
| user-service         | 17      | Unit + Integration (supertest) | Register, login, profile, admin guards, validation                  |
| product-service      | 13      | Unit + Integration (supertest) | CRUD, search, categories, reviews, auth/admin guards                |
| order-service        | 17      | Unit + Integration (supertest) | Create, view, cancel, admin status, analytics, payments             |
| notification-service | 8       | Unit + Integration (supertest) | Get, mark read, admin create, auth guards                           |
| _Backend Subtotal_   | _55_    |                                |                                                                     |
| **Grand Total**      | **181** |                                |                                                                     |

- **Frontend tests** use **Jest** with **React Testing Library** (RTL). Mocks for `react-router`, `motion/react`, and `sonner` are configured via `moduleNameMapper`.
- **Backend tests** use **Jest** with **supertest** for HTTP integration testing. External dependencies (PostgreSQL, MongoDB, Redis, RabbitMQ, Elasticsearch) are mocked so tests run without Docker.

## Architecture & Design Decisions

### Microservices Principles

- **Independent services** — Each service has its own database, dependencies, and deployment config
- **Event-driven communication** — RabbitMQ topic exchange (`shopnova_events`) for async inter-service messaging
- **API gateway pattern** — Frontend communicates with each service directly via REST endpoints
- **Fault tolerance** — Services gracefully degrade when dependencies are unavailable (Redis, RabbitMQ, Elasticsearch)

### Performance Optimizations

- **Redis caching** — Product queries cached with 60s–600s TTL, auto-invalidated on mutations
- **Elasticsearch** — Full-text search with fuzzy matching, relevance scoring, and filter queries (falls back to MongoDB)
- **Database indexing** — All frequently queried columns indexed (email, user_id, status, order_number, category)
- **Connection pooling** — PostgreSQL `Pool` for efficient connection reuse
- **WebSocket** — Real-time order updates and push notifications without polling

### Code Quality

- **TypeScript** — Strict typing across frontend and all backend services
- **Modular structure** — Each service is self-contained with its own tests, config, and documentation
- **Input validation** — `express-validator` on user service, schema validation on all inputs
- **Error handling** — Try/catch with proper HTTP status codes and error messages
- **Security** — JWT auth, bcrypt password hashing, role-based access control

## Default Credentials

- **Admin**: `admin@shopnova.com` / `admin123`
- **Customer**: `jane@example.com` / `customer123`
