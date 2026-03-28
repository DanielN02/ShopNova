import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { emailService } from './emailService';

const app = express();
const PORT = process.env.PORT || 3004;
const JWT_SECRET = process.env.JWT_SECRET || 'shopnova-secret-key-change-in-production';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis client for streams
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.log('⚠️ Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

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

// Debug endpoint to check Redis streams
app.get('/api/debug/streams', async (req, res) => {
  try {
    const userEvents = await redis.xrange('user_events', '-', '+');
    const orderEvents = await redis.xrange('order_events', '-', '+');
    
    res.json({
      user_events_count: userEvents.length,
      order_events_count: orderEvents.length,
      user_events: userEvents.slice(-5), // Last 5 events
      order_events: orderEvents.slice(-5), // Last 5 events
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check streams', details: error });
  }
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
    console.log('🔍 Connecting to Redis:', REDIS_URL.replace(/:[^:]*@/, ':****@')); // Hide password
    await redis.connect();
    
    // Reset consumer groups to fix event reading issue
    try {
      // Delete existing consumer groups
      await redis.xgroup('DESTROY', 'user_events', 'notification_group');
      await redis.xgroup('DESTROY', 'order_events', 'notification_group');
      console.log('Consumer groups deleted');
    } catch (error) {
      console.log('Consumer groups did not exist');
    }

    // Create fresh consumer groups starting from all events
    try {
      await redis.xgroup('CREATE', 'user_events', 'notification_group', '0', 'MKSTREAM');
      console.log('User events consumer group created');
    } catch (error) {
      console.log('User events consumer group already exists');
    }

    try {
      await redis.xgroup('CREATE', 'order_events', 'notification_group', '0', 'MKSTREAM');
      console.log('Order events consumer group created');
    } catch (error) {
      console.log('Order events consumer group already exists');
    }

    console.log('✅ Redis Streams initialized');
  } catch (error) {
    console.log('⚠️ Redis Streams initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

// Process events from Redis Streams
const processEvents = async () => {
  while (true) {
    try {
      // Read user events
      console.log('🔍 Attempting to read user events...');
      const userEvents = await redis.xreadgroup(
        'GROUP', 'notification_group', 'notification_consumer',
        'COUNT', 1,
        'BLOCK', 1000,
        'STREAMS', 'user_events', '>'
      );
      console.log('🔍 User events read result:', userEvents);

      // Read order events
      const orderEvents = await redis.xreadgroup(
        'GROUP', 'notification_group', 'notification_consumer',
        'COUNT', 1,
        'BLOCK', 1000,
        'STREAMS', 'order_events', '>'
      );

      // Process user events
      if (userEvents && userEvents[0]) {
        console.log('🔍 User events received:', userEvents);
        const [, messages] = userEvents[0] as any;
        for (const [id, fields] of messages) {
          const eventType = fields[1];
          const data = JSON.parse(fields[3]);
          console.log('🔍 Processing user event:', eventType, data);

          if (eventType === 'user.registered') {
            await sendWelcomeEmail(data);
            await createNotification(data.userId, 'system', 'Welcome!', 'Welcome to ShopNova!');
          }
          
          await redis.xack('user_events', 'notification_group', id);
        }
      } else {
        console.log('🔍 No user events received');
      }

      // Process order events
      if (orderEvents && orderEvents[0]) {
        const [, messages] = orderEvents[0] as any;
        for (const [id, fields] of messages) {
          const eventType = fields[1];
          const data = JSON.parse(fields[3]);

          if (eventType === 'order.created') {
            await sendOrderConfirmationEmail(data);
            await createNotification(data.userId, 'order', 'Order Placed', `Your order #${data.orderId} has been placed`);
          }
          
          await redis.xack('order_events', 'notification_group', id);
        }
      }
    } catch (error) {
      console.error('Error processing events:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Email functions (using SendGrid)
async function sendWelcomeEmail(userData: any) {
  try {
    console.log('🔍 Processing welcome email for:', userData.email);
    console.log('🔍 User data:', userData);
    await emailService.sendWelcomeEmail(userData.email, userData.name || userData.firstName);
    console.log(`📧 Welcome email sent to ${userData.email}`);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
  }
}

async function sendOrderConfirmationEmail(orderData: any) {
  try {
    const userEmail = orderData.userEmail || 'customer@example.com';
    const userName = orderData.userName || 'Customer';
    const orderId = orderData.orderId || 'Unknown';
    const totalAmount = orderData.totalAmount || 0;
    
    await emailService.sendOrderConfirmationEmail(userEmail, userName, String(orderId), Number(totalAmount));
    console.log(`📧 Order confirmation email sent for order #${orderId}`);
  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error);
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
    
    // Initialize Redis Streams
    let redisAvailable = false;
    try {
      await initializeRedisStreams();
      redisAvailable = true;
    } catch (error) {
      console.log('⚠️ Redis not available - continuing without event processing');
    }
    
    // Start event processing if Redis is available
    if (redisAvailable) {
      processEvents().catch(console.error);
      console.log('✅ Event processing started - emails will be sent automatically');
    } else {
      console.log('📧 Event processing disabled - HTTP endpoints only');
    }
    
    // Start HTTP server
    app.listen(PORT, () => {
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
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Export app for testing
export { app };
