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

## Default Credentials

- **Admin**: `admin@shopnova.com` / `admin123`
- **Customer**: `jane@example.com` / `customer123`
