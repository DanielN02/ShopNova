import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import http from 'http';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { emailService } from './emailService';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3004;
const JWT_SECRET = process.env.JWT_SECRET || 'shopnova-secret-key-change-in-production';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis client for streams
const redis = new Redis(REDIS_URL);

app.use(helmet());
app.use(cors({ 
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000',
    'https://shopnovastore.netlify.app',
    'https://*.netlify.app' // Allow all Netlify domains as backup
  ], 
  credentials: true 
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

app.use(express.json());

// Swagger documentation (before rate limiter)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

// Middleware for JWT authentication
const authMiddleware = (req: any, res: express.Response, next: express.NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    version: '1.0.1'
  });
});

// Test endpoint (outside rate limiter)
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'ShopNova Notification Service',
    service: 'notification-service',
    status: 'running',
    docs: '/api/docs',
    health: '/api/health'
  });
});

// Get user notifications (mock implementation since no DB)
app.get('/api/notifications', authMiddleware, async (req: any, res: express.Response) => {
  try {
    // Return mock notifications since notification service doesn't have a database
    const mockNotifications = [
      {
        id: 1,
        userId: req.user.userId,
        type: 'system',
        title: 'Welcome!',
        message: 'Welcome to ShopNova! Your account has been created successfully.',
        readStatus: false,
        metadata: null,
        createdAt: new Date().toISOString()
      }
    ];
    
    res.json({
      notifications: mockNotifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read (mock implementation)
app.put('/api/notifications/:id/read', authMiddleware, async (req: any, res: express.Response) => {
  try {
    // Mock implementation - just return success
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete notification (mock implementation)
app.delete('/api/notifications/:id', authMiddleware, async (req: any, res: express.Response) => {
  try {
    // Mock implementation - just return success
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create notification (admin only - mock implementation)
app.post('/api/notifications', authMiddleware, async (req: any, res: express.Response) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, type, title, message, metadata } = req.body;

    // Mock implementation - just return success
    res.status(201).json({
      message: 'Notification created successfully',
      notification: {
        id: Date.now(),
        userId,
        type: type || 'system',
        title,
        message,
        metadata: metadata || {},
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Redis Streams setup for event consuming
const initializeRedisStreams = async () => {
  try {
    // Create consumer groups if they don't exist
    try {
      await redis.xgroup('CREATE', 'user_events', 'notification_group', '0', 'MKSTREAM');
      console.log('User events consumer group created for notification service');
    } catch (error) {
      // Group already exists
      console.log('User events consumer group already exists for notification service');
    }

    try {
      await redis.xgroup('CREATE', 'order_events', 'notification_group', '0', 'MKSTREAM');
      console.log('Order events consumer group created for notification service');
    } catch (error) {
      // Group already exists
      console.log('Order events consumer group already exists for notification service');
    }

    console.log('Redis Streams initialized successfully for notification service');
  } catch (error) {
    console.error('Redis Streams initialization error:', error);
  }
};

// Process events from Redis Streams
const processEvents = async () => {
  while (true) {
    try {
      // Read user events
      const userEvents = await redis.xreadgroup(
        'GROUP', 'notification_group', 'notification_consumer',
        'COUNT', 1,
        'BLOCK', 1000,
        'STREAMS', 'user_events', '>'
      );

      // Read order events
      const orderEvents = await redis.xreadgroup(
        'GROUP', 'notification_group', 'notification_consumer',
        'COUNT', 1,
        'BLOCK', 1000,
        'STREAMS', 'order_events', '>'
      );

      // Process user events
      if (userEvents && userEvents[0]) {
        const [, messages] = userEvents[0] as any;
        for (const [id, fields] of messages) {
          await handleUserEvent(fields);
          await redis.xack('user_events', 'notification_group', id);
        }
      }

      // Process order events
      if (orderEvents && orderEvents[0]) {
        const [, messages] = orderEvents[0] as any;
        for (const [id, fields] of messages) {
          await handleOrderEvent(fields);
          await redis.xack('order_events', 'notification_group', id);
        }
      }
    } catch (error) {
      console.error('Error processing events:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Event handlers
async function handleUserEvent(fields: string[]) {
  const eventType = fields[1];
  const data = JSON.parse(fields[3]);

  switch (eventType) {
    case 'user.registered':
      await sendWelcomeEmail(data);
      await createNotification(data.userId, 'system', 'Welcome!', 'Welcome to ShopNova! Your account has been created successfully.');
      break;
    default:
      console.log('Unknown user event:', eventType);
  }
}

async function handleOrderEvent(fields: string[]) {
  const eventType = fields[1];
  const data = JSON.parse(fields[3]);

  switch (eventType) {
    case 'order.created':
      await sendOrderConfirmationEmail(data);
      await createNotification(data.userId, 'order', 'Order Placed', `Your order #${data.orderId} has been placed successfully.`);
      break;
    case 'order.updated':
      await sendOrderStatusUpdateEmail(data);
      await createNotification(data.userId, 'order', 'Order Status Updated', `Your order #${data.orderId} status has been updated to ${data.newStatus}.`);
      break;
    default:
      console.log('Unknown order event:', eventType);
  }
}

// Email functions (using SendGrid)
async function sendWelcomeEmail(userData: any) {
  try {
    await emailService.sendWelcomeEmail(userData.email, userData.name || userData.firstName);
    console.log(`📧 Welcome email sent to ${userData.email}`);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
  }
}

async function sendOrderConfirmationEmail(orderData: any) {
  try {
    // Get user email from order data or database
    const userEmail = orderData.userEmail || 'customer@example.com';
    const userName = orderData.userName || 'Customer';
    
    await emailService.sendOrderConfirmationEmail(userEmail, userName, orderData.orderId, orderData.totalAmount);
    console.log(`📧 Order confirmation email sent for order #${orderData.orderId}`);
  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error);
  }
}

async function sendOrderStatusUpdateEmail(orderData: any) {
  try {
    // Get user email from order data or database
    const userEmail = orderData.userEmail || 'customer@example.com';
    const userName = orderData.userName || 'Customer';
    
    if (orderData.newStatus === 'shipped' && orderData.trackingNumber) {
      await emailService.sendShippingConfirmationEmail(userEmail, userName, orderData.orderId, orderData.trackingNumber);
    } else {
      // Generic status update
      await emailService.sendEmail({
        to: userEmail,
        subject: `Order Status Update #${orderData.orderId}`,
        text: `Hi ${userName},\n\nYour order #${orderData.orderId} status has been updated to: ${orderData.newStatus}\n\nThank you for shopping at ShopNova!\nThe ShopNova Team`
      });
    }
    console.log(`📧 Order status update email sent for order #${orderData.orderId}`);
  } catch (error) {
    console.error('❌ Error sending order status update email:', error);
  }
}

// Create notification in database (mock implementation)
async function createNotification(userId: number, type: string, title: string, message: string) {
  try {
    // Mock implementation - just log the notification
    console.log(`Mock notification created for user ${userId}: ${title}`);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting notification service...');
    
    // Database not needed for notification service
    console.log('✅ Notification service ready (no database required)');
    
    // Initialize Redis Streams
    try {
      await initializeRedisStreams();
      console.log('✅ Redis Streams initialized');
    } catch (redisError) {
      console.log('⚠️ Redis not available - continuing without event processing');
      console.log('   (Email functionality will still work via direct API calls)');
    }
    
    // Start HTTP server (event processing disabled for now)
    console.log('📧 Event processing disabled - HTTP endpoints only');
    
    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 Notification Service running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`📧 Email transporter ready`);
      console.log(`🔗 Available endpoints:`);
      console.log(`   GET  /                    - Root endpoint`);
      console.log(`   GET  /api/test            - Test endpoint`);
      console.log(`   GET  /api/health          - Health check`);
      console.log(`   GET  /api/docs            - Swagger documentation`);
      console.log(`   GET  /api/notifications   - Get notifications (auth required)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  redis.disconnect();
  process.exit(0);
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Export app for testing
export { app };
