# ShopNova Database Structure

## Overview
ShopNova uses **PostgreSQL** databases for all microservices, providing ACID compliance and relational data integrity.

## Database Architecture

### 🗄️ User-Order Service Database
**Database Name**: `shopnova_users_orders`  
**Host**: Render PostgreSQL (Production) / localhost:5432 (Development)

#### **Users Table**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'customer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Auto-incrementing primary key
- `email`: Unique user email (used for login)
- `password`: Bcrypt hashed password
- `first_name`, `last_name`: User's full name
- `role`: 'customer' or 'admin'
- `is_active`: Account status flag
- `created_at`, `updated_at`: Timestamps

**Indexes**:
- PRIMARY KEY on `id`
- UNIQUE INDEX on `email`

---

#### **Orders Table**
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  shipping_address JSONB NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Auto-incrementing primary key
- `user_id`: Foreign key to users table
- `total_amount`: Order total in decimal format
- `status`: 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
- `shipping_address`: JSONB object with address details
- `payment_method`: 'credit_card', 'paypal', etc.
- `payment_status`: Payment processing status
- `created_at`, `updated_at`: Timestamps

**Indexes**:
- PRIMARY KEY on `id`
- FOREIGN KEY on `user_id` → `users(id)`
- INDEX on `user_id` for faster user order lookups
- INDEX on `status` for order filtering

---

#### **Order Items Table**
```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Auto-incrementing primary key
- `order_id`: Foreign key to orders table
- `product_id`: Reference to product (from product service)
- `product_name`: Denormalized product name for historical record
- `quantity`: Number of items ordered
- `price`: Price per item at time of order
- `created_at`: Timestamp

**Indexes**:
- PRIMARY KEY on `id`
- FOREIGN KEY on `order_id` → `orders(id)`
- INDEX on `order_id` for faster order item lookups

---

#### **Notifications Table**
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Auto-incrementing primary key
- `user_id`: Foreign key to users table
- `type`: 'order', 'account', 'promotion', etc.
- `title`: Notification title
- `message`: Notification message body
- `is_read`: Read status flag
- `metadata`: JSONB for additional notification data
- `created_at`: Timestamp

**Indexes**:
- PRIMARY KEY on `id`
- FOREIGN KEY on `user_id` → `users(id)`
- INDEX on `user_id` and `is_read` for efficient queries

---

### 🗄️ Product Service Database
**Database Name**: `shopnova_products`  
**Host**: Render PostgreSQL (Production) / localhost:5432 (Development)

#### **Products Table**
```sql
CREATE TABLE products (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  category_id VARCHAR(255) REFERENCES categories(id),
  tags TEXT[],
  in_stock BOOLEAN DEFAULT true,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  images TEXT[],
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: UUID or custom string primary key
- `name`: Product name
- `description`: Product description
- `price`: Current selling price
- `original_price`: Original price (for discount calculation)
- `category_id`: Foreign key to categories table
- `tags`: Array of product tags for search/filtering
- `in_stock`: Stock availability flag
- `stock`: Quantity available
- `image_url`: Primary product image URL
- `images`: Array of additional image URLs
- `rating`: Average rating (0-5)
- `review_count`: Number of reviews
- `featured`: Featured product flag
- `created_at`, `updated_at`: Timestamps

**Indexes**:
- PRIMARY KEY on `id`
- FOREIGN KEY on `category_id` → `categories(id)`
- INDEX on `category_id` for category filtering
- INDEX on `featured` for featured products
- FULL TEXT INDEX on `name` and `description` for search

---

#### **Categories Table**
```sql
CREATE TABLE categories (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(50),
  product_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: UUID or custom string primary key
- `name`: Category name (unique)
- `icon`: Emoji or icon identifier
- `color`: Hex color code for UI
- `product_count`: Cached count of products in category
- `created_at`, `updated_at`: Timestamps

**Indexes**:
- PRIMARY KEY on `id`
- UNIQUE INDEX on `name`

---

## Data Relationships

### User-Order Service
```
users (1) ──< (N) orders
orders (1) ──< (N) order_items
users (1) ──< (N) notifications
```

### Product Service
```
categories (1) ──< (N) products
```

### Cross-Service Relationships
```
orders.order_items.product_id → products.id (logical reference)
```

---

## Demo Data

### Demo Users
```sql
-- Admin User
email: admin@shopnova.com
password: admin123
role: admin

-- Customer Users
email: jane@example.com
password: customer123
role: customer

email: robert@example.com
password: customer123
role: customer

email: emily@example.com
password: customer123
role: customer
```

### Sample Categories
- Electronics 📱
- Fashion 👗
- Home & Garden 🏡
- Sports & Outdoors ⚽
- Books & Media 📚
- Toys & Games 🎮
- Health & Beauty 💄
- Automotive 🚗

---

## Database Access

### Production (Render PostgreSQL)
- **User-Order Service**: `postgresql://[credentials]@[host]/shopnova_users_orders`
- **Product Service**: `postgresql://[credentials]@[host]/shopnova_products`

### Local Development
```bash
# PostgreSQL connection (see .env.development for credentials)
Host: localhost
Port: 5432
Username: shopnova
Password: [set in .env file]
Databases: shopnova_users_orders, shopnova_products
```

---

## Backup & Migration

### Backup Commands
```bash
# Backup user-order database
pg_dump -h localhost -U shopnova shopnova_users_orders > backup_users_orders.sql

# Backup product database
pg_dump -h localhost -U shopnova shopnova_products > backup_products.sql
```

### Restore Commands
```bash
# Restore user-order database
psql -h localhost -U shopnova shopnova_users_orders < backup_users_orders.sql

# Restore product database
psql -h localhost -U shopnova shopnova_products < backup_products.sql
```

---

## Performance Considerations

### Indexes
- All foreign keys are indexed
- Frequently queried fields (status, category_id, user_id) have indexes
- Full-text search indexes on product names and descriptions

### Caching
- Redis caching layer for frequently accessed products
- Cache invalidation on product updates

### Query Optimization
- Use of JSONB for flexible data (shipping_address, metadata)
- Denormalization where appropriate (product_name in order_items)
- Connection pooling for efficient database connections

---

## Security

### Password Security
- All passwords hashed with bcrypt (10 rounds)
- No plaintext passwords stored

### SQL Injection Prevention
- Parameterized queries throughout
- Input validation and sanitization

### Access Control
- Role-based access control (RBAC)
- JWT token authentication
- Admin-only endpoints protected

---

## Monitoring

### Health Checks
- Database connection health checks on each service
- `/api/health` endpoints for monitoring

### Logging
- Query logging for slow queries (>100ms)
- Error logging for database failures
- Transaction logging for audit trails
