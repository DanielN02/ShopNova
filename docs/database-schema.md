# ShopNova Database Schema

## Overview

ShopNova uses a polyglot persistence strategy — different databases for different services based on data requirements.

| Database       | Services                          | Reason                                                    |
| -------------- | --------------------------------- | --------------------------------------------------------- |
| **PostgreSQL** | user-service, order-service       | Relational data with ACID transactions, foreign keys      |
| **MongoDB**    | product-service, notification-service | Flexible schemas, variable fields (tags, images, metadata) |
| **Redis**      | product-service, order-service    | Response caching with TTL                                 |
| **Elasticsearch** | product-service                | Full-text search with fuzzy matching and relevance scoring |

---

## PostgreSQL Schemas

### `user_service` Database

#### `users` Table

| Column       | Type                     | Constraints              | Description              |
| ------------ | ------------------------ | ------------------------ | ------------------------ |
| `id`         | `SERIAL`                 | `PRIMARY KEY`            | Auto-increment ID        |
| `email`      | `VARCHAR(255)`           | `UNIQUE NOT NULL`        | Login email              |
| `password`   | `VARCHAR(255)`           | `NOT NULL`               | bcrypt hashed password   |
| `first_name` | `VARCHAR(100)`           |                          | First name               |
| `last_name`  | `VARCHAR(100)`           |                          | Last name                |
| `name`       | `VARCHAR(200)`           |                          | Full display name        |
| `role`       | `VARCHAR(50)`            | `DEFAULT 'customer'`     | `admin` or `customer`    |
| `avatar`     | `VARCHAR(500)`           |                          | Avatar URL               |
| `phone`      | `VARCHAR(50)`            |                          | Phone number             |
| `created_at` | `TIMESTAMP`              | `DEFAULT CURRENT_TIMESTAMP` | Account creation time |
| `updated_at` | `TIMESTAMP`              | `DEFAULT CURRENT_TIMESTAMP` | Last update time      |

**Indexes:**
- `idx_users_email` on `email`

---

### `order_service` Database

#### `orders` Table

| Column             | Type            | Constraints                  | Description                  |
| ------------------ | --------------- | ---------------------------- | ---------------------------- |
| `id`               | `SERIAL`        | `PRIMARY KEY`                | Auto-increment ID            |
| `order_number`     | `VARCHAR(50)`   | `UNIQUE NOT NULL`            | Human-readable order number  |
| `user_id`          | `INTEGER`       | `NOT NULL`                   | References user (cross-service) |
| `total_amount`     | `DECIMAL(10,2)` | `NOT NULL`                   | Final total (subtotal+tax+shipping) |
| `subtotal`         | `DECIMAL(10,2)` | `NOT NULL`                   | Items subtotal               |
| `tax`              | `DECIMAL(10,2)` | `DEFAULT 0`                  | Tax amount (8%)              |
| `shipping`         | `DECIMAL(10,2)` | `DEFAULT 0`                  | Shipping cost (free over $50)|
| `status`           | `VARCHAR(50)`   | `DEFAULT 'pending'`          | `pending`, `processing`, `shipped`, `delivered`, `cancelled` |
| `payment_status`   | `VARCHAR(50)`   | `DEFAULT 'pending'`          | `pending`, `paid`, `refunded`|
| `payment_method`   | `VARCHAR(50)`   |                              | e.g., `card`                 |
| `shipping_address` | `JSONB`         |                              | Structured address object    |
| `tracking_number`  | `VARCHAR(100)`  |                              | Shipping tracking number     |
| `created_at`       | `TIMESTAMP`     | `DEFAULT CURRENT_TIMESTAMP`  | Order creation time          |
| `updated_at`       | `TIMESTAMP`     | `DEFAULT CURRENT_TIMESTAMP`  | Last status update           |

**Indexes:**
- `idx_orders_user_id` on `user_id`
- `idx_orders_status` on `status`
- `idx_orders_order_number` on `order_number`

#### `order_items` Table

| Column          | Type            | Constraints                            | Description          |
| --------------- | --------------- | -------------------------------------- | -------------------- |
| `id`            | `SERIAL`        | `PRIMARY KEY`                          | Auto-increment ID    |
| `order_id`      | `INTEGER`       | `REFERENCES orders(id) ON DELETE CASCADE` | Parent order      |
| `product_id`    | `VARCHAR(100)`  | `NOT NULL`                             | MongoDB product _id  |
| `product_name`  | `VARCHAR(255)`  | `NOT NULL`                             | Snapshot of name     |
| `product_image` | `VARCHAR(500)`  |                                        | Snapshot of image    |
| `quantity`      | `INTEGER`       | `NOT NULL`                             | Quantity ordered     |
| `price`         | `DECIMAL(10,2)` | `NOT NULL`                             | Price at time of order |
| `created_at`    | `TIMESTAMP`     | `DEFAULT CURRENT_TIMESTAMP`            | Creation time        |

**Indexes:**
- `idx_order_items_order_id` on `order_id`

---

## MongoDB Schemas

### `product_service` Database

#### `products` Collection

```json
{
  "_id": "ObjectId",
  "name": "String (required, indexed)",
  "description": "String (required)",
  "price": "Number (required)",
  "originalPrice": "Number (optional, for sale items)",
  "category": "String (required, indexed)",
  "tags": ["String"],
  "image": "String (primary image URL)",
  "images": ["String (additional image URLs)"],
  "rating": "Number (0-5, default 0)",
  "reviewCount": "Number (default 0)",
  "stock": "Number (default 0)",
  "featured": "Boolean (default false)",
  "createdAt": "Date"
}
```

**Indexes:**
- Text index on `name`, `description`, `tags` (MongoDB full-text search fallback)
- Field index on `name`
- Field index on `category`

#### `categories` Collection

```json
{
  "_id": "ObjectId",
  "name": "String (required, unique)",
  "icon": "String (emoji)",
  "productCount": "Number (default 0)",
  "color": "String (TailwindCSS class)"
}
```

#### `reviews` Collection

```json
{
  "_id": "ObjectId",
  "productId": "ObjectId (ref: Product, indexed)",
  "userId": "String (from JWT)",
  "userName": "String",
  "userAvatar": "String (optional)",
  "rating": "Number (1-5, required)",
  "comment": "String (required)",
  "createdAt": "Date"
}
```

---

### `notification_service` Database

#### `notifications` Collection

```json
{
  "_id": "ObjectId",
  "userId": "String (indexed)",
  "type": "String (enum: 'order', 'promo', 'system')",
  "title": "String (required)",
  "message": "String (required)",
  "read": "Boolean (default false)",
  "metadata": "Mixed (optional, e.g., orderId, orderNumber)",
  "createdAt": "Date"
}
```

---

## Elasticsearch Index

### `shopnova_products` Index

| Field         | ES Type     | Notes                    |
| ------------- | ----------- | ------------------------ |
| `name`        | `text`      | Standard analyzer        |
| `description` | `text`      | Standard analyzer        |
| `category`    | `keyword`   | Exact match filtering    |
| `tags`        | `keyword`   | Exact match filtering    |
| `price`       | `float`     | Range queries            |
| `rating`      | `float`     | Range queries            |
| `stock`       | `integer`   |                          |
| `featured`    | `boolean`   |                          |
| `image`       | `keyword`   | Not indexed (stored only)|
| `createdAt`   | `date`      |                          |

Products are synced from MongoDB to Elasticsearch on startup and on every create/update/delete operation.

---

## Redis Caching Strategy

| Key Pattern                 | TTL    | Service          | Description                |
| --------------------------- | ------ | ---------------- | -------------------------- |
| `products:{queryHash}`      | 60s    | product-service  | Product list query results |
| `product:{id}`              | 300s   | product-service  | Single product cache       |
| `categories`                | 600s   | product-service  | All categories             |

Cache is invalidated on product create, update, and delete operations.

---

## RabbitMQ Event Flow

**Exchange:** `shopnova_events` (topic, durable)

| Routing Key            | Publisher           | Consumers                          | Payload                                    |
| ---------------------- | ------------------- | ---------------------------------- | ------------------------------------------ |
| `user.registered`      | user-service        | notification-service               | `{ userId, email, name }`                  |
| `user.login`           | user-service        | —                                  | `{ userId, email }`                        |
| `order.created`        | order-service       | notification-service               | `{ orderId, orderNumber, userId, total, email }` |
| `order.status_updated` | order-service       | notification-service               | `{ orderId, status, userId }`              |
| `order.cancelled`      | order-service       | notification-service               | `{ orderId, userId }`                      |
| `product.created`      | product-service     | —                                  | `{ productId, name }`                      |
| `product.updated`      | product-service     | —                                  | `{ productId, name }`                      |

**Queues:**
- `notification_service_queue` — binds `order.*` and `user.*`
- `order_service_queue` — binds `order.*`
