import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { emailService } from './emailService';

const app = express();
const PORT = process.env.PORT || 3004;
const JWT_SECRET = process.env.JWT_SECRET || 'shopnova-secret-key-change-in-production';

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

// Email functions (using SendGrid)
async function sendWelcomeEmail(userData: any) {
  try {
    await emailService.sendWelcomeEmail(userData.email, userData.name || userData.firstName);
    console.log(`📧 Welcome email sent to ${userData.email}`);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
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
    console.log('✅ Notification service ready (HTTP endpoints only)');
    
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
