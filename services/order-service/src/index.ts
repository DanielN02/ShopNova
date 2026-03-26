import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import amqplib from 'amqplib';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import Redis from 'ioredis';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'shopnova-secret-key-change-in-production';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://shopnova:shopnova123@localhost:5672';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

// Rate limiters (disabled in test environment)
if (process.env.NODE_ENV !== 'test') {
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  const orderCreateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many order requests, please try again later.' },
  });

  app.use('/api/', generalLimiter);
  app.use('/api/orders', orderCreateLimiter);
}
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'shopnova',
  password: process.env.DB_PASSWORD || 'shopnova123',
  database: process.env.DB_NAME || 'order_service',
});

let channel: amqplib.Channel | null = null;
let redis: Redis | null = null;
const wsClients = new Map<string, WebSocket>();

interface AuthRequest extends express.Request {
  user?: { id: number; email: string; role: string };
}

function authMiddleware(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Authentication required' }); return; }
  try {
    req.user = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        tax DECIMAL(10, 2) DEFAULT 0,
        shipping DECIMAL(10, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        payment_status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        shipping_address JSONB,
        tracking_number VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        product_image VARCHAR(500),
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    console.log('Order DB initialized');
  } catch (err) {
    console.error('DB init error:', (err as Error).message);
  }
}

async function connectServices() {
  try {
    const conn = await amqplib.connect(RABBITMQ_URL);
    channel = await conn.createChannel();
    await channel.assertExchange('shopnova_events', 'topic', { durable: true });
    const q = await channel.assertQueue('order_service_queue', { durable: true });
    await channel.bindQueue(q.queue, 'shopnova_events', 'order.*');
    console.log('RabbitMQ connected');
  } catch { console.warn('RabbitMQ not available'); }

  try {
    redis = new Redis(REDIS_URL);
    redis.on('error', () => { redis = null; });
    console.log('Redis connected');
  } catch { console.warn('Redis not available'); }
}

function publishEvent(routingKey: string, data: Record<string, unknown>) {
  if (channel) channel.publish('shopnova_events', routingKey, Buffer.from(JSON.stringify(data)));
}

function notifyClient(userId: string, data: Record<string, unknown>) {
  const ws = wsClients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function generateOrderNumber(): string {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

// Mock payment processing
async function processPayment(_amount: number, _method: string): Promise<{ success: boolean; transactionId: string }> {
  await new Promise(r => setTimeout(r, 1000));
  return { success: true, transactionId: `TXN-${Date.now().toString(36).toUpperCase()}` };
}

// Create order
app.post('/api/orders', authMiddleware,
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required for each item'),
  body('items.*.productName').notEmpty().withMessage('Product name is required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('shippingAddress').optional().isObject().withMessage('Shipping address must be an object'),
  body('paymentMethod').optional().isString().withMessage('Payment method must be a string'),
  async (req: AuthRequest, res: express.Response) => {
  const valErrors = validationResult(req);
  if (!valErrors.isEmpty()) { res.status(400).json({ errors: valErrors.array() }); return; }
  const { items, shippingAddress, paymentMethod } = req.body;
  if (!items || items.length === 0) { res.status(400).json({ error: 'No items in order' }); return; }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const subtotal = items.reduce((sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity, 0);
    const shipping = subtotal >= 50 ? 0 : 9.99;
    const tax = subtotal * 0.08;
    const total = subtotal + tax + shipping;
    const orderNumber = generateOrderNumber();

    const orderResult = await client.query(
      `INSERT INTO orders (order_number, user_id, subtotal, tax, shipping, total_amount, status, payment_status, payment_method, shipping_address)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'pending', $7, $8) RETURNING *`,
      [orderNumber, req.user!.id, subtotal, tax, shipping, total, paymentMethod || 'card', JSON.stringify(shippingAddress)]
    );
    const order = orderResult.rows[0];

    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, price) VALUES ($1, $2, $3, $4, $5, $6)',
        [order.id, item.productId, item.productName, item.productImage || '', item.quantity, item.price]
      );
    }

    // Process payment
    const payment = await processPayment(total, paymentMethod || 'card');
    if (payment.success) {
      await client.query(
        "UPDATE orders SET payment_status = 'paid', status = 'processing', updated_at = NOW() WHERE id = $1",
        [order.id]
      );
      order.payment_status = 'paid';
      order.status = 'processing';
    }

    await client.query('COMMIT');

    publishEvent('order.created', {
      orderId: order.id,
      orderNumber,
      userId: req.user!.id,
      total,
      email: req.user!.email,
    });

    notifyClient(req.user!.id.toString(), {
      type: 'order_update',
      orderId: order.id,
      orderNumber,
      status: order.status,
      message: `Order ${orderNumber} placed successfully!`,
    });

    const orderItems = await client.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    res.status(201).json({ ...order, items: orderItems.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// Get user orders
app.get('/api/orders', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  try {
    const orders = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    const result = [];
    for (const order of orders.rows) {
      const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      result.push({ ...order, items: items.rows });
    }
    res.json(result);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single order
app.get('/api/orders/:id', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  try {
    const order = await pool.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    if (order.rows.length === 0) { res.status(404).json({ error: 'Order not found' }); return; }
    const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
    res.json({ ...order.rows[0], items: items.rows });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel order
app.put('/api/orders/:id/cancel', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  try {
    const order = await pool.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    if (order.rows.length === 0) { res.status(404).json({ error: 'Order not found' }); return; }
    if (!['pending', 'processing'].includes(order.rows[0].status)) {
      res.status(400).json({ error: 'Cannot cancel order in current status' }); return;
    }
    await pool.query("UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [req.params.id]);
    publishEvent('order.cancelled', { orderId: order.rows[0].id, userId: req.user!.id });
    notifyClient(req.user!.id.toString(), {
      type: 'order_update',
      orderId: order.rows[0].id,
      status: 'cancelled',
      message: `Order #${order.rows[0].order_number} has been cancelled.`,
    });
    res.json({ message: 'Order cancelled' });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get all orders
app.get('/api/orders/admin/all', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  if (req.user?.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM orders';
    const params: string[] = [];
    if (status && status !== 'all') {
      query += ' WHERE status = $1';
      params.push(status as string);
    }
    query += ' ORDER BY created_at DESC';
    const orders = await pool.query(query, params);
    const result = [];
    for (const order of orders.rows) {
      const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      result.push({ ...order, items: items.rows });
    }
    res.json(result);
  } catch (err) {
    console.error('Admin get orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Update order status
app.put('/api/orders/:id/status', authMiddleware,
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status value'),
  async (req: AuthRequest, res: express.Response) => {
  const valErrors = validationResult(req);
  if (!valErrors.isEmpty()) { res.status(400).json({ errors: valErrors.array() }); return; }
  if (req.user?.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  const { status } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) { res.status(400).json({ error: 'Invalid status' }); return; }
  try {
    const trackingNumber = status === 'shipped' ? `SN-TRK-${Date.now().toString(36).toUpperCase()}` : null;
    const result = await pool.query(
      `UPDATE orders SET status = $1, tracking_number = COALESCE($2, tracking_number), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, trackingNumber, req.params.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Order not found' }); return; }
    const order = result.rows[0];
    publishEvent('order.status_updated', { orderId: order.id, status, userId: order.user_id });
    notifyClient(order.user_id.toString(), {
      type: 'order_update',
      orderId: order.id,
      orderNumber: order.order_number,
      status,
      message: `Order #${order.order_number} is now ${status}.`,
    });
    res.json(order);
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics
app.get('/api/orders/analytics/summary', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  if (req.user?.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  try {
    const [revenue, orderCount, customerCount, statusBreakdown, recentOrders, topProducts, ordersPerUser, revenueByMonth] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = 'paid'"),
      pool.query('SELECT COUNT(*) as count FROM orders'),
      pool.query('SELECT COUNT(DISTINCT user_id) as count FROM orders'),
      pool.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status'),
      pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10'),
      // Most purchased products — aggregates order_items by product
      pool.query(`
        SELECT oi.product_name as name, oi.product_image as image,
               SUM(oi.quantity) as sold,
               SUM(oi.quantity * oi.price) as revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id AND o.payment_status = 'paid'
        GROUP BY oi.product_name, oi.product_image
        ORDER BY sold DESC
        LIMIT 10
      `),
      // Orders per user
      pool.query(`
        SELECT o.user_id, COUNT(*) as orders,
               COALESCE(SUM(o.total_amount), 0) as spent
        FROM orders o
        GROUP BY o.user_id
        ORDER BY orders DESC
        LIMIT 10
      `),
      // Revenue by month (last 6 months)
      pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
               COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE payment_status = 'paid'
          AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `),
    ]);

    res.json({
      totalRevenue: parseFloat(revenue.rows[0].total),
      totalOrders: parseInt(orderCount.rows[0].count),
      totalCustomers: parseInt(customerCount.rows[0].count),
      ordersByStatus: statusBreakdown.rows.map((r: { status: string; count: string }) => ({
        status: r.status,
        count: parseInt(r.count),
      })),
      recentOrders: recentOrders.rows,
      topProducts: topProducts.rows.map((r: { name: string; image: string; sold: string; revenue: string }) => ({
        name: r.name,
        image: r.image,
        sold: parseInt(r.sold),
        revenue: parseFloat(r.revenue),
      })),
      ordersPerUser: ordersPerUser.rows.map((r: { user_id: number; orders: string; spent: string }) => ({
        userId: r.user_id,
        orders: parseInt(r.orders),
        spent: parseFloat(r.spent),
      })),
      revenueByMonth: revenueByMonth.rows.map((r: { month: string; revenue: string }) => ({
        month: r.month,
        revenue: parseFloat(r.revenue),
      })),
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'order-service' });
});

async function start() {
  await initDB();
  await connectServices();

  const server = http.createServer(app);

  // WebSocket for real-time order updates
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://localhost:${PORT}`);
    const token = url.searchParams.get('token');
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
        wsClients.set(decoded.id.toString(), ws);
        ws.on('close', () => wsClients.delete(decoded.id.toString()));
        ws.send(JSON.stringify({ type: 'connected', message: 'Real-time updates enabled' }));
      } catch {
        ws.close(4001, 'Invalid token');
      }
    } else {
      ws.close(4001, 'Token required');
    }
  });

  server.listen(PORT, () => console.log(`Order Service running on port ${PORT}`));
}

export { app, pool, JWT_SECRET };

if (require.main === module) {
  start();
}
