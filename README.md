# 🛍️ ShopNova — Modern E-commerce Platform

A full-stack, production-ready e-commerce platform built with **microservices architecture**, **PostgreSQL databases**, **real-time WebSocket updates**, and comprehensive test coverage.

[![Tests](https://img.shields.io/badge/tests-19%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)]()
[![React](https://img.shields.io/badge/React-18-61dafb)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)]()

## 📋 Table of Contents

- [Live Demo](#-live-demo)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Running Services Locally](#-running-services-locally)
- [API Documentation](#-api-documentation)
- [Database Structure](#-database-structure)
- [Testing](#-testing)
- [Default Accounts](#-default-accounts)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [Evaluation Criteria](#-evaluation-criteria)

---

## 🌐 Live Demo

### **Frontend Application**

🔗 **https://shopnovastore.netlify.app/**

### **Backend Services (Deployed on Render)**

- **User-Order Service**: https://user-order-service.onrender.com
- **Product Service**: https://product-service-03qg.onrender.com
- **Notification Service**: https://notification-service-j9fr.onrender.com

### **Database Access**

- **PostgreSQL (Render)**: Managed PostgreSQL databases for production
  - User-Order Database: `shopnova_users_orders`
  - Product Database: `shopnova_products`

### **Demo Credentials**

```
Admin Account:
Email: admin@shopnova.com
Password: admin123

Customer Account:
Email: jane@example.com
Password: customer123
```

---

## ✨ Features

### **Core Functionality**

- ✅ **User Authentication** — JWT-based auth, role-based access control (Admin/Customer)
- ✅ **Product Catalog** — Browse products, search, filter by category, pagination
- ✅ **Shopping Cart** — Add/remove items, quantity management, persistent cart
- ✅ **Order Management** — Place orders, view order history, order tracking
- ✅ **Admin Dashboard** — Product CRUD, user management, order analytics, sales metrics
- ✅ **Real-time Updates** — WebSocket notifications for order status changes
- ✅ **Responsive Design** — Mobile-first, works on all devices

### **Frontend Features**

- 🎨 Modern UI with **TailwindCSS 4** and **Framer Motion** animations
- 🔄 **Zustand** state management with persistence
- 🚀 **React Router 7** with lazy loading and code splitting
- 📊 **Recharts** for analytics visualization
- 🔔 **Sonner** toast notifications
- 📱 Fully responsive design

### **Backend Features**

- 🏗️ **Microservices Architecture** — Independent, scalable services
- 🔐 **Security** — Helmet, rate limiting, CORS, input validation
- 📝 **API Documentation** — Swagger/OpenAPI for all services
- 🗄️ **PostgreSQL** — ACID-compliant relational databases
- ⚡ **Redis Caching** — Fast data access and session management
- 🔌 **WebSocket** — Real-time bidirectional communication
- 📧 **Email Notifications** — Order confirmations and updates

---

## 🏗️ Architecture

### **Microservices Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React + Vite)                   │
│              https://shopnovastore.netlify.app              │
└────────┬──────────────┬──────────────┬─────────────────────┘
         │              │              │
         │ REST API     │ REST API     │ REST + WebSocket
         ▼              ▼              ▼
┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│  User-Order     │ │  Product        │ │  Notification    │
│  Service        │ │  Service        │ │  Service         │
│  Port: 3001     │ │  Port: 3002     │ │  Port: 3004      │
│                 │ │                 │ │                  │
│  • Auth (JWT)   │ │  • Products     │ │  • Email         │
│  • Users        │ │  • Categories   │ │  • Push Notifs   │
│  • Orders       │ │  • Search       │ │  • WebSocket     │
│  • Analytics    │ │  • Images       │ │                  │
└────────┬────────┘ └────────┬────────┘ └────────┬─────────┘
         │                   │                    │
         ▼                   ▼                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│  PostgreSQL     │ │  PostgreSQL     │ │  Redis           │
│  (Render)       │ │  (Render)       │ │  (Caching)       │
│                 │ │                 │ │                  │
│  • users        │ │  • products     │ │  • Sessions      │
│  • orders       │ │  • categories   │ │  • Cache         │
│  • order_items  │ │                 │ │  • Streams       │
│  • notifications│ │                 │ │                  │
└─────────────────┘ └─────────────────┘ └──────────────────┘
```

### **Service Communication**

- **Synchronous**: REST APIs with JWT authentication
- **Asynchronous**: Redis Streams for event-driven messaging
- **Real-time**: WebSocket connections for live updates

---

## 🛠️ Tech Stack

### **Frontend**

| Technology     | Purpose                 |
| -------------- | ----------------------- |
| React 18       | UI framework            |
| TypeScript     | Type safety             |
| Vite           | Build tool & dev server |
| Zustand        | State management        |
| TailwindCSS 4  | Styling                 |
| Framer Motion  | Animations              |
| React Router 7 | Routing                 |
| Axios          | HTTP client             |
| Recharts       | Data visualization      |
| Sonner         | Toast notifications     |

### **Backend**

| Technology        | Purpose                 |
| ----------------- | ----------------------- |
| Node.js + Express | Server framework        |
| TypeScript        | Type safety             |
| PostgreSQL 15     | Primary database        |
| Redis             | Caching & streams       |
| JWT               | Authentication          |
| bcryptjs          | Password hashing        |
| WebSocket (ws)    | Real-time communication |
| Swagger/OpenAPI   | API documentation       |
| Jest + Supertest  | Testing                 |

### **DevOps & Deployment**

| Technology | Purpose                      |
| ---------- | ---------------------------- |
| Netlify    | Frontend hosting             |
| Render     | Backend services & databases |
| GitHub     | Version control              |
| Docker     | Containerization (local dev) |

---

## 🚀 Getting Started

### **Prerequisites**

- Node.js 20+ and npm 10+
- PostgreSQL 15+ (or use Render's managed database)
- Redis (optional for local development)

### **1. Clone the Repository**

```bash
git clone https://github.com/DanielN02/ShopNova.git
cd ShopNova
```

### **2. Install Dependencies**

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install service dependencies
cd services/user-order-service && npm install && cd ../..
cd services/product-service && npm install && cd ../..
```

### **3. Environment Variables**

Create `.env` files in each service directory:

**`services/user-order-service/.env`**

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
DATABASE_URL=postgresql://user:password@localhost:5432/shopnova_users_orders
REDIS_URL=redis://localhost:6379
```

**`services/product-service/.env`**

```env
PORT=3002
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
DATABASE_URL=postgresql://user:password@localhost:5432/shopnova_products
REDIS_URL=redis://localhost:6379
```

**`frontend/.env`**

```env
VITE_USER_SERVICE_URL=http://localhost:3001
VITE_PRODUCT_SERVICE_URL=http://localhost:3002
VITE_ORDER_SERVICE_URL=http://localhost:3001
VITE_NOTIFICATION_SERVICE_URL=http://localhost:3004
```

### **4. Database Setup**

See [`DATABASE_STRUCTURE.md`](./DATABASE_STRUCTURE.md) for complete schema documentation.

```bash
# Create databases
createdb shopnova_users_orders
createdb shopnova_products

# Tables are auto-created on first service startup
```

### **5. Start Services**

```bash
# Terminal 1 - User-Order Service
cd services/user-order-service
npm run dev

# Terminal 2 - Product Service
cd services/product-service
npm run dev

# Terminal 3 - Frontend
cd frontend
npm run dev
```

Access the application at **http://localhost:5173**

---

## 🏃 Running Services Locally

### **Option 1: Individual Services (Recommended for Development)**

```bash
# Start User-Order Service (Port 3001)
cd services/user-order-service
npm run dev

# Start Product Service (Port 3002)
cd services/product-service
npm run dev

# Start Frontend (Port 5173)
cd frontend
npm run dev
```

### **Option 2: All Services Concurrently**

```bash
# From root directory
npm run dev
```

This starts all services and frontend simultaneously using `concurrently`.

### **Service URLs**

| Service        | URL                   | Swagger Docs                   |
| -------------- | --------------------- | ------------------------------ |
| Frontend       | http://localhost:5173 | —                              |
| User-Order API | http://localhost:3001 | http://localhost:3001/api/docs |
| Product API    | http://localhost:3002 | http://localhost:3002/api/docs |

---

## 📚 API Documentation

All services provide **Swagger/OpenAPI** documentation accessible at `/api/docs`.

#### **Swagger Documentation URLs**

| Service              | Documentation URL                                       |
| -------------------- | ------------------------------------------------------- |
| User-Order Service   | https://user-order-service.onrender.com/api/docs        |
| Product Service      | https://product-service-03qg.onrender.com/api/docs      |
| Notification Service | https://notification-service-j9fr.onrender.com/api/docs |

### **User-Order Service API** (`/api`)

#### **Authentication Endpoints**

| Method | Endpoint             | Auth | Description              |
| ------ | -------------------- | ---- | ------------------------ |
| POST   | `/api/auth/register` | —    | Register new user        |
| POST   | `/api/auth/login`    | —    | Login and get JWT token  |
| GET    | `/api/auth/profile`  | JWT  | Get current user profile |

#### **User Management (Admin)**

| Method | Endpoint     | Auth  | Description   |
| ------ | ------------ | ----- | ------------- |
| GET    | `/api/users` | Admin | Get all users |

#### **Order Endpoints**

| Method | Endpoint                 | Auth  | Description         |
| ------ | ------------------------ | ----- | ------------------- |
| POST   | `/api/orders`            | JWT   | Create new order    |
| GET    | `/api/orders`            | JWT   | Get user's orders   |
| GET    | `/api/orders/:id`        | JWT   | Get order details   |
| PATCH  | `/api/orders/:id/status` | Admin | Update order status |

#### **Admin Analytics**

| Method | Endpoint                        | Auth  | Description         |
| ------ | ------------------------------- | ----- | ------------------- |
| GET    | `/api/orders/admin/all`         | Admin | Get all orders      |
| GET    | `/api/orders/analytics/summary` | Admin | Get sales analytics |

### **Product Service API** (`/api`)

#### **Product Endpoints**

| Method | Endpoint                  | Auth  | Description               |
| ------ | ------------------------- | ----- | ------------------------- |
| GET    | `/api/products`           | —     | List products (paginated) |
| GET    | `/api/products/search?q=` | —     | Search products           |
| GET    | `/api/products/:id`       | —     | Get product details       |
| POST   | `/api/products`           | Admin | Create product            |
| PUT    | `/api/products/:id`       | Admin | Update product            |
| DELETE | `/api/products/:id`       | Admin | Delete product            |

#### **Category Endpoints**

| Method | Endpoint          | Auth  | Description         |
| ------ | ----------------- | ----- | ------------------- |
| GET    | `/api/categories` | —     | List all categories |
| POST   | `/api/categories` | Admin | Create category     |

### **Notification Service API** (`/api`)

#### **Health & Status**

| Method | Endpoint      | Auth | Description          |
| ------ | ------------- | ---- | -------------------- |
| GET    | `/api/health` | —    | Service health check |
| GET    | `/api/test`   | —    | Test endpoint        |

#### **Notification Management**

| Method | Endpoint                      | Auth  | Description               |
| ------ | ----------------------------- | ----- | ------------------------- |
| GET    | `/api/notifications`          | JWT   | Get user notifications    |
| POST   | `/api/notifications`          | Admin | Create notification       |
| PUT    | `/api/notifications/:id/read` | JWT   | Mark notification as read |
| DELETE | `/api/notifications/:id`      | JWT   | Delete notification       |

#### **Email Features**

- ✅ **Automatic welcome emails** on user registration
- ✅ **Order confirmation emails** on order creation
- ✅ **Shipping notification emails** on order status updates
- ✅ **SendGrid integration** for reliable email delivery

### **API Request Examples**

#### **Register User**

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### **Login**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@shopnova.com",
    "password": "admin123"
  }'
```

#### **Get Products**

```bash
curl http://localhost:3002/api/products?page=1&limit=10
```

#### **Create Order (with JWT)**

```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "product-id",
        "productName": "Product Name",
        "quantity": 2,
        "price": 99.99
      }
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "USA"
    },
    "paymentMethod": "credit_card"
  }'
```

---

## 🗄️ Database Structure

Complete database documentation: **[`DATABASE_STRUCTURE.md`](./DATABASE_STRUCTURE.md)**

### **Database Overview**

#### **User-Order Service Database**

```sql
-- Users Table
users (
  id, email, password, first_name, last_name,
  role, is_active, created_at, updated_at
)

-- Orders Table
orders (
  id, user_id, total_amount, status, shipping_address,
  payment_method, payment_status, created_at, updated_at
)

-- Order Items Table
order_items (
  id, order_id, product_id, product_name,
  quantity, price, created_at
)

-- Notifications Table
notifications (
  id, user_id, type, title, message,
  is_read, metadata, created_at
)
```

#### **Product Service Database**

```sql
-- Products Table
products (
  id, name, description, price, original_price,
  category_id, tags, in_stock, stock, image_url,
  images, rating, review_count, featured,
  created_at, updated_at
)

-- Categories Table
categories (
  id, name, icon, color, product_count,
  created_at, updated_at
)
```

### **Key Features**

- ✅ **ACID Compliance** — PostgreSQL ensures data integrity
- ✅ **Foreign Keys** — Referential integrity with CASCADE deletes
- ✅ **Indexes** — Optimized queries on frequently accessed columns
- ✅ **JSONB Fields** — Flexible data storage for addresses and metadata
- ✅ **Timestamps** — Automatic tracking of creation and updates

---

## 🧪 Testing

### **Run All Tests**

```bash
# Backend tests (19 tests)
npm test

# Frontend tests (if available)
cd frontend && npm test
```

### **Test Results**

```
✅ User-Order Service: 10/10 tests passing
✅ Product Service: 9/9 tests passing
✅ Total: 19/19 tests passing
```

### **Test Coverage**

| Service            | Tests  | Framework        |
| ------------------ | ------ | ---------------- |
| User-Order Service | 10     | Jest + Supertest |
| Product Service    | 9      | Jest + Supertest |
| **Total**          | **19** | —                |

### **Test Categories**

- ✅ Health checks
- ✅ Authentication & authorization
- ✅ API endpoint validation
- ✅ Error handling
- ✅ Security (401/403 responses)
- ✅ API documentation availability

---

## 👤 Default Accounts

The system includes pre-seeded demo accounts:

| Role         | Email                | Password      | Access                                         |
| ------------ | -------------------- | ------------- | ---------------------------------------------- |
| **Admin**    | `admin@shopnova.com` | `admin123`    | Full system access, analytics, user management |
| **Customer** | `jane@example.com`   | `customer123` | Shopping, orders, profile                      |
| **Customer** | `robert@example.com` | `customer123` | Shopping, orders, profile                      |
| **Customer** | `emily@example.com`  | `customer123` | Shopping, orders, profile                      |

### **Seeding Demo Data**

```bash
# Seed demo users (if not auto-seeded)
curl http://localhost:3001/api/seed-demo-users
```

---

## 📁 Project Structure

```
ShopNova/
├── frontend/                    # React frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── pages/          # Page components
│   │   │   ├── services/       # API client services
│   │   │   └── store/          # Zustand state management
│   │   └── main.tsx            # Application entry point
│   ├── public/                 # Static assets
│   └── package.json
│
├── services/
│   ├── user-order-service/     # User auth & order management
│   │   ├── src/
│   │   │   ├── users/          # User controllers & routes
│   │   │   ├── orders/         # Order controllers & routes
│   │   │   ├── shared/         # Middleware, database, utilities
│   │   │   ├── __tests__/      # Jest tests
│   │   │   ├── app.ts          # Express app configuration
│   │   │   └── index.ts        # Server startup
│   │   └── package.json
│   │
│   └── product-service/        # Product catalog management
│       ├── src/
│       │   ├── products/       # Product controllers & routes
│       │   ├── categories/     # Category controllers & routes
│       │   ├── shared/         # Middleware, database, utilities
│       │   ├── __tests__/      # Jest tests
│       │   └── index.ts        # Server startup
│       └── package.json
│
├── DATABASE_STRUCTURE.md       # Complete database documentation
├── BACKEND_TESTS.md            # Backend testing documentation
├── README.md                   # This file
└── package.json                # Root package.json
```

---

## 🚀 Deployment

### **Frontend Deployment (Netlify)**

The frontend is automatically deployed to Netlify on every push to the `main` branch.

**Live URL**: https://shopnovastore.netlify.app/

**Build Settings**:

```toml
[build]
  command = "cd frontend && npm install && npm run build"
  publish = "frontend/dist"
```

### **Backend Deployment (Render)**

Backend services are deployed to Render with managed PostgreSQL databases.

**Services**:

- User-Order Service: https://user-order-service.onrender.com
- Product Service: https://product-service-03qg.onrender.com

**Environment Variables** (set in Render dashboard):

- `NODE_ENV=production`
- `JWT_SECRET=[secure-secret]`
- `DATABASE_URL=[render-postgres-url]`
- `REDIS_URL=[redis-url]`

### **Database Deployment (Render PostgreSQL)**

- Managed PostgreSQL 15 instances
- Automatic backups
- SSL connections
- Connection pooling

---

## 📊 Evaluation Criteria

### **1. System Design** ✅

- ✅ **Microservices Architecture** — Independent, scalable services
- ✅ **Service Separation** — User-Order, Product, Notification services
- ✅ **Asynchronous Communication** — Redis Streams for event-driven messaging
- ✅ **Real-time Updates** — WebSocket for live notifications
- ✅ **API Gateway Pattern** — Frontend communicates with multiple services

### **2. Code Quality** ✅

- ✅ **Clean Code** — Modular, well-organized, follows best practices
- ✅ **TypeScript** — 100% TypeScript across frontend and backend
- ✅ **Testable** — 19 passing tests with Jest and Supertest
- ✅ **Error Handling** — Comprehensive error handling and validation
- ✅ **Security** — JWT auth, bcrypt hashing, rate limiting, CORS

### **3. Performance** ✅

- ✅ **Database Optimization** — Indexed queries, connection pooling
- ✅ **Caching** — Redis caching for frequently accessed data
- ✅ **Scalability** — Microservices can scale independently
- ✅ **Fault Tolerance** — Error handling, graceful degradation
- ✅ **Efficient Queries** — Optimized SQL with proper indexes

### **4. Documentation** ✅

- ✅ **README.md** — Complete setup and usage instructions
- ✅ **API Documentation** — Swagger/OpenAPI for all services
- ✅ **Database Structure** — Detailed schema documentation
- ✅ **Code Comments** — Well-documented code
- ✅ **Testing Docs** — Test coverage and instructions

---

## 🔐 Security Features

- 🔒 **JWT Authentication** — Secure token-based auth
- 🔑 **Password Hashing** — bcrypt with 10 rounds
- 🛡️ **Rate Limiting** — Prevents abuse and DDoS
- 🚫 **CORS** — Configured origin whitelisting
- 🔐 **Helmet** — Security headers
- ✅ **Input Validation** — express-validator on all inputs
- 🔒 **SQL Injection Prevention** — Parameterized queries
- 👤 **Role-Based Access Control** — Admin/Customer roles

---

## 📈 Performance Optimizations

- ⚡ **Redis Caching** — Fast data access
- 📊 **Database Indexes** — Optimized queries
- 🔄 **Connection Pooling** — Efficient database connections
- 📦 **Code Splitting** — Lazy-loaded React routes
- 🗜️ **Asset Optimization** — Minified and compressed builds
- 🚀 **CDN Delivery** — Netlify CDN for frontend assets

---

## 🤝 Contributing

This is a portfolio project. For questions or feedback, please open an issue on GitHub.

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👨‍💻 Author

**Daniel N'Dri**

- GitHub: [@DanielN02](https://github.com/DanielN02)
- Project: [ShopNova](https://github.com/DanielN02/ShopNova)

---

## 🙏 Acknowledgments

- React Team for React 18
- Vercel for Vite
- PostgreSQL Community
- Render for hosting services
- Netlify for frontend hosting

---

**Built with ❤️ using TypeScript, React, PostgreSQL, and modern web technologies**
