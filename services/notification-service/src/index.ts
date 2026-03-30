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

// Trust proxy - required for rate limiting behind reverse proxy
app.set('trust proxy', 1);

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
    skip: (req) => process.env.NODE_ENV === 'test',
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
    res.status(500).json({ error: 'Failed to fetch stream data' });
  }
});

// Debug endpoint to check email configuration
app.get('/api/debug/email', (req, res) => {
  res.json({
    sendgrid_api_key_configured: process.env.SENDGRID_API_KEY ? 'YES' : 'NO',
    sendgrid_api_key_format: process.env.SENDGRID_API_KEY?.startsWith('SG.') ? 'VALID' : 'INVALID',
    sendgrid_api_key_prefix: process.env.SENDGRID_API_KEY?.substring(0, 20) + '...',
    email_from: process.env.EMAIL_FROM,
    email_from_name: process.env.EMAIL_FROM_NAME
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

// Email deliverability test endpoint
app.post('/api/email/test-deliverability', async (req: express.Request, res: express.Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    console.log('🧪 Testing email deliverability to:', email);

    // Send test email with spam-safe content
    await emailService.sendEmail({
      to: email,
      subject: 'ShopNova Test Email - Deliverability Check',
      text: `Hello,\n\nThis is a test email from ShopNova to verify deliverability.\n\nIf you received this email, our email system is working correctly.\n\nShopNova Test Team`,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ShopNova Test Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #667eea; color: white; padding: 20px; text-align: center;">
            <h1>ShopNova Test Email</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
            <p>Hello,</p>
            <p>This is a test email from ShopNova to verify deliverability.</p>
            <p>If you received this email, our email system is working correctly.</p>
            <p>Best regards,<br>ShopNova Test Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>&copy; 2024 ShopNova. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
      `
    });

    res.json({ 
      message: 'Test email sent successfully',
      recommendations: [
        'Check if email arrived in inbox (not spam)',
        'If in spam, mark as "Not Spam" to train filters',
        'Add noreply@shopnova.com to contacts',
        'Consider setting up SPF/DKIM/DMARC records'
      ]
    });

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Get email setup recommendations
app.get('/api/email/setup-recommendations', async (req: express.Request, res: express.Response) => {
  try {
    const validation = await emailService.validateEmailSetup();
    
    res.json({
      currentSetup: validation,
      freeImprovements: [
        '✅ Enhanced email headers with anti-spam markers',
        '✅ Content validation to avoid spam triggers',
        '✅ Shortened URLs under 120 characters',
        '✅ Rate limiting between email sends',
        '✅ Improved subject lines and content',
        '✅ Added unsubscribe headers',
        '✅ Enhanced sender identification'
      ],
      nextSteps: [
        '1. Send test emails to verify deliverability',
        '2. Check spam folder and mark as "Not Spam"',
        '3. Add sender email to contacts',
        '4. Monitor email open rates',
        '5. Consider custom domain for better deliverability (optional)'
      ]
    });

  } catch (error) {
    console.error('Setup recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
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
    
    // Create consumer groups if they don't exist
    // Use '0' to read from the beginning (all events), not '$' (only new events)
    try {
      await redis.xgroup('CREATE', 'user_events', 'notification_group', '0', 'MKSTREAM');
      console.log('✅ User events consumer group created');
    } catch (error: any) {
      if (error.message.includes('BUSYGROUP')) {
        console.log('ℹ️ User events consumer group already exists');
      } else {
        throw error;
      }
    }

    try {
      await redis.xgroup('CREATE', 'order_events', 'notification_group', '0', 'MKSTREAM');
      console.log('✅ Order events consumer group created');
    } catch (error: any) {
      if (error.message.includes('BUSYGROUP')) {
        console.log('ℹ️ Order events consumer group already exists');
      } else {
        throw error;
      }
    }

    console.log('✅ Redis Streams initialized');
  } catch (error) {
    console.log('⚠️ Redis Streams initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

// Process events from Redis Streams
const processEvents = async () => {
  console.log('🚀 Starting event processor...');
  while (true) {
    try {
      // Check if streams exist before reading
      const streamKeys = await redis.keys('*_events');
      const hasUserEvents = streamKeys.includes('user_events');
      const hasOrderEvents = streamKeys.includes('order_events');
      
      if (!hasUserEvents && !hasOrderEvents) {
        // No streams exist yet, wait and retry
        console.log('⏳ Waiting for streams to be created...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      // Build dynamic stream list based on what exists
      const streamList = [];
      const streamIds = [];
      
      if (hasUserEvents) {
        streamList.push('user_events');
        streamIds.push('>');
      }
      
      if (hasOrderEvents) {
        streamList.push('order_events');
        streamIds.push('>');
      }

      // Read events from existing streams
      const events = await redis.xreadgroup(
        'GROUP', 'notification_group', 'notification_consumer',
        'COUNT', 10,
        'BLOCK', 1000,
        'STREAMS', ...streamList, ...streamIds
      );

      if (events && events.length > 0) {
        console.log(`📨 Received ${events.length} event stream(s)`);
        
        for (const [streamName, messages] of events as any[]) {
          console.log(`📨 Processing ${(messages as any[]).length} message(s) from ${streamName}`);
          
          for (const [id, fields] of messages) {
            try {
              const eventType = fields[1];
              const eventData = fields[3];
              const data = JSON.parse(eventData);
              
              console.log(`📨 Event: ${eventType} (ID: ${id})`);
              console.log(`📨 Data:`, data);

              if (streamName === 'user_events' && eventType === 'user.registered') {
                console.log(`📧 Sending welcome email to ${data.email}`);
                await sendWelcomeEmail(data);
                await createNotification(data.userId, 'system', 'Welcome!', 'Welcome to ShopNova!');
                console.log(`✅ Welcome email sent to ${data.email}`);
              } else if (streamName === 'order_events' && eventType === 'order.created') {
                console.log(`📧 Sending order confirmation email to ${data.userEmail}`);
                await sendOrderConfirmationEmail(data);
                await createNotification(data.userId, 'order', 'Order Placed', `Your order #${data.orderId} has been placed`);
                console.log(`✅ Order confirmation email sent to ${data.userEmail}`);
              }
              
              // Acknowledge the message
              await redis.xack(streamName as string, 'notification_group', id);
              console.log(`✅ Message acknowledged: ${id}`);
            } catch (msgError) {
              console.error(`❌ Error processing message ${id}:`, msgError);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in event processor:', error);
      // Wait before retrying
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
