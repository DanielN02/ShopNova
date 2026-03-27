import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import Redis from 'ioredis';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { initializeDatabase, pool } from './shared/database';
import bcrypt from 'bcryptjs';

// Import routes
import userRoutes from './users/routes';
import orderRoutes from './orders/routes';
import notificationRoutes from './notifications/routes';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'shopnova-secret-key-change-in-production';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// WebSocket server for real-time order updates
const wss = new WebSocketServer({ server });

// Redis client for caching and streams
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

// Debug endpoint to test database
app.get('/api/debug-db', async (req, res) => {
  try {
    console.log('🔍 Debugging database connection...');
    
    // Test basic connection
    const timeResult = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Basic query works:', timeResult.rows[0]);
    
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    console.log('📋 Users table check:', tableCheck.rows);
    
    // Check users table structure
    if (tableCheck.rows.length > 0) {
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      console.log('🏗️ Users table structure:', structure.rows);
      
      // Count existing users
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log('👥 Current user count:', userCount.rows[0]);
      
      // List existing users if any
      const existingUsers = await pool.query('SELECT * FROM users LIMIT 5');
      console.log('📝 Existing users:', existingUsers.rows);
      
      // Check orders table
      const ordersTableCheck = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'orders'
      `);
      
      if (ordersTableCheck.rows.length > 0) {
        console.log('📦 Orders table exists');
        // Get orders table structure
        const ordersStructure = await pool.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'orders' 
          ORDER BY ordinal_position
        `);
        console.log('🏗️ Orders table structure:', ordersStructure.rows);
        
        // Count existing orders
        const orderCount = await pool.query('SELECT COUNT(*) as count FROM orders');
        console.log('📦 Current order count:', orderCount.rows[0]);
        
        // List existing orders if any
        const existingOrders = await pool.query('SELECT * FROM orders LIMIT 3');
        console.log('📝 Existing orders:', existingOrders.rows);
      } else {
        console.log('❌ Orders table does not exist');
      }
    }
    
    res.json({
      message: 'Database debug completed',
      connection: 'OK',
      timestamp: timeResult.rows[0],
      usersTable: tableCheck.rows.length > 0 ? 'EXISTS' : 'MISSING',
      debug: {
        timeResult: timeResult.rows[0],
        tableCheck: tableCheck.rows,
        userCount: tableCheck.rows.length > 0 ? await pool.query('SELECT COUNT(*) as count FROM users').then(r => r.rows[0]) : 'N/A'
      }
    });
    
  } catch (error) {
    console.error('❌ Database debug error:', error);
    res.status(500).json({ 
      error: 'Database debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List existing users endpoint
app.get('/api/list-users', async (req, res) => {
  try {
    const users = await pool.query('SELECT id, email, first_name, last_name, role, created_at FROM users ORDER BY created_at DESC');
    res.json({
      message: 'Users listed successfully',
      users: users.rows,
      total: users.rows.length
    });
  } catch (error) {
    console.error('❌ Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Seed demo users endpoint (for development/testing)
app.get('/api/seed-demo-users', async (req, res) => {
  try {
    console.log('🌱 Seeding demo users...');
    console.log('🔍 Database connection test...');
    
    // Test database connection
    const dbTest = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', dbTest.rows[0].now);
    
    const demoUsers = [
      {
        email: 'admin@shopnova.com',
        password: 'admin123',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      },
      {
        email: 'jane@example.com',
        password: 'customer123',
        first_name: 'Jane',
        last_name: 'Cooper',
        role: 'customer'
      },
      {
        email: 'robert@example.com',
        password: 'customer123',
        first_name: 'Robert',
        last_name: 'Fox',
        role: 'customer'
      },
      {
        email: 'emily@example.com',
        password: 'customer123',
        first_name: 'Emily',
        last_name: 'Watson',
        role: 'customer'
      }
    ];

    console.log(`📋 Processing ${demoUsers.length} demo users...`);
    const createdUsers = [];
    
    for (const user of demoUsers) {
      try {
        console.log(`🔍 Checking user: ${user.email}`);
        
        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
        console.log(`📋 Existing user check for ${user.email}:`, existingUser.rows);
        
        if (existingUser.rows.length === 0) {
          console.log(`👤 Creating new user: ${user.email}`);
          
          // Hash password
          const hashedPassword = await bcrypt.hash(user.password, 10);
          console.log(`🔐 Password hashed for: ${user.email}`);
          
          // Insert user
          const result = await pool.query(
            `INSERT INTO users (email, password, first_name, last_name, role, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
             RETURNING id, email, first_name, last_name, role`,
            [user.email, hashedPassword, user.first_name, user.last_name, user.role]
          );
          
          const newUser = {
            id: result.rows[0].id,
            email: result.rows[0].email,
            name: `${result.rows[0].first_name} ${result.rows[0].last_name}`,
            role: result.rows[0].role,
            password: user.password // Only for display, not stored
          };
          
          createdUsers.push(newUser);
          console.log(`✅ Created user: ${user.email} (${user.role}) with ID: ${newUser.id}`);
        } else {
          console.log(`ℹ️  User already exists: ${user.email} with ID: ${existingUser.rows[0].id}`);
          createdUsers.push({
            id: existingUser.rows[0].id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            password: user.password,
            existing: true
          });
        }
      } catch (error) {
        console.error(`❌ Error creating user ${user.email}:`, error);
        // Add error details to response
        createdUsers.push({
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          role: user.role,
          password: user.password,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`🎉 Seeding completed! Total users: ${createdUsers.length}`);

    res.json({
      message: 'Demo users seeding completed!',
      users: createdUsers,
      total: createdUsers.length,
      new: createdUsers.filter((u: any) => !u.existing).length,
      existing: createdUsers.filter((u: any) => u.existing).length
    });

  } catch (error) {
    console.error('❌ Error seeding demo users:', error);
    res.status(500).json({ error: 'Failed to seed demo users', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// API routes
app.use('/api/auth', userRoutes);
app.use('/api/users', userRoutes);
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

// Redis Streams setup for event publishing
const initializeRedisStreams = async () => {
  try {
    // Create consumer groups if they don't exist
    try {
      await redis.xgroup('CREATE', 'user_events', 'notification_group', '0', 'MKSTREAM');
      console.log('User events consumer group created');
    } catch (error) {
      // Group already exists
      console.log('User events consumer group already exists');
    }

    try {
      await redis.xgroup('CREATE', 'order_events', 'notification_group', '0', 'MKSTREAM');
      console.log('Order events consumer group created');
    } catch (error) {
      // Group already exists
      console.log('Order events consumer group already exists');
    }

    console.log('Redis Streams initialized successfully');
  } catch (error) {
    console.error('Redis Streams initialization error:', error);
  }
};

// Helper function to publish events to Redis Streams
export const publishEvent = async (streamName: string, eventType: string, data: any) => {
  try {
    await redis.xadd(
      streamName,
      '*',
      'event_type', eventType,
      'data', JSON.stringify(data),
      'timestamp', new Date().toISOString()
    );
    console.log(`📤 Event published: ${eventType} to ${streamName}`);
  } catch (error) {
    console.error('❌ Failed to publish event:', error);
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
    
    // Initialize Redis Streams
    await initializeRedisStreams();
    
    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 User-Order Service running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`🔌 WebSocket server ready for real-time updates`);
      console.log(`🌊 Redis Streams ready for event publishing`);
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
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    redis.disconnect();
    process.exit(0);
  });
});

startServer();
