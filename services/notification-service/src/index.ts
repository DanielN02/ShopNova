import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import amqplib from 'amqplib';
import nodemailer from 'nodemailer';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

const app = express();
const PORT = process.env.PORT || 3004;
const JWT_SECRET = process.env.JWT_SECRET || 'shopnova-secret-key-change-in-production';
const MONGO_URL = process.env.MONGO_URL || 'mongodb://shopnova:shopnova123@localhost:27017/notification_service?authSource=admin';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://shopnova:shopnova123@localhost:5672';

app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

// Rate limiter
if (process.env.NODE_ENV !== 'test') {
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  app.use('/api/', generalLimiter);
}
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

let channel: amqplib.Channel | null = null;
const wsClients = new Map<string, WebSocket>();

// MongoDB Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['order', 'promo', 'system'], default: 'system' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model('Notification', notificationSchema);

// Mock email transporter (uses ethereal for testing)
let transporter: nodemailer.Transporter | null = null;

async function setupEmailTransporter() {
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('Email transporter ready (Ethereal test account)');
  } catch {
    console.warn('Email transporter not available, using console logging');
  }
}

async function sendEmail(to: string, subject: string, html: string) {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: '"ShopNova" <noreply@shopnova.com>',
        to,
        subject,
        html,
      });
      console.log('Email sent:', nodemailer.getTestMessageUrl(info));
    } catch (err) {
      console.error('Email send error:', err);
    }
  } else {
    console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
  }
}

// Auth middleware
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

// RabbitMQ consumer
async function connectRabbitMQ() {
  try {
    const conn = await amqplib.connect(RABBITMQ_URL);
    channel = await conn.createChannel();
    await channel.assertExchange('shopnova_events', 'topic', { durable: true });
    const q = await channel.assertQueue('notification_service_queue', { durable: true });

    // Listen for order events
    await channel.bindQueue(q.queue, 'shopnova_events', 'order.*');
    await channel.bindQueue(q.queue, 'shopnova_events', 'user.*');

    channel.consume(q.queue, async (msg) => {
      if (!msg) return;
      try {
        const routingKey = msg.fields.routingKey;
        const data = JSON.parse(msg.content.toString());
        console.log(`Received event: ${routingKey}`, data);

        if (routingKey === 'order.created') {
          await createNotification({
            userId: data.userId.toString(),
            type: 'order',
            title: 'Order Confirmed!',
            message: `Your order #${data.orderNumber} has been placed successfully. Total: $${data.total?.toFixed(2)}`,
            metadata: { orderId: data.orderId, orderNumber: data.orderNumber },
          });
          if (data.email) {
            await sendEmail(
              data.email,
              `Order Confirmation - ${data.orderNumber}`,
              `<h2>Thank you for your order!</h2>
               <p>Order <strong>#${data.orderNumber}</strong> has been confirmed.</p>
               <p>Total: <strong>$${data.total?.toFixed(2)}</strong></p>
               <p>We'll notify you when your order ships.</p>
               <br><p>— The ShopNova Team</p>`
            );
          }
        }

        if (routingKey === 'order.status_updated') {
          await createNotification({
            userId: data.userId.toString(),
            type: 'order',
            title: `Order ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
            message: `Your order status has been updated to "${data.status}".`,
            metadata: { orderId: data.orderId, status: data.status },
          });
        }

        if (routingKey === 'order.cancelled') {
          await createNotification({
            userId: data.userId.toString(),
            type: 'order',
            title: 'Order Cancelled',
            message: `Your order has been cancelled. Any charges will be refunded.`,
            metadata: { orderId: data.orderId },
          });
        }

        if (routingKey === 'user.registered') {
          await createNotification({
            userId: data.userId.toString(),
            type: 'system',
            title: 'Welcome to ShopNova!',
            message: 'Your account has been created. Start exploring our products!',
          });
          if (data.email) {
            await sendEmail(
              data.email,
              'Welcome to ShopNova!',
              `<h2>Welcome, ${data.name}!</h2>
               <p>Your ShopNova account is ready. Start shopping now!</p>
               <br><p>— The ShopNova Team</p>`
            );
          }
        }

        channel?.ack(msg);
      } catch (err) {
        console.error('Error processing message:', err);
        channel?.nack(msg, false, false);
      }
    });

    console.log('RabbitMQ consumer started');
  } catch (err) {
    console.warn('RabbitMQ not available:', (err as Error).message);
  }
}

async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const notification = new Notification(data);
  await notification.save();

  // Push notification to connected WebSocket client in real-time
  pushToClient(data.userId, {
    type: 'push_notification',
    notification: {
      id: notification._id,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata,
      read: false,
      createdAt: notification.createdAt,
    },
  });

  return notification;
}

function pushToClient(userId: string, payload: Record<string, unknown>) {
  const ws = wsClients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

// Seed some notifications for demo users
async function seedNotifications() {
  const count = await Notification.countDocuments();
  if (count > 0) return;

  const seedData = [
    { userId: '2', type: 'order', title: 'Order Shipped!', message: 'Your order #ORD-002 has been shipped. Tracking: SN-TRK-005678', read: false },
    { userId: '2', type: 'promo', title: 'Flash Sale — 30% Off Electronics!', message: 'Today only: get 30% off on all electronics. Use code FLASH30 at checkout.', read: false },
    { userId: '2', type: 'order', title: 'Order Delivered', message: 'Your order #ORD-001 has been delivered. Enjoy your purchase!', read: true },
  ];

  await Notification.insertMany(seedData);
  console.log('Seeded notifications');
}

// ROUTES

// Get user notifications
app.get('/api/notifications', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  try {
    const notifications = await Notification.find({ userId: req.user!.id.toString() })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(notifications);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id.toString() },
      { read: true }
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all as read
app.put('/api/notifications/read-all', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  try {
    await Notification.updateMany(
      { userId: req.user!.id.toString(), read: false },
      { read: true }
    );
    res.json({ message: 'All marked as read' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create notification (internal / admin)
app.post('/api/notifications', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  if (req.user?.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  try {
    const notification = await createNotification(req.body);
    res.status(201).json(notification);
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

async function start() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB error:', (err as Error).message);
  }
  await setupEmailTransporter();
  await connectRabbitMQ();
  await seedNotifications();

  const server = http.createServer(app);

  // WebSocket server for push notifications
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://localhost:${PORT}`);
    const token = url.searchParams.get('token');
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
        const userId = decoded.id.toString();
        wsClients.set(userId, ws);
        ws.on('close', () => wsClients.delete(userId));
        ws.send(JSON.stringify({ type: 'connected', message: 'Push notifications enabled' }));
        console.log(`WS client connected: user ${userId}`);
      } catch {
        ws.close(4001, 'Invalid token');
      }
    } else {
      ws.close(4001, 'Token required');
    }
  });

  server.listen(PORT, () => console.log(`Notification Service running on port ${PORT}`));
}

export { app, Notification };

if (require.main === module) {
  start();
}
