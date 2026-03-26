# ShopNova — Scalable E-commerce Platform

A full-stack e-commerce platform built with a microservices architecture, React frontend, real-time WebSocket updates, event-driven messaging, and comprehensive test coverage.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Running with Docker](#running-with-docker)
- [Running Locally (without Docker)](#running-locally-without-docker)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Default Accounts](#default-accounts)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)

---

## Features

### Core

- **User Management** — Registration, JWT authentication, role-based access (admin/customer), profile management
- **Product Catalog** — Full CRUD, categories, tags, image upload, MongoDB + Elasticsearch full-text search, Redis caching
- **Order Processing** — Place/view/cancel orders, real-time status updates via WebSocket, mock payment gateway
- **Notifications** — Email (Nodemailer/Ethereal), in-app push notifications via RabbitMQ + WebSocket
- **Analytics Dashboard** — Revenue charts, order breakdown, top products, customer stats, orders per user

### Frontend

- Responsive React 18 UI with TailwindCSS 4 + Framer Motion animations
- Zustand state management wired to real backend APIs
- Lazy-loaded routes with code splitting
- Server-side pagination, debounced search, URL-synced filters
- Real-time WebSocket notifications with toast alerts
- Admin dashboard with product CRUD modals, order status management
- Image upload with drag-and-drop and preview

### Backend

- Rate limiting on all services (express-rate-limit)
- Input validation with express-validator
- HTTP security headers via helmet
- CORS origin whitelisting
- Dockerized services with multi-stage builds

### Testing

- **94 tests total** — 39 frontend (Vitest) + 55 backend (Jest)
- 0 TypeScript errors across all projects

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│           Vite · TypeScript · Zustand · TailwindCSS             │
│                     http://localhost:5173                        │
└──────┬──────────┬──────────┬──────────┬─────────────────────────┘
       │          │          │          │
       │ REST     │ REST     │ REST+WS  │ REST+WS
       ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│  User    │ │ Product  │ │  Order   │ │  Notification    │
│ Service  │ │ Service  │ │ Service  │ │  Service         │
│ :3001    │ │ :3002    │ │ :3003    │ │  :3004           │
│          │ │          │ │          │ │                  │
│ Express  │ │ Express  │ │ Express  │ │  Express         │
│ pg       │ │ mongoose │ │ pg       │ │  mongoose        │
│ bcrypt   │ │ redis    │ │ redis    │ │  nodemailer      │
│ jwt      │ │ elastic  │ │ ws       │ │  ws              │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────────────┘
     │            │            │             │
     └────────────┴─────┬──────┴─────────────┘
                        │
                   ┌────▼────┐
                   │ RabbitMQ │  Event-driven messaging
                   │  :5672   │  Exchange: shopnova_events
                   └─────────┘
                        │
     ┌──────────────────┼──────────────────┐
     ▼                  ▼                  ▼
┌──────────┐     ┌──────────┐      ┌──────────────┐
│PostgreSQL│     │ MongoDB  │      │    Redis      │
│  :5432   │     │  :27017  │      │    :6379      │
│          │     │          │      │               │
│ users    │     │ products │      │ query cache   │
│ orders   │     │ notifs   │      │ (60-600s TTL) │
│ items    │     │ reviews  │      │               │
└──────────┘     └──────────┘      └──────────────┘
                        │
                  ┌─────▼──────┐
                  │Elasticsearch│
                  │   :9200     │
                  │ full-text   │
                  │ search      │
                  └────────────┘
```

### Event Flow (RabbitMQ)

| Event                  | Publisher     | Consumer             | Trigger                         |
| ---------------------- | ------------- | -------------------- | ------------------------------- |
| `user.registered`      | user-service  | notification-service | Welcome email                   |
| `order.created`        | order-service | notification-service | Order confirmation email + push |
| `order.status_updated` | order-service | notification-service | Status change push notification |
| `order.cancelled`      | order-service | notification-service | Cancellation notification       |

---

## Tech Stack

| Layer     | Technology                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Zustand, TailwindCSS 4, Framer Motion, Recharts, React Router 7, Axios |
| Backend   | Node.js, Express, TypeScript                                                                       |
| Databases | PostgreSQL 15, MongoDB 7, Redis 7, Elasticsearch 8.11                                              |
| Messaging | RabbitMQ 3 (topic exchange, durable queues)                                                        |
| Real-time | WebSocket (ws library)                                                                             |
| Auth      | JWT (jsonwebtoken), bcryptjs                                                                       |
| Caching   | Redis with 60-600s TTL, cache invalidation on mutations                                            |
| Search    | Elasticsearch (fuzzy matching, relevance scoring) with MongoDB regex fallback                      |
| Email     | Nodemailer with Ethereal test accounts                                                             |
| Testing   | Vitest + React Testing Library (frontend), Jest + Supertest (backend)                              |
| DevOps    | Docker, docker-compose, multi-stage builds, nginx                                                  |
| Security  | helmet, express-rate-limit, express-validator, CORS whitelisting                                   |
| API Docs  | Swagger/OpenAPI 3.0 (all services)                                                                 |

---

## Quick Start

### Prerequisites

- **Node.js 20+** and **npm 10+**
- **Docker** and **Docker Compose** (for infrastructure services)

### 1. Clone the repository

```bash
git clone https://github.com/DanielN02/ShopNova.git
cd ShopNova
```

### 2. Install all dependencies

```bash
npm install
cd frontend && npm install && cd ..
cd services/user-service && npm install && cd ../..
cd services/product-service && npm install && cd ../..
cd services/order-service && npm install && cd ../..
cd services/notification-service && npm install && cd ../..
```

### 3. Start infrastructure (PostgreSQL, MongoDB, Redis, Elasticsearch, RabbitMQ)

```bash
npm run infra:up
```

Wait 30 seconds for all services to become healthy:

```bash
docker compose ps
```

All 5 infrastructure containers should show `(healthy)`.

### 4. Start all services + frontend

```bash
npm run dev
```

This starts all 4 backend services and the frontend concurrently:

| Service              | URL                   |
| -------------------- | --------------------- |
| Frontend             | http://localhost:5173 |
| User Service         | http://localhost:3001 |
| Product Service      | http://localhost:3002 |
| Order Service        | http://localhost:3003 |
| Notification Service | http://localhost:3004 |

---

## Running with Docker

To run the entire stack (infrastructure + services + frontend) in Docker:

```bash
docker compose up -d
```

This builds and starts all containers. The frontend is served by nginx on port 80:

| Service             | URL                                           |
| ------------------- | --------------------------------------------- |
| Frontend            | http://localhost                              |
| User API            | http://localhost:3001                         |
| Product API         | http://localhost:3002                         |
| Order API           | http://localhost:3003                         |
| Notification API    | http://localhost:3004                         |
| RabbitMQ Management | http://localhost:15672 (shopnova/shopnova123) |

To stop everything:

```bash
docker compose down
```

To stop and remove all data volumes:

```bash
docker compose down -v
```

### Development with Hot Reload

The `docker-compose.override.yml` enables volume mounts for hot-reload in development:

```bash
docker compose up -d  # Automatically picks up override
```

---

## Running Locally (without Docker)

If you don't want to use Docker, you need local instances of:

- PostgreSQL 15 on port 5432
- MongoDB 7 on port 27017
- Redis 7 on port 6379
- RabbitMQ 3 on port 5672
- Elasticsearch 8.11 on port 9200 (optional — product search falls back to MongoDB)

Create the PostgreSQL databases:

```bash
psql -U postgres -f init-db.sql
```

Then set environment variables (or create `.env` files in each service directory):

```bash
# User Service
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/user_service
export JWT_SECRET=your-secret-key
export RABBITMQ_URL=amqp://localhost:5672

# Product Service
export MONGODB_URI=mongodb://localhost:27017/shopnova_products
export REDIS_URL=redis://localhost:6379
export ELASTICSEARCH_URL=http://localhost:9200
export RABBITMQ_URL=amqp://localhost:5672
export JWT_SECRET=your-secret-key

# Order Service
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/order_service
export REDIS_URL=redis://localhost:6379
export RABBITMQ_URL=amqp://localhost:5672
export JWT_SECRET=your-secret-key

# Notification Service
export MONGODB_URI=mongodb://localhost:27017/shopnova_notifications
export RABBITMQ_URL=amqp://localhost:5672
export JWT_SECRET=your-secret-key
```

Start each service:

```bash
# Terminal 1
cd services/user-service && npm run dev

# Terminal 2
cd services/product-service && npm run dev

# Terminal 3
cd services/order-service && npm run dev

# Terminal 4
cd services/notification-service && npm run dev

# Terminal 5
cd frontend && npm run dev
```

---

## API Documentation

Each service provides Swagger/OpenAPI documentation:

| Service              | Swagger UI                     |
| -------------------- | ------------------------------ |
| User Service         | http://localhost:3001/api/docs |
| Product Service      | http://localhost:3002/api/docs |
| Order Service        | http://localhost:3003/api/docs |
| Notification Service | http://localhost:3004/api/docs |

### Key API Endpoints

#### User Service (`:3001`)

| Method | Endpoint             | Auth  | Description              |
| ------ | -------------------- | ----- | ------------------------ |
| POST   | `/api/auth/register` | —     | Register new user        |
| POST   | `/api/auth/login`    | —     | Login, returns JWT       |
| GET    | `/api/auth/profile`  | JWT   | Get current user profile |
| PUT    | `/api/auth/profile`  | JWT   | Update profile           |
| GET    | `/api/users`         | Admin | List all users           |

#### Product Service (`:3002`)

| Method | Endpoint                    | Auth  | Description                           |
| ------ | --------------------------- | ----- | ------------------------------------- |
| GET    | `/api/products`             | —     | List products (paginated, filterable) |
| GET    | `/api/products/search?q=`   | —     | Elasticsearch full-text search        |
| GET    | `/api/products/:id`         | —     | Get single product                    |
| POST   | `/api/products`             | Admin | Create product (multipart/form-data)  |
| PUT    | `/api/products/:id`         | Admin | Update product                        |
| DELETE | `/api/products/:id`         | Admin | Delete product                        |
| POST   | `/api/products/:id/images`  | Admin | Upload product images                 |
| GET    | `/api/products/:id/reviews` | —     | Get product reviews                   |
| POST   | `/api/products/:id/reviews` | JWT   | Add review                            |
| GET    | `/api/categories`           | —     | List all categories                   |

#### Order Service (`:3003`)

| Method | Endpoint                        | Auth  | Description         |
| ------ | ------------------------------- | ----- | ------------------- |
| POST   | `/api/orders`                   | JWT   | Place order         |
| GET    | `/api/orders`                   | JWT   | Get user's orders   |
| GET    | `/api/orders/:id`               | JWT   | Get order details   |
| PUT    | `/api/orders/:id/cancel`        | JWT   | Cancel order        |
| GET    | `/api/orders/admin/all`         | Admin | Get all orders      |
| PUT    | `/api/orders/:id/status`        | Admin | Update order status |
| GET    | `/api/orders/analytics/summary` | Admin | Sales analytics     |

#### Notification Service (`:3004`)

| Method | Endpoint                      | Auth | Description              |
| ------ | ----------------------------- | ---- | ------------------------ |
| GET    | `/api/notifications`          | JWT  | Get user's notifications |
| PUT    | `/api/notifications/:id/read` | JWT  | Mark as read             |
| PUT    | `/api/notifications/read-all` | JWT  | Mark all as read         |

---

## Database Schema

Full schema documentation: [`docs/database-schema.md`](docs/database-schema.md)

### Summary

| Database                         | Tables/Collections                  | Service                        |
| -------------------------------- | ----------------------------------- | ------------------------------ |
| PostgreSQL `user_service`        | `users`                             | user-service                   |
| PostgreSQL `order_service`       | `orders`, `order_items`             | order-service                  |
| MongoDB `shopnova_products`      | `products`, `categories`, `reviews` | product-service                |
| MongoDB `shopnova_notifications` | `notifications`                     | notification-service           |
| Redis                            | Query cache (60-600s TTL)           | product-service, order-service |
| Elasticsearch                    | `shopnova_products` index           | product-service                |

### SQL Schema

Located at [`init-db.sql`](init-db.sql) — automatically run by PostgreSQL container on first start.

---

## Testing

### Run all tests

```bash
# All backend tests (55 tests)
npm test

# Frontend tests (39 tests)
cd frontend && npm test

# Individual service
cd services/user-service && npm test
cd services/product-service && npm test
cd services/order-service && npm test
cd services/notification-service && npm test
```

### Test Coverage

| Suite                                   | Tests  | Framework                      |
| --------------------------------------- | ------ | ------------------------------ |
| Frontend — Store (cart, auth, wishlist) | 26     | Vitest                         |
| Frontend — Components (Login, Cart)     | 13     | Vitest + React Testing Library |
| User Service                            | 17     | Jest + Supertest               |
| Product Service                         | 13     | Jest + Supertest               |
| Order Service                           | 17     | Jest + Supertest               |
| Notification Service                    | 8      | Jest + Supertest               |
| **Total**                               | **94** |                                |

---

## Default Accounts

The services auto-seed these accounts on first start:

| Role     | Email                   | Password      |
| -------- | ----------------------- | ------------- |
| Admin    | `admin@shopnova.com`    | `admin123`    |
| Customer | `customer@shopnova.com` | `customer123` |

The product service seeds 12 products and 6 categories on startup.

---

## Environment Variables

### Frontend (`frontend/.env`)

```env
VITE_USER_SERVICE_URL=http://localhost:3001
VITE_PRODUCT_SERVICE_URL=http://localhost:3002
VITE_ORDER_SERVICE_URL=http://localhost:3003
VITE_NOTIFICATION_SERVICE_URL=http://localhost:3004
```

### Backend Services

Each service reads from environment variables with sensible defaults for local development:

| Variable            | Default                                                | Services              |
| ------------------- | ------------------------------------------------------ | --------------------- |
| `PORT`              | 3001-3004                                              | All                   |
| `JWT_SECRET`        | `shopnova-secret-key-change-in-production`             | All                   |
| `DATABASE_URL`      | `postgresql://shopnova:shopnova123@localhost:5432/...` | user, order           |
| `MONGODB_URI`       | `mongodb://shopnova:shopnova123@localhost:27017/...`   | product, notification |
| `REDIS_URL`         | `redis://localhost:6379`                               | product, order        |
| `RABBITMQ_URL`      | `amqp://shopnova:shopnova123@localhost:5672`           | All                   |
| `ELASTICSEARCH_URL` | `http://localhost:9200`                                | product               |
| `SMTP_HOST`         | `smtp.ethereal.email`                                  | notification          |

---

## Rate Limiting

| Service              | Endpoint               | Limit         |
| -------------------- | ---------------------- | ------------- |
| User Service         | `/api/auth/*`          | 20 req/15min  |
| User Service         | `/api/*`               | 100 req/15min |
| Product Service      | `/api/products/search` | 30 req/min    |
| Product Service      | `/api/*`               | 200 req/15min |
| Order Service        | `POST /api/orders`     | 10 req/15min  |
| Order Service        | `/api/*`               | 100 req/15min |
| Notification Service | `/api/*`               | 100 req/15min |

Rate limiting is automatically disabled when `NODE_ENV=test`.

---

## License

MIT
