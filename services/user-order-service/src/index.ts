import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import amqplib from 'amqplib';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import Redis from 'ioredis';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { initializeDatabase } from './shared/database';

// Import routes
import userRoutes from './users/routes';
import orderRoutes from './orders/routes';
import notificationRoutes from './notifications/routes';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'shopnova-secret-key-change-in-production';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://shopnova:shopnova123@localhost:5672';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// WebSocket server for real-time order updates
const wss = new WebSocketServer({ server });

// Redis client for caching
const redis = new Redis(REDIS_URL);

app.use(helmet());
app.use(cors({ 
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000',
    'https://your-frontend-domain.netlify.app' // Add your Netlify domain
  ], 
  credentials: true 
}));
app.use(express.json());

// Rate limiters (disabled in test environment)
if (process.env.NODE_ENV !== 'test') {
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
  });

  const orderCreateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many order requests, please try again later.' },
  });

  app.use('/api/', generalLimiter);
  app.use('/api/auth/', authLimiter);
  app.use('/api/orders', orderCreateLimiter);
}

// Swagger documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'user-order-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);

// WebSocket connection for real-time updates
wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected');

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      
      // Handle different message types
      if (data.type === 'subscribe') {
        // Subscribe to user-specific updates
        if (data.userId) {
          // Store connection with user ID for targeted updates
          (ws as any).userId = data.userId;
          console.log(`User ${data.userId} subscribed to real-time updates`);
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// RabbitMQ setup for event publishing
let rabbitmqChannel: amqplib.Channel;

const initializeRabbitMQ = async () => {
  try {
    const connection = await amqplib.connect(RABBITMQ_URL);
    rabbitmqChannel = await connection.createChannel();
    
    // Declare exchanges
    await rabbitmqChannel.assertExchange('shopnova.events', 'topic', { durable: true });
    
    // Declare queues
    await rabbitmqChannel.assertQueue('user.order.events', { durable: true });
    await rabbitmqChannel.assertQueue('notification.events', { durable: true });
    
    // Bind queues
    await rabbitmqChannel.bindQueue('user.order.events', 'shopnova.events', 'order.*');
    await rabbitmqChannel.bindQueue('notification.events', 'shopnova.events', 'notification.*');
    
    console.log('RabbitMQ initialized successfully');
  } catch (error) {
    console.error('RabbitMQ initialization error:', error);
  }
};

// Helper function to publish events
export const publishEvent = async (routingKey: string, data: any) => {
  if (rabbitmqChannel) {
    try {
      await rabbitmqChannel.publish('shopnova.events', routingKey, Buffer.from(JSON.stringify(data)));
      console.log(`Event published: ${routingKey}`);
    } catch (error) {
      console.error('Error publishing event:', error);
    }
  }
};

// Helper function to send real-time updates via WebSocket
export const sendRealTimeUpdate = (userId: number, data: any) => {
  wss.clients.forEach((client) => {
    if ((client as any).userId === userId && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Initialize RabbitMQ
    await initializeRabbitMQ();
    
    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 User-Order Service running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`🔌 WebSocket server ready for real-time updates`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    redis.disconnect();
    if (rabbitmqChannel) {
      rabbitmqChannel.close();
    }
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    redis.disconnect();
    if (rabbitmqChannel) {
      rabbitmqChannel.close();
    }
    process.exit(0);
  });
});

startServer();
